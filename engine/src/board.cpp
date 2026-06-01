/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

#include "board.h"
#include <sstream>
#include <algorithm>
#include <cctype>

namespace chess {

Board::Board() {
    squares.fill(PieceConstants::Empty);
}

Board Board::clone() const {
    Board copy;
    copy.squares = squares;
    copy.whiteToMove = whiteToMove;
    copy.castlingRights = castlingRights;
    copy.enPassantSquare = enPassantSquare;
    copy.halfmoveClock = halfmoveClock;
    copy.kingSquare = kingSquare;
    // positionHistory_ is copied for repetition detection, history_ starts empty
    copy.positionHistory_ = positionHistory_;
    return copy;
}

std::string Board::getRepetitionHash() const {
    std::string fen = getCurrentFen();
    // Extract first 4 fields: board, turn, castling, en passant
    std::istringstream iss(fen);
    std::string board_str, turn, castling, ep;
    iss >> board_str >> turn >> castling >> ep;
    return board_str + " " + turn + " " + castling + " " + ep;
}

bool Board::isThreefoldRepetition() const {
    std::string current = getRepetitionHash();
    int count = 1;  // current position counts as 1
    for (const auto& hash : positionHistory_) {
        if (hash == current) {
            count++;
        }
    }
    return count >= 3;
}

void Board::setupStartingPosition() {
    loadFromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    history_.clear();
    positionHistory_.clear();
}

void Board::loadFromFen(const std::string& fen) {
    // Split FEN into parts
    std::istringstream iss(fen);
    std::string boardPart, turnPart, castlePart, epPart, halfmovePart;
    iss >> boardPart >> turnPart >> castlePart >> epPart;
    if (!(iss >> halfmovePart)) {
        halfmovePart = "0";
    }

    squares.fill(PieceConstants::Empty);

    int rank = 7;
    int file = 0;

    for (char c : boardPart) {
        if (c == '/') {
            rank--;
            file = 0;
        } else if (c >= '1' && c <= '8') {
            file += (c - '0');
        } else {
            bool isWhitePiece = (c >= 'A' && c <= 'Z');
            char typeChar = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
            int type = PieceConstants::Empty;
            switch (typeChar) {
                case 'p': type = PieceConstants::Pawn; break;
                case 'n': type = PieceConstants::Knight; break;
                case 'b': type = PieceConstants::Bishop; break;
                case 'r': type = PieceConstants::Rook; break;
                case 'q': type = PieceConstants::Queen; break;
                case 'k': type = PieceConstants::King; break;
                default: break;
            }
            int sq = rank * 8 + file;
            squares[sq] = type | (isWhitePiece ? PieceConstants::White : PieceConstants::Black);

            if (type == PieceConstants::King) {
                kingSquare[isWhitePiece ? 0 : 1] = sq;
            }
            file++;
        }
    }

    whiteToMove = (turnPart == "w");

    // Castling rights
    castlingRights = 0;
    if (castlePart.find('K') != std::string::npos) castlingRights |= 1;
    if (castlePart.find('Q') != std::string::npos) castlingRights |= 2;
    if (castlePart.find('k') != std::string::npos) castlingRights |= 4;
    if (castlePart.find('q') != std::string::npos) castlingRights |= 8;

    // En passant
    if (epPart == "-") {
        enPassantSquare = -1;
    } else {
        int f = epPart[0] - 'a';
        int r = epPart[1] - '1';
        enPassantSquare = r * 8 + f;
    }

    halfmoveClock = std::stoi(halfmovePart);
    positionHistory_.clear();
}

std::string Board::getCurrentFen() const {
    std::string result;

    // Board
    for (int rank = 7; rank >= 0; rank--) {
        int emptyCount = 0;
        for (int file = 0; file < 8; file++) {
            int piece = squares[rank * 8 + file];
            if (piece == PieceConstants::Empty) {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    result += std::to_string(emptyCount);
                    emptyCount = 0;
                }
                bool isWhitePiece = PieceConstants::isWhite(piece);
                int type = PieceConstants::getPieceType(piece);
                char c = '.';
                switch (type) {
                    case PieceConstants::Pawn:   c = 'p'; break;
                    case PieceConstants::Knight: c = 'n'; break;
                    case PieceConstants::Bishop: c = 'b'; break;
                    case PieceConstants::Rook:   c = 'r'; break;
                    case PieceConstants::Queen:  c = 'q'; break;
                    case PieceConstants::King:   c = 'k'; break;
                    default: break;
                }
                if (isWhitePiece) {
                    c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
                }
                result += c;
            }
        }
        if (emptyCount > 0) {
            result += std::to_string(emptyCount);
        }
        if (rank > 0) result += '/';
    }

