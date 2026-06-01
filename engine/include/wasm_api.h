/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

#pragma once

#include "types.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT
#endif

extern "C" {
    EXPORT void engine_init();
    EXPORT void engine_new_game();
    EXPORT void engine_load_fen(const char* fen);
    EXPORT const char* engine_search(int time_limit_ms, int max_depth);
    EXPORT const char* engine_get_legal_moves();
    EXPORT const char* engine_get_fen();
    EXPORT bool engine_make_move(int origin, int destination,
                                 bool isPromotion, int promotionPieceType,
                                 bool isCastling, bool isEnPassant,
                                 bool isPawnTwoForward);
    EXPORT bool engine_is_in_check();
    EXPORT int engine_get_halfmove_clock();
    EXPORT bool engine_is_threefold_repetition();
    EXPORT bool engine_is_white_to_move();
    EXPORT const char* engine_get_board_squares();
}
