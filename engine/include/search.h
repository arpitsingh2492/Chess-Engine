#pragma once

#include "types.h"
#include "board.h"
#include <vector>
#include <chrono>

namespace chess {

struct SearchResult {
    Move bestMove;
    int score = 0;
    int depth = 0;
    int nodes = 0;
    std::vector<Move> pv;
};

class SearchEngine {
public:
    SearchResult search(Board& board, int timeLimitMs, int maxDepth = 10);

private:
    static constexpr int INFINITY_VAL = 9999999;
    static constexpr int MATE_VALUE = 900000;

    int nodesSearched_ = 0;
    std::chrono::steady_clock::time_point startTime_;
    int timeLimit_ = 0;
    bool isTimeout_ = false;

    // Triangular PV table
    std::vector<std::vector<Move>> pvTable_;
    std::vector<int> pvLength_;

    int alphaBeta(Board& board, int depth, int alpha, int beta, int ply);
    int quiescence(Board& board, int alpha, int beta);
    bool checkTimeout();
    void orderMoves(const Board& board, std::vector<Move>& moves);
};

} // namespace chess
