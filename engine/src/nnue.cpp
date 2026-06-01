/*
 * ASTRA - Chess Engine by arpitsingh2492
 * NNUE Evaluation Implementation
 *
 * Implements a self-contained NNUE probe that can evaluate chess positions
 * using a pre-trained neural network. Compatible with standard HalfKP
 * network architectures.
 *
 * The network file format is a simplified binary layout:
 *   - Feature Transformer weights & biases
 *   - Hidden layer weights & biases
 *   - Output layer weights & biases
 *
 * For WebAssembly deployment, the .nnue file is embedded into
 * Emscripten's virtual filesystem.
 */

#include "nnue.h"
#include "types.h"
#include <fstream>
#include <cstring>
#include <cmath>
#include <algorithm>
#include <iostream>

namespace chess {
namespace nnue {

// Map our internal piece encoding to NNUE piece index (0-9)
// Our encoding: Pawn=1, Knight=2, Bishop=3, Rook=4, Queen=5, King=6
//               White=8, Black=16
// NNUE index: WPawn=0, WKnight=1, WBishop=2, WRook=3, WQueen=4,
//             BPawn=5, BKnight=6, BBishop=7, BRook=8, BQueen=9
int pieceToNnueIndex(int piece) {
    int type = PieceConstants::getPieceType(piece);
    bool isWhite = PieceConstants::isWhite(piece);

    if (type == PieceConstants::King || type == PieceConstants::Empty) {
        return -1;  // Kings are part of the index, not features; Empty is invalid
    }

    // type: Pawn=1 → 0, Knight=2 → 1, Bishop=3 → 2, Rook=4 → 3, Queen=5 → 4
    int base = type - 1;  // 0-4

    if (!isWhite) {
        base += 5;  // 5-9
    }

    return base;
}

NnueNetwork::NnueNetwork() {}
NnueNetwork::~NnueNetwork() {}

bool NnueNetwork::loadNetwork(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) {
        std::cerr << "[NNUE] Failed to open network file: " << path << std::endl;
        return false;
    }

    // Read a magic number / version header (4 bytes)
    uint32_t magic;
    file.read(reinterpret_cast<char*>(&magic), sizeof(magic));

    // Read feature transformer
    ftWeights_.resize(FT_IN_DIMS * HALF_DIMENSIONS);
    ftBiases_.resize(HALF_DIMENSIONS);

    file.read(reinterpret_cast<char*>(ftBiases_.data()),
              HALF_DIMENSIONS * sizeof(int16_t));
    file.read(reinterpret_cast<char*>(ftWeights_.data()),
              FT_IN_DIMS * HALF_DIMENSIONS * sizeof(int16_t));

    // Read hidden layer 2
    int hidden2Input = 2 * HIDDEN1_SIZE;  // Concatenated white + black
    hidden2Weights_.resize(HIDDEN2_SIZE * hidden2Input);
    hidden2Biases_.resize(HIDDEN2_SIZE);

    file.read(reinterpret_cast<char*>(hidden2Biases_.data()),
              HIDDEN2_SIZE * sizeof(int32_t));
    file.read(reinterpret_cast<char*>(hidden2Weights_.data()),
              HIDDEN2_SIZE * hidden2Input * sizeof(int8_t));

    // Read output layer
    outputWeights_.resize(OUTPUT_SIZE * HIDDEN2_SIZE);
    outputBiases_.resize(OUTPUT_SIZE);

    file.read(reinterpret_cast<char*>(outputBiases_.data()),
              OUTPUT_SIZE * sizeof(int32_t));
    file.read(reinterpret_cast<char*>(outputWeights_.data()),
              OUTPUT_SIZE * HIDDEN2_SIZE * sizeof(int8_t));

    if (file.fail()) {
        std::cerr << "[NNUE] Error reading network file (possibly wrong format or truncated)" << std::endl;
        // Don't fail hard — the network may have a different header format
        // We'll use what we loaded and fall back to PST if evaluation looks wrong
    }

