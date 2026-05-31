namespace ChessEngine.Evaluation;

using System;
using ChessEngine.Core;

/// <summary>
/// Evaluates a chess position using tapered evaluation.
/// Blends middlegame and endgame scores based on remaining material (game phase).
/// Returns evaluation from the perspective of the side to move.
/// </summary>
public static class Evaluator
{
    // Material values in centipawns (Stockfish-inspired)
    private static readonly int[] MgMaterial = { 0, 82, 337, 365, 477, 1025, 0 };
    private static readonly int[] EgMaterial = { 0, 94, 281, 297, 512, 936, 0 };

    // Phase contribution of each piece type (for tapered eval)
    // Total phase = 2*(1+1+2+4) = 16 per side = ~24 when both sides are full
    private static readonly int[] PhaseWeight = { 0, 0, 1, 1, 2, 4, 0 };
    private const int TotalPhase = 24;

    // Bonuses and penalties
    private const int BishopPairMg = 30;
    private const int BishopPairEg = 50;
    private const int RookOpenFileMg = 25;
    private const int RookOpenFileEg = 12;
    private const int RookSemiOpenFileMg = 15;
    private const int RookSemiOpenFileEg = 8;
    private const int TempoBonus = 15;

    // Pawn structure
    private const int IsolatedPawnMg = -15;
    private const int IsolatedPawnEg = -20;
    private const int DoubledPawnMg = -10;
    private const int DoubledPawnEg = -15;

    // Passed pawn bonus by relative rank (0=first rank, 7=promotion rank)
    private static readonly int[] PassedPawnMg = { 0, 5, 10, 20, 40, 65, 100, 0 };
    private static readonly int[] PassedPawnEg = { 0, 10, 20, 40, 70, 110, 170, 0 };

    // King safety
    private const int PawnShieldBonus = 12;
    private const int KingOpenFilePenalty = -18;