    // Turn
    result += ' ';
    result += (whiteToMove ? 'w' : 'b');

    // Castling
    result += ' ';
    std::string castle;
    if (castlingRights & 1) castle += 'K';
    if (castlingRights & 2) castle += 'Q';
    if (castlingRights & 4) castle += 'k';
    if (castlingRights & 8) castle += 'q';
    if (castle.empty()) castle = "-";
    result += castle;

    // En passant
    result += ' ';
    if (enPassantSquare == -1) {
        result += '-';
    } else {
        result += static_cast<char>('a' + (enPassantSquare % 8));
        result += std::to_string(enPassantSquare / 8 + 1);
    }

    // Halfmove clock and fullmove number
    result += ' ';
    result += std::to_string(halfmoveClock);
    result += " 1";

    return result;
}

void Board::executeMove(const Move& move) {
    // Save history snapshot
    BoardStateSnapshot snapshot;
    snapshot.squares = squares;
    snapshot.castlingRights = castlingRights;
    snapshot.enPassantSquare = enPassantSquare;
    snapshot.halfmoveClock = halfmoveClock;
    snapshot.kingSquare = kingSquare;
    snapshot.positionHistory = positionHistory_;
    history_.push_back(std::move(snapshot));

    // Record current position hash before modifying
    positionHistory_.push_back(getRepetitionHash());

    int piece = squares[move.origin];
    int type = PieceConstants::getPieceType(piece);
    bool isWhitePiece = PieceConstants::isWhite(piece);
    int targetPiece = squares[move.destination];

    // Reset en passant
    enPassantSquare = -1;

    // Reset halfmove clock on pawn move or capture
    if (type == PieceConstants::Pawn || targetPiece != PieceConstants::Empty) {
        halfmoveClock = 0;
        positionHistory_.clear();  // Repetition is broken permanently
    } else {
        halfmoveClock++;
    }

    // Castling rook movement
    if (move.isCastling) {
        bool isKingSide = (move.destination % 8) == 6;
        int rookFrom = isKingSide ? move.destination + 1 : move.destination - 2;
        int rookTo = isKingSide ? move.destination - 1 : move.destination + 1;
        int rook = squares[rookFrom];
        squares[rookTo] = rook;
        squares[rookFrom] = PieceConstants::Empty;
    }

    // En passant capture
    if (move.isEnPassant) {
        int captureSq = move.destination + (isWhitePiece ? -8 : 8);
        squares[captureSq] = PieceConstants::Empty;
    }

    // Set en passant square for double pawn push
    if (move.isPawnTwoForward) {
        enPassantSquare = move.destination + (isWhitePiece ? -8 : 8);
    }

    // Execute the actual move
    if (move.isPromotion && move.promotionPieceType != 0) {
        squares[move.destination] = move.promotionPieceType | (isWhitePiece ? PieceConstants::White : PieceConstants::Black);
    } else {
        squares[move.destination] = piece;
    }
    squares[move.origin] = PieceConstants::Empty;

    // Track king position
    if (type == PieceConstants::King) {
        kingSquare[isWhitePiece ? 0 : 1] = move.destination;
        // Remove all castling rights for this side
        castlingRights &= isWhitePiece ? ~3 : ~12;
    }

    // Update castling rights for rook moves/captures
    updateCastlingRightsOnMove(move.origin, move.destination);

    // Swap turns
    whiteToMove = !whiteToMove;
}

void Board::undoMove() {
    if (history_.empty()) return;

    BoardStateSnapshot& prev = history_.back();
    squares = prev.squares;
    castlingRights = prev.castlingRights;
    enPassantSquare = prev.enPassantSquare;
    halfmoveClock = prev.halfmoveClock;
    kingSquare = prev.kingSquare;
    positionHistory_ = std::move(prev.positionHistory);
    history_.pop_back();

    // Swap turns back
    whiteToMove = !whiteToMove;
}

int Board::getHistoryCount() const {
    return static_cast<int>(history_.size());
}

void Board::updateCastlingRightsOnMove(int origin, int destination) {
    // White rooks
    if (origin == 7)  castlingRights &= ~1;   // h1
    if (origin == 0)  castlingRights &= ~2;   // a1
    // Black rooks
    if (origin == 63) castlingRights &= ~4;   // h8
    if (origin == 56) castlingRights &= ~8;   // a8

    // Capturing opponent's rook also removes their castling rights
    if (destination == 7)  castlingRights &= ~1;
    if (destination == 0)  castlingRights &= ~2;
    if (destination == 63) castlingRights &= ~4;
    if (destination == 56) castlingRights &= ~8;
}

} // namespace chess
