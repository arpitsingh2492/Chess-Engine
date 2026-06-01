/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

#pragma once

#include "board.h"

namespace chess {

class Evaluator {
public:
    static int evaluate(const Board& board);
};

} // namespace chess
