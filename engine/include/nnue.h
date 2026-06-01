/*
 * ASTRA - Chess Engine by arpitsingh2492
 * NNUE (Efficiently Updatable Neural Network) Evaluation
 *
 * Implements a HalfKP-style NNUE probe compatible with Stockfish
 * network files. The architecture:
 *   Input (HalfKP features) -> Hidden Layer 1 (256) -> Hidden Layer 2 (32) -> Output (1)
 *
 * This is a simplified but functional probe that reads the network
 * weights from a binary .nnue file and performs inference.
 */

#pragma once

#include "board.h"
#include <string>
#include <vector>
#include <cstdint>
#include <array>

namespace chess {
namespace nnue {

// Network architecture constants
// We use a compact architecture for WebAssembly compatibility
static constexpr int HALF_DIMENSIONS = 256;  // Hidden layer 1 size (per perspective)
static constexpr int FT_IN_DIMS = 64 * 64 * 10;  // HalfKP feature count: KingSq * PieceSq * PieceType(10)
// 10 piece types: WPawn, WKnight, WBishop, WRook, WQueen, BPawn, BKnight, BBishop, BRook, BQueen

static constexpr int HIDDEN1_SIZE = 256;  // After feature transform (per side)
static constexpr int HIDDEN2_SIZE = 32;
static constexpr int OUTPUT_SIZE = 1;

// Piece mapping for NNUE feature index
// Maps our piece encoding to NNUE piece type (0-9)
// WPawn=0, WKnight=1, WBishop=2, WRook=3, WQueen=4
// BPawn=5, BKnight=6, BBishop=7, BRook=8, BQueen=9
int pieceToNnueIndex(int piece);

// Accumulator: stores the half-transformed features for each perspective
struct Alignas16 {
    int16_t white[HALF_DIMENSIONS];
    int16_t black[HALF_DIMENSIONS];
};

class NnueNetwork {
public:
    NnueNetwork();
    ~NnueNetwork();

    // Load network weights from a .nnue file
    bool loadNetwork(const std::string& path);

    // Check if a network is loaded
    bool isLoaded() const { return loaded_; }

    // Evaluate a position using the neural network
    // Returns centipawn score from side-to-move's perspective
    int evaluate(const Board& board) const;

private:
    bool loaded_ = false;

    // Feature Transformer weights & biases (input → hidden1)
    // Shape: [FT_IN_DIMS][HALF_DIMENSIONS] stored row-major
    // We use a flat vector to keep memory manageable
    std::vector<int16_t> ftWeights_;   // [FT_IN_DIMS * HALF_DIMENSIONS]
    std::vector<int16_t> ftBiases_;    // [HALF_DIMENSIONS]

    // Hidden Layer 2 weights & biases
    // Input is concatenated white+black accumulators = 2 * HIDDEN1_SIZE = 512
    std::vector<int8_t> hidden2Weights_;  // [HIDDEN2_SIZE * (2 * HIDDEN1_SIZE)]
    std::vector<int32_t> hidden2Biases_;  // [HIDDEN2_SIZE]

    // Output layer weights & biases
    std::vector<int8_t> outputWeights_;   // [OUTPUT_SIZE * HIDDEN2_SIZE]
    std::vector<int32_t> outputBiases_;   // [OUTPUT_SIZE]

    // Compute HalfKP feature indices for a given board position
    void computeFeatures(const Board& board, bool perspective,
                         std::vector<int>& activeFeatures) const;

    // Run the feature transformer for one perspective
    void featureTransform(const std::vector<int>& activeFeatures,
                          int16_t* output) const;

    // Clipped ReLU: clamp to [0, 127] and cast to int8
    static int8_t clippedRelu(int16_t x);
};

// Global NNUE instance
NnueNetwork& getGlobalNnue();

} // namespace nnue
} // namespace chess
