/*
 * ASTRA - Chess Engine by arpitsingh2492
 *
 * Search Algorithm: Alpha-Beta with Iterative Deepening,
 * Quiescence Search, MVV-LVA Move Ordering, and Multi-PV support.
 */

#include "search.h"
#include "movegen.h"
#include "eval.h"
#include <algorithm>
#include <cmath>
#include <numeric>

namespace chess {

// Check if a root move is in the exclusion list (for MultiPV)
bool SearchEngine::isRootMoveExcluded(const Move& move) const {
    for (int idx : excludedRootMoves_) {
        // We store the move as origin*64+destination for simple matching
        if (idx == move.origin * 64 + move.destination) {
            return true;
        }
    }
    return false;
}

SearchResult SearchEngine::search(Board& board, int timeLimitMs, int maxDepth) {
    startTime_ = std::chrono::steady_clock::now();
    timeLimit_ = timeLimitMs;
    isTimeout_ = false;
    nodesSearched_ = 0;

    // Initialize PV tables with room for quiescence extensions
    int maxPly = maxDepth + 30;
    pvTable_.resize(maxPly);
    pvLength_.resize(maxPly);
    for (int i = 0; i < maxPly; i++) {
        pvTable_[i].clear();
        pvTable_[i].resize(maxPly);
        pvLength_[i] = 0;
    }

    Move bestMove;
    int bestScore = -INFINITY_VAL;
    int completedDepth = 1;
    std::vector<Move> bestPV;

    auto legalMoves = MoveGenerator::generateLegalMoves(board);
    if (legalMoves.empty()) {
        bool isWhite = board.whiteToMove;
        int kingIndex = isWhite ? 0 : 1;
        int enemyColor = isWhite ? PieceConstants::Black : PieceConstants::White;
        bool inCheck = MoveGenerator::isSquareAttacked(board, board.kingSquare[kingIndex], enemyColor);
        SearchResult result;
        result.bestMove.origin = -1;
        result.bestMove.destination = -1;
        result.score = inCheck ? -MATE_VALUE : 0;
        result.depth = 0;
        result.nodes = 0;
        return result;
    }

    // Iterative deepening
    for (int depth = 1; depth <= maxDepth; depth++) {
        Move currentBestMove;
        int currentBestScore = -INFINITY_VAL;
        std::vector<Move> currentBestPV;
        bool hasCurrentBest = false;

        orderMoves(board, legalMoves);

        for (const auto& move : legalMoves) {
            if (checkTimeout()) {
                isTimeout_ = true;
                break;
            }

            // Skip excluded moves (for MultiPV)
            if (isRootMoveExcluded(move)) continue;

            board.executeMove(move);
            int score = -alphaBeta(board, depth - 1, -INFINITY_VAL, -currentBestScore, 1);
            board.undoMove();

            if (score > currentBestScore) {
                currentBestScore = score;
                currentBestMove = move;
                hasCurrentBest = true;

                // Build PV: root move + child's PV
                currentBestPV.clear();
                currentBestPV.push_back(move);
                for (int i = 0; i < pvLength_[1]; i++) {
                    currentBestPV.push_back(pvTable_[1][i]);
                }
            }
        }

        if (isTimeout_ && depth > 1) {
            break;  // Reject incomplete depth search results
        }

        if (hasCurrentBest) {
            bestMove = currentBestMove;
            bestScore = currentBestScore;
            completedDepth = depth;
            bestPV = currentBestPV;
        }

        // Quick mate found
        if (std::abs(bestScore) > MATE_VALUE - 100) {
            break;
        }
    }

    SearchResult result;
    result.bestMove = (bestMove.origin != -1) ? bestMove : legalMoves[0];
    result.score = bestScore;
    result.depth = completedDepth;
    result.nodes = nodesSearched_;
    result.pv = bestPV;
    return result;
}

// Multi-PV search: searches for the top N best moves
SearchResult SearchEngine::searchMultiPV(Board& board, int timeLimitMs, int maxDepth, int numPV) {
    excludedRootMoves_.clear();

    SearchResult multiResult;
    multiResult.depth = 0;
    multiResult.nodes = 0;

    auto legalMoves = MoveGenerator::generateLegalMoves(board);
    int actualPV = std::min(numPV, static_cast<int>(legalMoves.size()));

    for (int pvIdx = 0; pvIdx < actualPV; pvIdx++) {
        // Give each PV line a proportional time share
        int pvTimeLimit = timeLimitMs;

        SearchResult lineResult = search(board, pvTimeLimit, maxDepth);

        Variation var;
        var.bestMove = lineResult.bestMove;
        var.score = lineResult.score;
        var.pv = lineResult.pv;
        multiResult.variations.push_back(var);

        if (pvIdx == 0) {
            // First variation is the overall best
            multiResult.bestMove = lineResult.bestMove;
            multiResult.score = lineResult.score;
            multiResult.pv = lineResult.pv;
            multiResult.depth = lineResult.depth;
        }

        multiResult.nodes += lineResult.nodes;

        // Exclude this root move from future searches
        excludedRootMoves_.push_back(
            lineResult.bestMove.origin * 64 + lineResult.bestMove.destination
        );
    }

    excludedRootMoves_.clear();  // Clean up
    return multiResult;
}

int SearchEngine::alphaBeta(Board& board, int depth, int alpha, int beta, int ply) {
    nodesSearched_++;

    if (nodesSearched_ % 1000 == 0 && checkTimeout()) {
        isTimeout_ = true;
        return 0;
    }

    // Initialize PV for this ply
    if (ply < static_cast<int>(pvLength_.size())) {
        pvLength_[ply] = 0;
    }

    if (depth == 0) {
        return quiescence(board, alpha, beta);
    }

    auto moves = MoveGenerator::generateLegalMoves(board);

    if (moves.empty()) {
        bool isWhite = board.whiteToMove;
        int kingIndex = isWhite ? 0 : 1;
        int enemyColor = isWhite ? PieceConstants::Black : PieceConstants::White;
        bool inCheck = MoveGenerator::isSquareAttacked(board, board.kingSquare[kingIndex], enemyColor);
        if (inCheck) {
            return -MATE_VALUE + (10 - depth);  // Prefer closer mate
        }
        return 0;  // Stalemate
    }

    orderMoves(board, moves);

    for (const auto& move : moves) {
        board.executeMove(move);
        int score = -alphaBeta(board, depth - 1, -beta, -alpha, ply + 1);
        board.undoMove();

        if (isTimeout_) return 0;

        if (score >= beta) {
            return beta;  // Beta cutoff
        }
        if (score > alpha) {
            alpha = score;

            // Update PV: this move + child's PV
            if (ply < static_cast<int>(pvTable_.size())) {
                pvTable_[ply][0] = move;
                int childLen = (ply + 1 < static_cast<int>(pvLength_.size())) ? pvLength_[ply + 1] : 0;
                for (int i = 0; i < childLen; i++) {
                    pvTable_[ply][i + 1] = pvTable_[ply + 1][i];
                }
                pvLength_[ply] = 1 + childLen;
            }
        }
    }

    return alpha;
}

int SearchEngine::quiescence(Board& board, int alpha, int beta) {
    if (isTimeout_) return 0;

    nodesSearched_++;

    if (nodesSearched_ % 1000 == 0 && checkTimeout()) {
        isTimeout_ = true;
        return 0;
    }

    int standPat = Evaluator::evaluate(board);
    if (standPat >= beta) {
        return beta;
    }
    if (standPat > alpha) {
        alpha = standPat;
    }

    // Generate only captures
    auto allMoves = MoveGenerator::generateLegalMoves(board);
    std::vector<Move> captures;
    for (const auto& m : allMoves) {
        if (board.squares[m.destination] != PieceConstants::Empty || m.isEnPassant) {
            captures.push_back(m);
        }
    }

    orderMoves(board, captures);

    for (const auto& move : captures) {
        board.executeMove(move);
        int score = -quiescence(board, -beta, -alpha);
        board.undoMove();

        if (isTimeout_) return 0;

        if (score >= beta) {
            return beta;
        }
        if (score > alpha) {
            alpha = score;
        }
    }

    return alpha;
}

bool SearchEngine::checkTimeout() {
    auto now = std::chrono::steady_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - startTime_).count();
    return elapsed >= timeLimit_;
}

void SearchEngine::orderMoves(const Board& board, std::vector<Move>& moves) {
    int n = static_cast<int>(moves.size());
    std::vector<int> scores(n, 0);

    for (int i = 0; i < n; i++) {
        int piece = board.squares[moves[i].origin];
        int target = board.squares[moves[i].destination];

        // MVV-LVA for captures
        if (target != PieceConstants::Empty) {
            int victimType = PieceConstants::getPieceType(target);
            int attackerType = PieceConstants::getPieceType(piece);
            scores[i] += 10 * victimType - attackerType + 1000;
        }

        // Promotion bonus
        if (moves[i].isPromotion && moves[i].promotionPieceType != 0) {
            scores[i] += 100 * moves[i].promotionPieceType + 500;
        }
    }

    // Sort moves by score descending using indices
    std::vector<int> indices(n);
    std::iota(indices.begin(), indices.end(), 0);
    std::sort(indices.begin(), indices.end(), [&scores](int a, int b) {
        return scores[a] > scores[b];
    });

    std::vector<Move> sorted(n);
    for (int i = 0; i < n; i++) {
        sorted[i] = moves[indices[i]];
    }
    moves = std::move(sorted);
}

} // namespace chess
