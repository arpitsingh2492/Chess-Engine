/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

#pragma once

#include "types.h"
#include <string>
#include <vector>
#include <array>

namespace chess {

// Snapshot for undo support
struct BoardStateSnapshot {
    std::array<int, 64> squares;
    int castlingRights;
    int enPassantSquare;
    int halfmoveClock;
    std::array<int, 2> kingSquare;
    std::vector<std::string> positionHistory;
};

class Board {
public:
    std::array<int, 64> squares;
    bool whiteToMove = true;
    int castlingRights = 15;   // 1111 binary: WK, WQ, BK, BQ
    int enPassantSquare = -1;  // 0-63 or -1
    int halfmoveClock = 0;
    std::array<int, 2> kingSquare = {{4, 60}};  // [0]=White King, [1]=Black King

    Board();
    Board clone() const;

    std::string getRepetitionHash() const;
    bool isThreefoldRepetition() const;

    void setupStartingPosition();
    void loadFromFen(const std::string& fen);
    std::string getCurrentFen() const;

    void executeMove(const Move& move);
    void undoMove();
    int getHistoryCount() const;

private:
    std::vector<BoardStateSnapshot> history_;
    std::vector<std::string> positionHistory_;

    void updateCastlingRightsOnMove(int origin, int destination);
};

} // namespace chess
