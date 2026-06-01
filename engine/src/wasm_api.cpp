/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

#include "wasm_api.h"
#include "board.h"
#include "movegen.h"
#include "search.h"
#include "eval.h"
#include <string>
#include <chrono>

// Global engine state
static chess::Board g_board;
static std::string g_resultBuffer;

// --- JSON Helpers ---

static std::string moveToJson(const chess::Move& m) {
    std::string json = "{";
    json += "\"origin\":" + std::to_string(m.origin);
    json += ",\"destination\":" + std::to_string(m.destination);
    json += ",\"isPromotion\":";
    json += (m.isPromotion ? "true" : "false");
    json += ",\"promotionPieceType\":" + std::to_string(m.promotionPieceType);
    json += ",\"isCastling\":";
    json += (m.isCastling ? "true" : "false");
    json += ",\"isEnPassant\":";
    json += (m.isEnPassant ? "true" : "false");
    json += ",\"isPawnTwoForward\":";
    json += (m.isPawnTwoForward ? "true" : "false");
    json += "}";
    return json;
}

static std::string moveToSan(const chess::Board& board, const chess::Move& move) {
    using namespace chess::PieceConstants;

    if (move.isCastling) {
        return (move.destination % 8) == 6 ? "O-O" : "O-O-O";
    }

    int piece = board.squares[move.origin];
    int type = getPieceType(piece);
    int target = board.squares[move.destination];
    bool isCapture = target != Empty || move.isEnPassant;

    char file = static_cast<char>('a' + (move.destination % 8));
    char rank = static_cast<char>('1' + (move.destination / 8));

    std::string result;

    if (type == Pawn) {
        if (isCapture) {
            result += static_cast<char>('a' + (move.origin % 8));
            result += 'x';
        }
        result += file;
        result += rank;
        if (move.isPromotion) {
            result += '=';
            switch (move.promotionPieceType) {
                case Queen:  result += 'Q'; break;
                case Rook:   result += 'R'; break;
                case Bishop: result += 'B'; break;
                case Knight: result += 'N'; break;
                default:     result += 'Q'; break;
            }
        }
    } else {
        switch (type) {
            case Knight: result += 'N'; break;
            case Bishop: result += 'B'; break;
            case Rook:   result += 'R'; break;
            case Queen:  result += 'Q'; break;
            case King:   result += 'K'; break;
            default: break;
        }
        if (isCapture) result += 'x';
        result += file;
        result += rank;
    }

    return result;
}

// --- Exported Functions ---

extern "C" {

EXPORT void engine_init() {
    g_board.setupStartingPosition();
}

EXPORT void engine_new_game() {
    g_board.setupStartingPosition();
}

EXPORT void engine_load_fen(const char* fen) {
    g_board.loadFromFen(std::string(fen));
}

EXPORT const char* engine_search(int time_limit_ms, int max_depth) {
    chess::SearchEngine searcher;
    auto startTime = std::chrono::steady_clock::now();
    chess::SearchResult result = searcher.search(g_board, time_limit_ms, max_depth);
    auto endTime = std::chrono::steady_clock::now();
    int elapsed = static_cast<int>(
        std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime).count()
    );

    // Convert PV moves to SAN by replaying on a temp board
    chess::Board tempBoard = g_board.clone();
    std::string pvJson = "[";
    for (size_t i = 0; i < result.pv.size(); i++) {
        if (i > 0) pvJson += ",";
        std::string san = moveToSan(tempBoard, result.pv[i]);
        pvJson += "\"" + san + "\"";
        tempBoard.executeMove(result.pv[i]);
    }
    pvJson += "]";

    // Build result JSON
    g_resultBuffer = "{";
    g_resultBuffer += "\"move\":" + moveToJson(result.bestMove);
    g_resultBuffer += ",\"score\":" + std::to_string(result.score);
    g_resultBuffer += ",\"depth\":" + std::to_string(result.depth);
    g_resultBuffer += ",\"nodes\":" + std::to_string(result.nodes);
    g_resultBuffer += ",\"timeMs\":" + std::to_string(elapsed);
    g_resultBuffer += ",\"pv\":" + pvJson;
    g_resultBuffer += "}";

    return g_resultBuffer.c_str();
}

EXPORT const char* engine_get_legal_moves() {
    auto moves = chess::MoveGenerator::generateLegalMoves(g_board);

    g_resultBuffer = "[";
    for (size_t i = 0; i < moves.size(); i++) {
        if (i > 0) g_resultBuffer += ",";
        g_resultBuffer += moveToJson(moves[i]);
    }
    g_resultBuffer += "]";

    return g_resultBuffer.c_str();
}

EXPORT const char* engine_get_fen() {
    g_resultBuffer = g_board.getCurrentFen();
    return g_resultBuffer.c_str();
}

EXPORT bool engine_make_move(int origin, int destination,
                             bool isPromotion, int promotionPieceType,
                             bool isCastling, bool isEnPassant,
                             bool isPawnTwoForward) {
    chess::Move move;
    move.origin = origin;
    move.destination = destination;
    move.isPromotion = isPromotion;
    move.promotionPieceType = promotionPieceType;
    move.isCastling = isCastling;
    move.isEnPassant = isEnPassant;
    move.isPawnTwoForward = isPawnTwoForward;

    g_board.executeMove(move);
    return true;
}

EXPORT bool engine_is_in_check() {
    int kingIndex = g_board.whiteToMove ? 0 : 1;
    int enemyColor = g_board.whiteToMove ? chess::PieceConstants::Black : chess::PieceConstants::White;
    return chess::MoveGenerator::isSquareAttacked(g_board, g_board.kingSquare[kingIndex], enemyColor);
}

EXPORT int engine_get_halfmove_clock() {
    return g_board.halfmoveClock;
}

EXPORT bool engine_is_threefold_repetition() {
    return g_board.isThreefoldRepetition();
}

EXPORT bool engine_is_white_to_move() {
    return g_board.whiteToMove;
}

EXPORT const char* engine_get_board_squares() {
    g_resultBuffer = "[";
    for (int i = 0; i < 64; i++) {
        if (i > 0) g_resultBuffer += ",";
        g_resultBuffer += std::to_string(g_board.squares[i]);
    }
    g_resultBuffer += "]";
    return g_resultBuffer.c_str();
}

} // extern "C"
