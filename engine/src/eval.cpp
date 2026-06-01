/*
 * ASTRA - Chess Engine by arpitsingh2492
 *
 * Hybrid Evaluation: NNUE Neural Network + Piece-Square Table Fallback
 *
 * When a trained NNUE network is loaded, the evaluator uses neural
 * network inference for Grandmaster-level positional understanding.
 * Otherwise, it falls back to classical Piece-Square Tables.
 */

#include "eval.h"
#include "nnue.h"

namespace chess {

// Piece-Square Tables (from White's perspective, rank 0 = rank 1)
static constexpr int PawnTable[64] = {
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
};

static constexpr int KnightTable[64] = {
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
};

static constexpr int BishopTable[64] = {
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
};

static constexpr int RookTable[64] = {
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  5,  5,  0
};

static constexpr int QueenTable[64] = {
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  5,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
};

static constexpr int KingMiddleTable[64] = {
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
};

int Evaluator::evaluate(const Board& board) {
    // Use NNUE evaluation if a network is loaded
    auto& nnueNet = nnue::getGlobalNnue();
    if (nnueNet.isLoaded()) {
        return nnueNet.evaluate(board);
    }

    // Fallback: Classical Piece-Square Table evaluation
    return evaluateClassical(board);
}

int Evaluator::evaluateClassical(const Board& board) {
    int score = 0;

    for (int sq = 0; sq < 64; sq++) {
        int piece = board.squares[sq];
        if (piece == PieceConstants::Empty) continue;

        int type = PieceConstants::getPieceType(piece);
        bool isWhitePiece = PieceConstants::isWhite(piece);

        int val = 0;

        // 1. Material value
        switch (type) {
            case PieceConstants::Pawn:   val += 100;   break;
            case PieceConstants::Knight: val += 320;   break;
            case PieceConstants::Bishop: val += 330;   break;
            case PieceConstants::Rook:   val += 500;   break;
            case PieceConstants::Queen:  val += 900;   break;
            case PieceConstants::King:   val += 20000; break;
            default: break;
        }

        // 2. Positional value (Piece-Square table)
        // White: mirror vertically (rank 7→0 maps to table index 0→7)
        int psqIndex = isWhitePiece ? (56 - (sq / 8) * 8 + (sq % 8)) : sq;

        switch (type) {
            case PieceConstants::Pawn:   val += PawnTable[psqIndex];       break;
            case PieceConstants::Knight: val += KnightTable[psqIndex];     break;
            case PieceConstants::Bishop: val += BishopTable[psqIndex];     break;
            case PieceConstants::Rook:   val += RookTable[psqIndex];       break;
            case PieceConstants::Queen:  val += QueenTable[psqIndex];      break;
            case PieceConstants::King:   val += KingMiddleTable[psqIndex]; break;
            default: break;
        }

        if (isWhitePiece) {
            score += val;
        } else {
            score -= val;
        }
    }

    // Return score from side-to-move's perspective
    int perspective = board.whiteToMove ? 1 : -1;
    return score * perspective;
}

} // namespace chess
