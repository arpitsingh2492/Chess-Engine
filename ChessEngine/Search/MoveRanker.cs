namespace ChessEngine.Search;

using System;
using System.Collections.Generic;
using ChessEngine.Core;

/// <summary>
/// Move ordering with: TT best move → winning captures (MVV-LVA) → promotions
/// → killer moves → counter move → history-ordered quiets → losing captures.
/// </summary>
public static class MoveRanker
{
    private static readonly int[] PieceValues = { 0, 100, 320, 330, 500, 900, 10000 };

    // Score tiers (ensure non-overlapping ranges)
    private const int TtMoveScore       = 200_000_000;
    private const int WinCaptureBase    =  50_000_000;
    private const int PromotionBase     =  40_000_000;
    private const int Killer1Score      =  30_000_000;
    private const int Killer2Score      =  29_000_000;
    private const int CounterMoveScore  =  28_000_000;
    // History scores live in 0 .. ~millions
    private const int LoseCaptureBase   = -50_000_000;

    /// <summary>
    /// Full move ordering used by the main alpha-beta search.
    /// </summary>
    public static void OrderMoves(
        Board board,
        List<Move> moves,
        Move ttMove,
        Move killer1,
        Move killer2,
        Move counterMove,
        int[,,] historyTable,
        int colorIndex)
    {
        int count = moves.Count;
        var keys = new int[count];

        for (int i = 0; i < count; i++)
        {
            var move = moves[i];
            keys[i] = ScoreMove(board, move, ttMove, killer1, killer2, counterMove, historyTable, colorIndex);
        }

        // Insertion sort (faster than Array.Sort for small N with move list)
        for (int i = 1; i < count; i++)
        {
            var keyI = keys[i];
            var moveI = moves[i];
            int j = i - 1;
            while (j >= 0 && keys[j] < keyI)
            {
                keys[j + 1] = keys[j];
                moves[j + 1] = moves[j];
                j--;
            }
            keys[j + 1] = keyI;
            moves[j + 1] = moveI;
        }
    }

    private static int ScoreMove(
        Board board, Move move,
        Move ttMove, Move killer1, Move killer2, Move counterMove,
        int[,,] historyTable, int colorIndex)
    {
        // 1. TT best move gets absolute priority
        if (move == ttMove) return TtMoveScore;

        int origin = move.Origin;
        int destination = move.Destination;
        int movingPiece = board.Squares[origin];
        int capturedPiece = board.Squares[destination];
        int movingType = Piece.GetPieceType(movingPiece);
        int capturedType = Piece.GetPieceType(capturedPiece);

        bool isCapture = capturedType != Piece.Empty || move.IsEnPassant;

        // 2. Captures — MVV-LVA with simple winning/losing classification
        if (isCapture)
        {
            int victimVal = move.IsEnPassant ? PieceValues[Piece.Pawn] : PieceValues[capturedType];
            int attackerVal = PieceValues[movingType];

            if (victimVal >= attackerVal)
            {
                // Likely winning capture (e.g. PxQ, NxR, BxR, QxQ, etc.)
                return WinCaptureBase + (victimVal * 10) - attackerVal;
            }
            else
            {
                // Might be losing (e.g. QxP) — check if defended by pawn
                int enemyColor = board.InactiveColor;
                if (IsPawnAttacked(board, destination, enemyColor))
                    return LoseCaptureBase + (victimVal * 10) - attackerVal;
                else
                    return WinCaptureBase + (victimVal * 10) - attackerVal;
            }
        }

        // 3. Promotions (non-capture)
        if (move.IsPromotion)
        {
            return PromotionBase + PieceValues[move.PromotionPieceType];
        }

        // 4. Killer moves (quiet moves that caused beta cutoffs at same ply)
        if (move == killer1) return Killer1Score;
        if (move == killer2) return Killer2Score;

        // 5. Counter-move
        if (move == counterMove) return CounterMoveScore;

        // 6. History heuristic for remaining quiet moves
        return historyTable[colorIndex, origin, destination];
    }

    /// <summary>
    /// Simplified capture-only ordering for quiescence search (MVV-LVA).
    /// </summary>
    public static void OrderCaptures(Board board, List<Move> moves)
    {
        int count = moves.Count;
        var keys = new int[count];

        for (int i = 0; i < count; i++)
        {
            var move = moves[i];
            int origin = move.Origin;
            int dest = move.Destination;
            int movingType = Piece.GetPieceType(board.Squares[origin]);
            int capturedType = Piece.GetPieceType(board.Squares[dest]);

            if (capturedType == Piece.Empty && move.IsEnPassant)
                capturedType = Piece.Pawn;

            int score = (PieceValues[capturedType] * 10) - PieceValues[movingType];

            if (move.IsPromotion)
                score += 8000 + PieceValues[move.PromotionPieceType];

            keys[i] = score;
        }

        // Insertion sort descending
        for (int i = 1; i < count; i++)
        {
            var keyI = keys[i];
            var moveI = moves[i];
            int j = i - 1;
            while (j >= 0 && keys[j] < keyI)
            {
                keys[j + 1] = keys[j];
                moves[j + 1] = moves[j];
                j--;
            }
            keys[j + 1] = keyI;
            moves[j + 1] = moveI;
        }
    }

    private static bool IsPawnAttacked(Board board, int square, int pawnColor)
    {
        if (pawnColor == Piece.White)
        {
            int left = square - 9, right = square - 7;
            if (left >= 0 && (square % 8) > 0 && board.Squares[left] == (Piece.Pawn | Piece.White)) return true;
            if (right >= 0 && (square % 8) < 7 && board.Squares[right] == (Piece.Pawn | Piece.White)) return true;
        }
        else
        {
            int left = square + 7, right = square + 9;
            if (left < 64 && (square % 8) > 0 && board.Squares[left] == (Piece.Pawn | Piece.Black)) return true;
            if (right < 64 && (square % 8) < 7 && board.Squares[right] == (Piece.Pawn | Piece.Black)) return true;
        }
        return false;
    }
}
