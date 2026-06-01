/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

#pragma once

#include "types.h"
#include "board.h"
#include <vector>

namespace chess {

class MoveGenerator {
public:
    static std::vector<Move> generateLegalMoves(Board& board);
    static bool isSquareAttacked(const Board& board, int square, int attackerColor);

private:
    static bool isMoveLegal(Board& board, const Move& move);
    static void executeMoveSim(Board& board, const Move& move);

    static void generatePseudoLegalMoves(const Board& board, std::vector<Move>& moves);
    static void generatePawnMoves(const Board& board, int origin, int color, std::vector<Move>& moves);
    static void addPromotionMoves(int origin, int destination, std::vector<Move>& moves);
    static void generateKnightMoves(const Board& board, int origin, int color, std::vector<Move>& moves);
    static void generateSlidingMoves(const Board& board, int origin, const int* directions, int numDirs, int color, std::vector<Move>& moves);
    static void generateKingMoves(const Board& board, int origin, int color, std::vector<Move>& moves);
    static bool isValidSquare(int origin, int dest, int offset, bool singleStep);

    static constexpr int bishopDirections[4] = {7, 9, -7, -9};
    static constexpr int rookDirections[4]   = {8, -8, 1, -1};
    static constexpr int queenDirections[8]  = {7, 9, -7, -9, 8, -8, 1, -1};
    static constexpr int knightOffsets[8]    = {-17, -15, -10, -6, 6, 10, 15, 17};
    static constexpr int kingOffsets[8]      = {-9, -8, -7, -1, 1, 7, 8, 9};
};

} // namespace chess