    public static int Evaluate(Board board)
    {
        int mgScore = 0;
        int egScore = 0;
        int phase = 0;

        int whiteBishops = 0, blackBishops = 0;

        // Pawn tracking arrays (stack-friendly)
        Span<int> whitePawnsPerFile = stackalloc int[8];
        Span<int> blackPawnsPerFile = stackalloc int[8];

        // ------- Pass 1: Count pawns per file and bishops -------
        for (int sq = 0; sq < 64; sq++)
        {
            int piece = board.Squares[sq];
            if (Piece.IsEmpty(piece)) continue;

            int type = Piece.GetPieceType(piece);
            int file = sq % 8;

            if (type == Piece.Pawn)
            {
                if (Piece.IsWhite(piece))
                    whitePawnsPerFile[file]++;
                else
                    blackPawnsPerFile[file]++;
            }
            else if (type == Piece.Bishop)
            {
                if (Piece.IsWhite(piece)) whiteBishops++;
                else blackBishops++;
            }
        }

        // ------- Pass 2: Full evaluation -------
        for (int sq = 0; sq < 64; sq++)
        {
            int piece = board.Squares[sq];
            if (Piece.IsEmpty(piece)) continue;

            int type = Piece.GetPieceType(piece);
            bool isWhite = Piece.IsWhite(piece);
            int file = sq % 8;
            int rank = sq / 8; // 0 = rank 1, 7 = rank 8
            int sign = isWhite ? 1 : -1;

            // Material
            mgScore += sign * MgMaterial[type];
            egScore += sign * EgMaterial[type];

            // Phase
            phase += PhaseWeight[type];

            // Piece-square table bonus (MG and EG separately)
            int[] mgTable = PositionTables.GetMgTable(type);
            int[] egTable = PositionTables.GetEgTable(type);
            if (mgTable.Length > 0)
            {
                mgScore += sign * PositionTables.ReadTable(mgTable, sq, isWhite);
                egScore += sign * PositionTables.ReadTable(egTable, sq, isWhite);
            }

            // ---------- Pawn structure ----------
            if (type == Piece.Pawn)
            {
                var friendlyPawns = isWhite ? whitePawnsPerFile : blackPawnsPerFile;
                var enemyPawns = isWhite ? blackPawnsPerFile : whitePawnsPerFile;

                // Isolated pawn (no friendly pawns on adjacent files)
                bool hasNeighbor = (file > 0 && friendlyPawns[file - 1] > 0)
                                || (file < 7 && friendlyPawns[file + 1] > 0);
                if (!hasNeighbor)
                {
                    mgScore += sign * IsolatedPawnMg;
                    egScore += sign * IsolatedPawnEg;
                }

                // Doubled pawn (more than 1 friendly pawn on same file)
                if (friendlyPawns[file] > 1)
                {
                    // Apply penalty once per doubled pawn (not per pair)
                    mgScore += sign * DoubledPawnMg;
                    egScore += sign * DoubledPawnEg;
                }

                // Passed pawn (no enemy pawns blocking on same or adjacent files ahead)
                int relativeRank = isWhite ? rank : (7 - rank);
                bool passed = true;

                if (isWhite)
                {
                    for (int r = rank + 1; r <= 7 && passed; r++)
                    {
                        for (int f = Math.Max(0, file - 1); f <= Math.Min(7, file + 1); f++)
                        {
                            int p = board.Squares[r * 8 + f];
                            if (Piece.GetPieceType(p) == Piece.Pawn && Piece.IsBlack(p))
                            { passed = false; break; }
                        }
                    }
                }
                else
                {
                    for (int r = rank - 1; r >= 0 && passed; r--)
                    {
                        for (int f = Math.Max(0, file - 1); f <= Math.Min(7, file + 1); f++)
                        {
                            int p = board.Squares[r * 8 + f];
                            if (Piece.GetPieceType(p) == Piece.Pawn && Piece.IsWhite(p))
                            { passed = false; break; }
                        }
                    }
                }

                if (passed && relativeRank >= 1 && relativeRank <= 6)
                {
                    mgScore += sign * PassedPawnMg[relativeRank];
                    egScore += sign * PassedPawnEg[relativeRank];
                }
            }

            // ---------- Rook on open / semi-open file ----------
            if (type == Piece.Rook)
            {
                bool friendlyPawnOnFile = isWhite ? whitePawnsPerFile[file] > 0 : blackPawnsPerFile[file] > 0;
                bool enemyPawnOnFile = isWhite ? blackPawnsPerFile[file] > 0 : whitePawnsPerFile[file] > 0;

                if (!friendlyPawnOnFile && !enemyPawnOnFile)
                {
                    mgScore += sign * RookOpenFileMg;
                    egScore += sign * RookOpenFileEg;
                }
                else if (!friendlyPawnOnFile)
                {
                    mgScore += sign * RookSemiOpenFileMg;
                    egScore += sign * RookSemiOpenFileEg;
                }
            }
        }

        // ---------- Bishop pair ----------
        if (whiteBishops >= 2) { mgScore += BishopPairMg; egScore += BishopPairEg; }
        if (blackBishops >= 2) { mgScore -= BishopPairMg; egScore -= BishopPairEg; }

        // ---------- King safety (middlegame only) ----------
        EvalKingSafety(board, whitePawnsPerFile, blackPawnsPerFile, ref mgScore, isWhite: true);
        EvalKingSafety(board, whitePawnsPerFile, blackPawnsPerFile, ref mgScore, isWhite: false);

        // ---------- Tapered evaluation ----------
        phase = Math.Min(phase, TotalPhase);
        int mgPhase = phase;
        int egPhase = TotalPhase - phase;
        int score = (mgScore * mgPhase + egScore * egPhase) / TotalPhase;

        // Tempo bonus for side to move
        score += board.WhiteToMove ? TempoBonus : -TempoBonus;

        // Return from perspective of side to move
        return score * (board.WhiteToMove ? 1 : -1);
    }

    /// <summary>King safety: pawn shield and open files near king</summary>
    private static void EvalKingSafety(Board board, Span<int> whitePawns, Span<int> blackPawns,
                                        ref int mgScore, bool isWhite)
    {
        int kingSq = board.KingSquares[isWhite ? 0 : 1];
        int kingFile = kingSq % 8;
        int kingRank = kingSq / 8;
        int sign = isWhite ? 1 : -1;

        // Only evaluate pawn shield when king is on back 2 ranks (castled position)
        int homeRank = isWhite ? 0 : 7;
        if (Math.Abs(kingRank - homeRank) > 1) return;

        int shieldRank = isWhite ? kingRank + 1 : kingRank - 1;
        if (shieldRank < 0 || shieldRank >= 8) return;

        int pawnColor = isWhite ? Piece.White : Piece.Black;

        for (int f = Math.Max(0, kingFile - 1); f <= Math.Min(7, kingFile + 1); f++)
        {
            // Pawn shield bonus
            int shieldSq = shieldRank * 8 + f;
            int p = board.Squares[shieldSq];
            if (Piece.GetPieceType(p) == Piece.Pawn && Piece.GetColor(p) == pawnColor)
            {
                mgScore += sign * PawnShieldBonus;
            }

            // Open file penalty near king
            bool hasFriendlyPawn = isWhite ? whitePawns[f] > 0 : blackPawns[f] > 0;
            if (!hasFriendlyPawn)
            {
                mgScore += sign * KingOpenFilePenalty;
            }
        }
    }
}
