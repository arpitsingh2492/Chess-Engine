/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

#pragma once

#include <vector>
#include <string>

namespace chess {

// Piece encoding: lower 3 bits = type, bits 3-4 = color
namespace PieceConstants {
    constexpr int Empty     = 0;
    constexpr int Pawn      = 1;
    constexpr int Knight    = 2;
    constexpr int Bishop    = 3;
    constexpr int Rook      = 4;
    constexpr int Queen     = 5;
    constexpr int King      = 6;

    constexpr int White     = 8;
    constexpr int Black     = 16;

    constexpr int TypeMask  = 7;   // 0b00111
    constexpr int ColorMask = 24;  // 0b11000

    inline constexpr int getPieceType(int piece) {
        return piece & TypeMask;
    }

    inline constexpr int getColor(int piece) {
        return piece & ColorMask;
    }

    inline constexpr bool isWhite(int piece) {
        return (piece & ColorMask) == White;
    }

    inline constexpr bool isBlack(int piece) {
        return (piece & ColorMask) == Black;
    }

    inline constexpr bool isEmpty(int piece) {
        return piece == Empty;
    }
} // namespace PieceConstants

struct Move {
    int origin = -1;
    int destination = -1;
    bool isPromotion = false;
    int promotionPieceType = 0;
    bool isCastling = false;
    bool isEnPassant = false;
    bool isPawnTwoForward = false;
};

struct EngineResult {
    Move move;
    int score = 0;
    int depth = 0;
    int nodes = 0;
    int timeMs = 0;
    std::vector<std::string> pv;  // Principal variation as SAN strings
};

} // namespace chess
