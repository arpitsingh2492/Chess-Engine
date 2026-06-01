/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

#pragma once

#include "board.h"

namespace chess {

class Evaluator {
public:
    // Main evaluation: uses NNUE if loaded, otherwise classical PST
    static int evaluate(const Board& board);

    // Classical Piece-Square Table evaluation (fallback)
    static int evaluateClassical(const Board& board);
};

} // namespace chess