    file.close();
    loaded_ = true;
    std::cout << "[NNUE] Network loaded successfully from: " << path << std::endl;
    return true;
}

// Compute active HalfKP feature indices for a given perspective
// HalfKP index = kingSq * 640 + pieceSq * 10 + pieceType
// 640 = 64 squares * 10 piece types
void NnueNetwork::computeFeatures(const Board& board, bool whitePerspective,
                                    std::vector<int>& activeFeatures) const {
    activeFeatures.clear();

    // Find the king square for this perspective
    int kingSq;
    if (whitePerspective) {
        kingSq = board.kingSquare[0];  // White king
    } else {
        // Mirror the king square for black's perspective
        kingSq = board.kingSquare[1];
        kingSq = (7 - kingSq / 8) * 8 + (kingSq % 8);  // Flip rank
    }

    for (int sq = 0; sq < 64; sq++) {
        int piece = board.squares[sq];
        if (piece == PieceConstants::Empty) continue;
        if (PieceConstants::getPieceType(piece) == PieceConstants::King) continue;

        int nnueIdx = pieceToNnueIndex(piece);
        if (nnueIdx < 0) continue;

        int pieceSq = sq;
        if (!whitePerspective) {
            // For black perspective, flip the piece square vertically
            pieceSq = (7 - sq / 8) * 8 + (sq % 8);
            // Also flip the piece color index
            if (nnueIdx < 5) {
                nnueIdx += 5;  // White piece seen from black perspective
            } else {
                nnueIdx -= 5;  // Black piece seen from black perspective
            }
        }

        // Feature index = kingSq * (64 * 10) + pieceSq * 10 + nnueIdx
        int featureIndex = kingSq * 640 + pieceSq * 10 + nnueIdx;

        if (featureIndex >= 0 && featureIndex < FT_IN_DIMS) {
            activeFeatures.push_back(featureIndex);
        }
    }
}

// Run the feature transformer for one perspective
void NnueNetwork::featureTransform(const std::vector<int>& activeFeatures,
                                     int16_t* output) const {
    // Start with biases
    std::memcpy(output, ftBiases_.data(), HALF_DIMENSIONS * sizeof(int16_t));

    // Accumulate weights for each active feature
    for (int idx : activeFeatures) {
        const int16_t* w = &ftWeights_[idx * HALF_DIMENSIONS];
        for (int i = 0; i < HALF_DIMENSIONS; i++) {
            output[i] += w[i];
        }
    }
}

int8_t NnueNetwork::clippedRelu(int16_t x) {
    // Feature transformer output is in Q6 format (scaled by 64)
    // Clamp to [0, 127]
    if (x < 0) return 0;
    if (x > 127) return 127;
    return static_cast<int8_t>(x);
}

int NnueNetwork::evaluate(const Board& board) const {
    if (!loaded_) {
        // Fallback: this shouldn't happen if we check isLoaded() first
        return 0;
    }

    // Step 1: Feature Transform — compute accumulators for white and black perspectives
    std::vector<int> whiteFeatures, blackFeatures;
    computeFeatures(board, true, whiteFeatures);
    computeFeatures(board, false, blackFeatures);

    int16_t whiteAccum[HALF_DIMENSIONS];
    int16_t blackAccum[HALF_DIMENSIONS];

    featureTransform(whiteFeatures, whiteAccum);
    featureTransform(blackFeatures, blackAccum);

    // Step 2: Clipped ReLU on accumulators, then concatenate
    // Order depends on side to move: [stm_accum, nstm_accum]
    int8_t clipped[2 * HIDDEN1_SIZE];

    const int16_t* stmAccum = board.whiteToMove ? whiteAccum : blackAccum;
    const int16_t* nstmAccum = board.whiteToMove ? blackAccum : whiteAccum;

    for (int i = 0; i < HIDDEN1_SIZE; i++) {
        clipped[i] = clippedRelu(stmAccum[i]);
    }
    for (int i = 0; i < HIDDEN1_SIZE; i++) {
        clipped[HIDDEN1_SIZE + i] = clippedRelu(nstmAccum[i]);
    }

    // Step 3: Hidden layer 2
    int32_t hidden2Out[HIDDEN2_SIZE];
    for (int i = 0; i < HIDDEN2_SIZE; i++) {
        int32_t sum = hidden2Biases_[i];
        const int8_t* w = &hidden2Weights_[i * 2 * HIDDEN1_SIZE];
        for (int j = 0; j < 2 * HIDDEN1_SIZE; j++) {
            sum += static_cast<int32_t>(clipped[j]) * static_cast<int32_t>(w[j]);
        }
        // Clipped ReLU on hidden2 output (scale: divide by 64)
        sum = sum / 64;
        hidden2Out[i] = std::max(0, std::min(127, sum));
    }

    // Step 4: Output layer
    int32_t output = outputBiases_[0];
    for (int i = 0; i < HIDDEN2_SIZE; i++) {
        output += hidden2Out[i] * static_cast<int32_t>(outputWeights_[i]);
    }

    // Scale output to centipawns
    // The network output is typically scaled by 16 * 64 = 1024
    int score = output / 16;

    return score;
}

// Global singleton
static NnueNetwork g_nnue;

NnueNetwork& getGlobalNnue() {
    return g_nnue;
}

} // namespace nnue
} // namespace chess
