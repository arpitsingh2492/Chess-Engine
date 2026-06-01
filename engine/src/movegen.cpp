#include "movegen.h"
#include <cmath>
#include <cstdlib>

namespace chess {

std::vector<Move> MoveGenerator::generateLegalMoves(Board& board) {
    std::vector<Move> pseudo;
    generatePseudoLegalMoves(board, pseudo);

    std::vector<Move> legal;
    legal.reserve(pseudo.size());

    for (const auto& move : pseudo) {
        if (isMoveLegal(board, move)) {
            legal.push_back(move);
        }
    }
    return legal;
}

bool MoveGenerator::isMoveLegal(Board& board, const Move& move) {
    int playerColor = board.whiteToMove ? PieceConstants::White : PieceConstants::Black;

    // Save state
    auto prevSquares = board.squares;
    auto prevKingSquare = board.kingSquare;
    int prevCastling = board.castlingRights;
    int prevEnPassant = board.enPassantSquare;
    int prevHalfmove = board.halfmoveClock;

    // Simulate move
    executeMoveSim(board, move);

    // Check if friendly king is in check
    int kingIdx = (playerColor == PieceConstants::White) ? 0 : 1;
    int enemyColor = (playerColor == PieceConstants::White) ? PieceConstants::Black : PieceConstants::White;
    bool inCheck = isSquareAttacked(board, board.kingSquare[kingIdx], enemyColor);

    // Restore state
    board.squares = prevSquares;
    board.kingSquare = prevKingSquare;
    board.castlingRights = prevCastling;
    board.enPassantSquare = prevEnPassant;
    board.halfmoveClock = prevHalfmove;

    return !inCheck;
}

void MoveGenerator::executeMoveSim(Board& board, const Move& move) {
    int piece = board.squares[move.origin];
    bool isWhitePiece = PieceConstants::isWhite(piece);
    int type = PieceConstants::getPieceType(piece);

    // En passant capture
    if (move.isEnPassant) {
        int captureSq = move.destination + (isWhitePiece ? -8 : 8);
        board.squares[captureSq] = PieceConstants::Empty;
    }

    // Castling rook movement
    if (move.isCastling) {
        bool isKingSide = (move.destination % 8) == 6;
        int rookFrom = isKingSide ? move.destination + 1 : move.destination - 2;
        int rookTo = isKingSide ? move.destination - 1 : move.destination + 1;
        int rook = board.squares[rookFrom];
        board.squares[rookTo] = rook;
        board.squares[rookFrom] = PieceConstants::Empty;
    }

    // Update board squares
    if (move.isPromotion && move.promotionPieceType != 0) {
        board.squares[move.destination] = move.promotionPieceType | (isWhitePiece ? PieceConstants::White : PieceConstants::Black);
    } else {
        board.squares[move.destination] = piece;
    }
    board.squares[move.origin] = PieceConstants::Empty;

    // Track king square
    if (type == PieceConstants::King) {
        board.kingSquare[isWhitePiece ? 0 : 1] = move.destination;
    }
}

bool MoveGenerator::isSquareAttacked(const Board& board, int square, int attackerColor) {
    bool isAttackerWhite = (attackerColor == PieceConstants::White);

    // 1. Knight attacks
    for (int i = 0; i < 8; i++) {
        int target = square + knightOffsets[i];
        if (isValidSquare(square, target, knightOffsets[i], true)) {
            int piece = board.squares[target];
            if (PieceConstants::getPieceType(piece) == PieceConstants::Knight &&
                PieceConstants::getColor(piece) == attackerColor) {
                return true;
            }
        }
    }

    // 2. Bishop & Queen diagonal attacks
    for (int i = 0; i < 4; i++) {
        int dir = bishopDirections[i];
        int target = square;
        while (true) {
            int prev = target;
            target += dir;
            if (!isValidSquare(prev, target, dir, false)) break;

            int piece = board.squares[target];
            if (piece != PieceConstants::Empty) {
                int type = PieceConstants::getPieceType(piece);
                if (PieceConstants::getColor(piece) == attackerColor &&
                    (type == PieceConstants::Bishop || type == PieceConstants::Queen)) {
                    return true;
                }
                break;  // Blocked
            }
        }
    }

    // 3. Rook & Queen orthogonal attacks
    for (int i = 0; i < 4; i++) {
        int dir = rookDirections[i];
        int target = square;
        while (true) {
            int prev = target;
            target += dir;
            if (!isValidSquare(prev, target, dir, false)) break;

            int piece = board.squares[target];
            if (piece != PieceConstants::Empty) {
                int type = PieceConstants::getPieceType(piece);
                if (PieceConstants::getColor(piece) == attackerColor &&
                    (type == PieceConstants::Rook || type == PieceConstants::Queen)) {
                    return true;
                }
                break;  // Blocked
            }
        }
    }

    // 4. Pawn attacks
    int pawnDirs[2];
    if (isAttackerWhite) {
        pawnDirs[0] = -9; pawnDirs[1] = -7;
    } else {
        pawnDirs[0] = 7; pawnDirs[1] = 9;
    }
    for (int i = 0; i < 2; i++) {
        int target = square + pawnDirs[i];
        if (isValidSquare(square, target, pawnDirs[i], true)) {
            int piece = board.squares[target];
            if (PieceConstants::getPieceType(piece) == PieceConstants::Pawn &&
                PieceConstants::getColor(piece) == attackerColor) {
                return true;
            }
        }
    }

    // 5. King attacks
    for (int i = 0; i < 8; i++) {
        int target = square + kingOffsets[i];
        if (isValidSquare(square, target, kingOffsets[i], true)) {
            int piece = board.squares[target];
            if (PieceConstants::getPieceType(piece) == PieceConstants::King &&
                PieceConstants::getColor(piece) == attackerColor) {
                return true;
            }
        }
    }

    return false;
}

void MoveGenerator::generatePseudoLegalMoves(const Board& board, std::vector<Move>& moves) {
    int color = board.whiteToMove ? PieceConstants::White : PieceConstants::Black;

    for (int origin = 0; origin < 64; origin++) {
        int piece = board.squares[origin];
        if (piece == PieceConstants::Empty || PieceConstants::getColor(piece) != color) continue;

        int type = PieceConstants::getPieceType(piece);

        if (type == PieceConstants::Pawn) {
            generatePawnMoves(board, origin, color, moves);
        } else if (type == PieceConstants::Knight) {
            generateKnightMoves(board, origin, color, moves);
        } else if (type == PieceConstants::Bishop) {
            generateSlidingMoves(board, origin, bishopDirections, 4, color, moves);
        } else if (type == PieceConstants::Rook) {
            generateSlidingMoves(board, origin, rookDirections, 4, color, moves);
        } else if (type == PieceConstants::Queen) {
            generateSlidingMoves(board, origin, queenDirections, 8, color, moves);
        } else if (type == PieceConstants::King) {
            generateKingMoves(board, origin, color, moves);
        }
    }
}

void MoveGenerator::generatePawnMoves(const Board& board, int origin, int color, std::vector<Move>& moves) {
    bool isWhitePiece = (color == PieceConstants::White);
    int forward = isWhitePiece ? 8 : -8;
    int rank = origin / 8;

    // Single push
    int singleDest = origin + forward;
    if (singleDest >= 0 && singleDest < 64 && board.squares[singleDest] == PieceConstants::Empty) {
        bool isPromoRank = isWhitePiece ? (rank == 6) : (rank == 1);
        if (isPromoRank) {
            addPromotionMoves(origin, singleDest, moves);
        } else {
            Move m;
            m.origin = origin;
            m.destination = singleDest;
            moves.push_back(m);
        }

        // Double push
        int startRank = isWhitePiece ? 1 : 6;
        int doubleDest = origin + forward * 2;
        if (rank == startRank && board.squares[doubleDest] == PieceConstants::Empty) {
            Move m;
            m.origin = origin;
            m.destination = doubleDest;
            m.isPawnTwoForward = true;
            moves.push_back(m);
        }
    }

    // Captures
    int attackOffsets[2];
    if (isWhitePiece) {
        attackOffsets[0] = 7; attackOffsets[1] = 9;
    } else {
        attackOffsets[0] = -7; attackOffsets[1] = -9;
    }

    for (int i = 0; i < 2; i++) {
        int offset = attackOffsets[i];
        int dest = origin + offset;
        if (isValidSquare(origin, dest, offset, true)) {
            int piece = board.squares[dest];
            bool isPromoRank = isWhitePiece ? (rank == 6) : (rank == 1);

            if (piece != PieceConstants::Empty && PieceConstants::getColor(piece) != color) {
                if (isPromoRank) {
                    addPromotionMoves(origin, dest, moves);
                } else {
                    Move m;
                    m.origin = origin;
                    m.destination = dest;
                    moves.push_back(m);
                }
            }

            // En passant
            if (dest == board.enPassantSquare) {
                Move m;
                m.origin = origin;
                m.destination = dest;
                m.isEnPassant = true;
                moves.push_back(m);
            }
        }
    }
}

void MoveGenerator::addPromotionMoves(int origin, int destination, std::vector<Move>& moves) {
    int promoTypes[] = {PieceConstants::Queen, PieceConstants::Rook, PieceConstants::Bishop, PieceConstants::Knight};
    for (int type : promoTypes) {
        Move m;
        m.origin = origin;
        m.destination = destination;
        m.isPromotion = true;
        m.promotionPieceType = type;
        moves.push_back(m);
    }
}

void MoveGenerator::generateKnightMoves(const Board& board, int origin, int color, std::vector<Move>& moves) {
    for (int i = 0; i < 8; i++) {
        int offset = knightOffsets[i];
        int dest = origin + offset;
        if (isValidSquare(origin, dest, offset, true)) {
            int piece = board.squares[dest];
            if (piece == PieceConstants::Empty || PieceConstants::getColor(piece) != color) {
                Move m;
                m.origin = origin;
                m.destination = dest;
                moves.push_back(m);
            }
        }
    }
}

void MoveGenerator::generateSlidingMoves(const Board& board, int origin, const int* directions, int numDirs, int color, std::vector<Move>& moves) {
    for (int d = 0; d < numDirs; d++) {
        int dir = directions[d];
        int target = origin;
        while (true) {
            int prev = target;
            target += dir;
            if (!isValidSquare(prev, target, dir, false)) break;

            int piece = board.squares[target];
            if (piece == PieceConstants::Empty) {
                Move m;
                m.origin = origin;
                m.destination = target;
                moves.push_back(m);
            } else {
                if (PieceConstants::getColor(piece) != color) {
                    Move m;
                    m.origin = origin;
                    m.destination = target;
                    moves.push_back(m);
                }
                break;  // Blocked
            }
        }
    }
}

void MoveGenerator::generateKingMoves(const Board& board, int origin, int color, std::vector<Move>& moves) {
    bool isWhitePiece = (color == PieceConstants::White);

    // Normal king moves
    for (int i = 0; i < 8; i++) {
        int offset = kingOffsets[i];
        int dest = origin + offset;
        if (isValidSquare(origin, dest, offset, true)) {
            int piece = board.squares[dest];
            if (piece == PieceConstants::Empty || PieceConstants::getColor(piece) != color) {
                Move m;
                m.origin = origin;
                m.destination = dest;
                moves.push_back(m);
            }
        }
    }

    // Castling
    int kingIndex = isWhitePiece ? 0 : 1;
    int enemyColor = isWhitePiece ? PieceConstants::Black : PieceConstants::White;

    // Cannot castle out of check
    if (isSquareAttacked(board, board.kingSquare[kingIndex], enemyColor)) return;

    int rankOffset = isWhitePiece ? 0 : 56;

    // Kingside
    int kingsideRight = isWhitePiece ? 1 : 4;
    if ((board.castlingRights & kingsideRight) != 0) {
        int f1 = rankOffset + 5;
        int g1 = rankOffset + 6;
        if (board.squares[f1] == PieceConstants::Empty && board.squares[g1] == PieceConstants::Empty) {
            if (!isSquareAttacked(board, f1, enemyColor) &&
                !isSquareAttacked(board, g1, enemyColor)) {
                Move m;
                m.origin = origin;
                m.destination = g1;
                m.isCastling = true;
                moves.push_back(m);
            }
        }
    }

    // Queenside
    int queensideRight = isWhitePiece ? 2 : 8;
    if ((board.castlingRights & queensideRight) != 0) {
        int d1 = rankOffset + 3;
        int c1 = rankOffset + 2;
        int b1 = rankOffset + 1;
        if (board.squares[d1] == PieceConstants::Empty &&
            board.squares[c1] == PieceConstants::Empty &&
            board.squares[b1] == PieceConstants::Empty) {
            if (!isSquareAttacked(board, d1, enemyColor) &&
                !isSquareAttacked(board, c1, enemyColor)) {
                Move m;
                m.origin = origin;
                m.destination = c1;
                m.isCastling = true;
                moves.push_back(m);
            }
        }
    }
}

bool MoveGenerator::isValidSquare(int origin, int dest, int offset, bool singleStep) {
    if (dest < 0 || dest >= 64) return false;

    int fileOrigin = origin % 8;
    int fileDest = dest % 8;
    int fileDiff = std::abs(fileOrigin - fileDest);

    if (singleStep) {
        // Pawn attacks, knight jumps, king moves
        return fileDiff <= 2;
    } else {
        // Sliding pieces
        int absOffset = std::abs(offset);
        if (absOffset == 7 || absOffset == 9) {
            return fileDiff == 1;
        }
        if (absOffset == 1) {
            return fileDiff == 1;
        }
        if (absOffset == 8) {
            return fileDiff == 0;
        }
    }

    return true;
}

} // namespace chess
