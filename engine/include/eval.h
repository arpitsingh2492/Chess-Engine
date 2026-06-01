#pragma once

#include "board.h"

namespace chess {

class Evaluator {
public:
    static int evaluate(const Board& board);
};

} // namespace chess
