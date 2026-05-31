namespace ChessEngine.MoveGeneration;

using System;
using System.Collections.Generic;
using ChessEngine.Core;

public static class MoveGenerator
{
    public static List<Move> GenerateLegalMoves(Board board, bool capturesOnly = false)
    {
        var pseudoLegal = new List<Move>(64);
        int friendlyColor = board.ActiveColor;

        for (int sq = 0; sq < 64; sq++)
        {
            int piece = board.Squares[sq];
            if (Piece.IsEmpty(piece) || !Piece.IsColor(piece, friendlyColor))
                continue;

            int type = Piece.GetPieceType(piece);

            switch (type)
            {
                case Piece.Pawn:
                    GeneratePawnMoves(board, sq, friendlyColor, pseudoLegal, capturesOnly);
                    break;
                case Piece.Knight:
                    GenerateKnightMoves(board, sq, friendlyColor, pseudoLegal, capturesOnly);
                    break;
                case Piece.King:
                    GenerateKingMoves(board, sq, friendlyColor, pseudoLegal, capturesOnly);
                    break;
                case Piece.Bishop:
                case Piece.Rook:
                case Piece.Queen:
                    GenerateSlidingMoves(board, sq, type, friendlyColor, pseudoLegal, capturesOnly);
                    break;
            }
        }

        // Filter for legality: make move, check if own king is in check, unmake
        var legal = new List<Move>(pseudoLegal.Count);
        foreach (var move in pseudoLegal)
        {
            board.ExecuteMove(move);
            // After ExecuteMove, WhiteToMove has flipped, so we check if our king is attacked.
            // Our color was friendlyColor. After execute, board.InactiveColor == friendlyColor.
            int kingSquare = board.KingSquares[friendlyColor == Piece.White ? 0 : 1];
            bool inCheck = board.IsSquareAttacked(kingSquare, board.ActiveColor);
            board.UndoMove(move);

            if (!inCheck)
                legal.Add(move);
        }

        return legal;
    }

    private static void GeneratePawnMoves(Board board, int sq, int color, List<Move> moves, bool capturesOnly)
    {
        bool isWhite = color == Piece.White;
        int forward = isWhite ? 8 : -8;
        int startRank = isWhite ? 1 : 6;
        int promoRank = isWhite ? 6 : 1; // rank FROM which pawn promotes
        int rank = sq / 8;
        int file = sq % 8;
        bool isOnPromoRank = rank == promoRank;

        // Forward push
        if (!capturesOnly)
        {
            int singlePush = sq + forward;
            if (singlePush >= 0 && singlePush < 64 && board.Squares[singlePush] == Piece.Empty)
            {
                if (isOnPromoRank)
                    AddPromotionMoves(sq, singlePush, moves);
                else
                    moves.Add(new Move(sq, singlePush));

                // Double push from starting rank
                if (rank == startRank)
                {
                    int doublePush = sq + forward * 2;
                    if (board.Squares[doublePush] == Piece.Empty)
                        moves.Add(new Move(sq, doublePush, Move.FlagDoublePush));
                }
            }
        }

        // Captures
        int[] captureOffsets = isWhite ? new[] { 7, 9 } : new[] { -9, -7 };
        foreach (int offset in captureOffsets)
        {
            int target = sq + offset;
            if (target < 0 || target >= 64) continue;

            int targetFile = target % 8;
            if (Math.Abs(targetFile - file) != 1) continue; // prevent wrapping

            int targetPiece = board.Squares[target];
            if (targetPiece != Piece.Empty && Piece.GetColor(targetPiece) != color)
            {
                if (isOnPromoRank)
                    AddPromotionMoves(sq, target, moves);
                else
                    moves.Add(new Move(sq, target));
            }

            // En passant
            if (board.EnPassantFile >= 0 && targetFile == board.EnPassantFile)
            {
                int epRank = isWhite ? 5 : 2;
                if (target / 8 == epRank)
                    moves.Add(new Move(sq, target, Move.FlagEnPassant));
            }
        }
    }

    private static void AddPromotionMoves(int from, int to, List<Move> moves)
    {
        moves.Add(new Move(from, to, Move.FlagPromoteQueen));
        moves.Add(new Move(from, to, Move.FlagPromoteRook));
        moves.Add(new Move(from, to, Move.FlagPromoteBishop));
        moves.Add(new Move(from, to, Move.FlagPromoteKnight));
    }

    private static void GenerateKnightMoves(Board board, int sq, int color, List<Move> moves, bool capturesOnly)
    {
        foreach (int target in BoardHelper.KnightTargets[sq])
        {
            int destPiece = board.Squares[target];
            if (Piece.IsColor(destPiece, color)) continue; // can't capture own piece
            if (capturesOnly && destPiece == Piece.Empty) continue;
            moves.Add(new Move(sq, target));
        }
    }

    private static void GenerateKingMoves(Board board, int sq, int color, List<Move> moves, bool capturesOnly)
    {
        // Normal king moves
        foreach (int target in BoardHelper.KingTargets[sq])
        {
            int destPiece = board.Squares[target];
            if (Piece.IsColor(destPiece, color)) continue;
            if (capturesOnly && destPiece == Piece.Empty) continue;
            moves.Add(new Move(sq, target));
        }

        // Castling (never in capturesOnly)
        if (capturesOnly) return;
        bool isWhite = color == Piece.White;
        int enemyColor = isWhite ? Piece.Black : Piece.White;

        // Can't castle while in check
        if (board.IsSquareAttacked(sq, enemyColor)) return;

        // King-side
        int ksFlag = isWhite ? Board.CastleWK : Board.CastleBK;
        if ((board.CastleFlags & ksFlag) != 0)
        {
            int f = sq + 1, g = sq + 2;
            if (board.Squares[f] == Piece.Empty && board.Squares[g] == Piece.Empty)
            {
                if (!board.IsSquareAttacked(f, enemyColor) && !board.IsSquareAttacked(g, enemyColor))
                    moves.Add(new Move(sq, g, Move.FlagCastle));
            }
        }

        // Queen-side
        int qsFlag = isWhite ? Board.CastleWQ : Board.CastleBQ;
        if ((board.CastleFlags & qsFlag) != 0)
        {
            int d = sq - 1, c = sq - 2, b = sq - 3;
            if (board.Squares[d] == Piece.Empty && board.Squares[c] == Piece.Empty && board.Squares[b] == Piece.Empty)
            {
                if (!board.IsSquareAttacked(d, enemyColor) && !board.IsSquareAttacked(c, enemyColor))
                    moves.Add(new Move(sq, c, Move.FlagCastle));
            }
        }
    }

    private static void GenerateSlidingMoves(Board board, int sq, int pieceType, int color, List<Move> moves, bool capturesOnly)
    {
        // Bishop uses diagonal directions (indices 4-7), Rook uses orthogonal (0-3), Queen uses all
        int startDir = (pieceType == Piece.Bishop) ? 4 : 0;
        int endDir = (pieceType == Piece.Rook) ? 4 : 8;

        for (int d = startDir; d < endDir; d++)
        {
            int dir = BoardHelper.Directions[d];
            int maxDist = BoardHelper.DistToEdge[sq, d];

            for (int i = 1; i <= maxDist; i++)
            {
                int target = sq + dir * i;
                int destPiece = board.Squares[target];

                if (Piece.IsColor(destPiece, color)) break; // blocked by own piece

                bool isCapture = destPiece != Piece.Empty;
                if (!capturesOnly || isCapture)
                    moves.Add(new Move(sq, target));

                if (isCapture) break; // can't go further
            }
        }
    }
}
