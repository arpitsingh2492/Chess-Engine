namespace ChessEngine.Search;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using ChessEngine.Core;
using ChessEngine.MoveGeneration;
using ChessEngine.Evaluation;

/// <summary>
/// Alpha-beta search engine with iterative deepening, PVS, null move pruning,
/// late move reductions, aspiration windows, check extensions, futility pruning,
/// razoring, reverse futility pruning, killer/history/counter-move heuristics.
/// </summary>
public sealed class SearchEngine
{
    private const int Infinite  = 1_000_000;
    private const int MateScore = 100_000;
    private const int MaxPly    = 128;

    private readonly TranspositionTable _tt = new(256); // 256 MB

    // ---- Move ordering data structures ----
    private readonly Move[,] _killerMoves = new Move[MaxPly, 2];
    private readonly int[,,] _historyTable = new int[2, 64, 64]; // [colorIndex, from, to]
    private readonly Move[,] _counterMoves = new Move[64, 64];   // [prevFrom, prevTo] → refutation

    // ---- PV tracking ----
    private readonly Move[,] _pvTable = new Move[MaxPly, MaxPly];
    private readonly int[] _pvLength = new int[MaxPly];

    // ---- Search state ----
    public int NodesEvaluated;
    public int QNodes;
    public int TtHits;

    private Move _bestMoveSoFar;
    private int  _bestEvalSoFar;
    private bool _isSearchCancelled;
    private int  _currentIterativeDepth;
    private readonly Stopwatch _timer = new();
    private long _timeLimitMs;

    // Track the last move made at each ply for counter-move heuristic
    private readonly Move[] _moveStack = new Move[MaxPly];

    // ----------------------------------------------------------------
    //  Opening Book (expanded)
    // ----------------------------------------------------------------
    private static readonly Dictionary<string, string[]> OpeningBook = new()
    {
        // ── Starting position (White) ──
        { "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -",
          new[] { "e2e4", "d2d4", "g1f3", "c2c4" } },

        // ── After 1.e4 (Black) ──
        { "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -",
          new[] { "e7e5", "c7c5", "e7e6", "c7c6", "d7d5", "g8f6" } },

        // ── After 1.d4 (Black) ──
        { "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -",
          new[] { "d7d5", "g8f6", "e7e6", "f7f5" } },

        // ── After 1.c4 (Black) ──
        { "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq -",
          new[] { "e7e5", "g8f6", "c7c5", "e7e6" } },

        // ── After 1.Nf3 (Black) ──
        { "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -",
          new[] { "d7d5", "g8f6", "c7c5" } },

        // ── 1.e4 e5 (White: Italian / Ruy Lopez / Scotch) ──
        { "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
          new[] { "g1f3" } },

        // ── 1.e4 e5 2.Nf3 (Black) ──
        { "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -",
          new[] { "b8c6" } },

        // ── 1.e4 e5 2.Nf3 Nc6 (White: Italian / Ruy Lopez / Scotch) ──
        { "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -",
          new[] { "f1c4", "f1b5", "d2d4" } },

        // ── 1.e4 c5 Sicilian (White) ──
        { "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
          new[] { "g1f3", "b1c3", "d2d4" } },

        // ── 1.e4 e6 French (White) ──
        { "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
          new[] { "d2d4" } },

        // ── 1.e4 c6 Caro-Kann (White) ──
        { "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
          new[] { "d2d4" } },

        // ── 1.d4 d5 (White: QGD / QGA) ──
        { "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -",
          new[] { "c2c4", "g1f3", "b1c3" } },

        // ── 1.d4 Nf6 (White: Indian systems) ──
        { "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -",
          new[] { "c2c4", "g1f3", "b1c3" } },

        // ── 1.d4 Nf6 2.c4 (Black: KID / Nimzo / QID) ──
        { "rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -",
          new[] { "e7e6", "g7g6", "c7c5" } },

        // ── 1.d4 d5 2.c4 (Black: QGD / QGA / Slav) ──
        { "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -",
          new[] { "e7e6", "c7c6", "d5c4" } },
    };

    // ----------------------------------------------------------------
    //  Public API
    // ----------------------------------------------------------------
    public (Move move, int score, int depth, string pv) GetBestMove(Board board, int timeLimitMs)
    {
        NodesEvaluated = 0;
        QNodes = 0;
        TtHits = 0;
        _isSearchCancelled = false;
        _bestMoveSoFar = Move.Null;
        _bestEvalSoFar = 0;

        Array.Clear(_killerMoves);
        AgeHistory();

        _timer.Restart();
        _timeLimitMs = timeLimitMs;

        _tt.IncrementGeneration();

        // ---- Opening Book ----
        string fenKey = GetFenKeyForBook(board);
        if (OpeningBook.TryGetValue(fenKey, out var bookMoves))
        {
            var rng = new Random();
            string selectedBookMoveStr = bookMoves[rng.Next(bookMoves.Length)];
            var legalMoves = MoveGenerator.GenerateLegalMoves(board);
            foreach (var m in legalMoves)
            {
                if (m.ToAlgebraic() == selectedBookMoveStr)
                {
                    Console.ForegroundColor = ConsoleColor.DarkGray;
                    Console.WriteLine($"   [Opening Book] {selectedBookMoveStr}");
                    Console.ResetColor();
                    return (m, 0, 0, selectedBookMoveStr);
                }
            }
        }

        // ---- Iterative Deepening with Aspiration Windows ----
        int finalDepthReached = 0;
        string pvString = "";
        int previousScore = 0;

        for (int depth = 1; depth <= 64; depth++)
        {
            _currentIterativeDepth = depth;
            _pvLength[0] = 0;
            int eval;

            if (depth >= 5)
            {
                // Aspiration window search
                int delta = 30;
                int alpha = previousScore - delta;
                int beta  = previousScore + delta;

                while (true)
                {
                    eval = AlphaBeta(board, depth, 0, alpha, beta, true, Move.Null);

                    if (_isSearchCancelled) break;

                    if (eval <= alpha)
                    {
                        alpha = Math.Max(alpha - delta, -Infinite);
                        delta *= 2;
                    }
                    else if (eval >= beta)
                    {
                        beta = Math.Min(beta + delta, Infinite);
                        delta *= 2;
                    }
                    else
                    {
                        break; // Score is within window
                    }

                    if (delta > 2000)
                    {
                        // Fall back to full window
                        eval = AlphaBeta(board, depth, 0, -Infinite, Infinite, true, Move.Null);
                        break;
                    }
                }
            }
            else
            {
                eval = AlphaBeta(board, depth, 0, -Infinite, Infinite, true, Move.Null);
            }

            if (_isSearchCancelled)
                break;

            _bestEvalSoFar = eval;
            previousScore = eval;
            finalDepthReached = depth;
            pvString = BuildPvString(0);

            // Print iterative deepening progress
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.WriteLine($"   [ID] depth {depth,2}  score {eval,6}cp  nodes {NodesEvaluated,10:N0}  time {_timer.ElapsedMilliseconds}ms  pv {pvString}");
            Console.ResetColor();

            // Time management: stop deepening if we used >40% of time and depth >= 6
            if (depth >= 6 && _timer.ElapsedMilliseconds > _timeLimitMs * 0.40)
                break;

            // Stop if we found a forced mate
            if (Math.Abs(eval) > MateScore - MaxPly)
                break;
        }

        Console.ForegroundColor = ConsoleColor.DarkGray;
        Console.WriteLine($"   [Search] Depth: {finalDepthReached} plies ({finalDepthReached / 2.0:F1} moves) | Nodes: {NodesEvaluated:N0} (Q: {QNodes:N0}) | TT Hits: {TtHits:N0} | Time: {_timer.ElapsedMilliseconds}ms");
        Console.ResetColor();

        return (_bestMoveSoFar, _bestEvalSoFar, finalDepthReached, pvString);
    }

    // ----------------------------------------------------------------
    //  Alpha-Beta with PVS, NMP, LMR, Extensions, Pruning
    // ----------------------------------------------------------------
    private int AlphaBeta(Board board, int depth, int ply, int alpha, int beta, bool isPvNode, Move prevMove)
    {
        NodesEvaluated++;

        // Init PV length
        if (ply < MaxPly)
            _pvLength[ply] = ply;

        bool isRoot = ply == 0;
        bool inCheck = board.IsInCheck();

        // Check extension: extend search when in check
        if (inCheck)
            depth++;

        // Time check (every 4096 nodes to reduce overhead)
        if (!isRoot && (NodesEvaluated & 4095) == 0 && _timer.ElapsedMilliseconds >= _timeLimitMs)
        {
            if (_currentIterativeDepth > 6)
            {
                _isSearchCancelled = true;
                return 0;
            }
        }

        // ---- Draw detection ----
        if (!isRoot)
        {
            if (board.HalfMoveClock >= 100) return 0;
            if (board.IsRepetition()) return 0;
        }

        // ---- Transposition table lookup ----
        ulong hash = board.Hash;
        var ttEntry = _tt.Lookup(hash);
        Move ttMove = Move.Null;

        if (ttEntry.HasValue)
        {
            ttMove = ttEntry.Value.BestMove;

            if (!isPvNode && ttEntry.Value.Depth >= depth && ply > 0)
            {
                TtHits++;
                int ttValue = ttEntry.Value.Value;

                if (ttEntry.Value.Flag == TranspositionTable.Exact)
                    return ttValue;
                if (ttEntry.Value.Flag == TranspositionTable.LowerBound && ttValue >= beta)
                    return ttValue;
                if (ttEntry.Value.Flag == TranspositionTable.UpperBound && ttValue <= alpha)
                    return ttValue;
            }
        }

        // ---- Leaf node: drop into quiescence ----
        if (depth <= 0)
            return QuiescenceSearch(board, alpha, beta, ply);

        // ---- Static evaluation for pruning decisions ----
        int staticEval = Evaluator.Evaluate(board);

        // ---- Reverse Futility Pruning (Static Null Move Pruning) ----
        if (!isPvNode && !inCheck && depth <= 3 && ply > 0)
        {
            int margin = 120 * depth;
            if (staticEval - margin >= beta)
                return staticEval - margin;
        }

        // ---- Razoring ----
        if (!isPvNode && !inCheck && depth <= 3 && ply > 0)
        {
            int margin = 300 + 200 * (depth - 1);
            if (staticEval + margin < alpha)
            {
                int razorScore = QuiescenceSearch(board, alpha, beta, ply);
                if (razorScore <= alpha)
                    return razorScore;
            }
        }

        // ---- Null Move Pruning ----
        if (!isPvNode && !inCheck && depth >= 3 && ply > 0 && staticEval >= beta && HasNonPawnMaterial(board))
        {
            int R = 3 + depth / 6;
            R = Math.Min(R, depth - 1); // Don't reduce below depth 0

            board.ExecuteNullMove();
            int nullScore = -AlphaBeta(board, depth - 1 - R, ply + 1, -beta, -beta + 1, false, Move.Null);
            board.UndoNullMove();

            if (_isSearchCancelled) return 0;

            if (nullScore >= beta)
            {
                // Don't trust unproven mate scores from null move
                if (nullScore >= MateScore - MaxPly)
                    return beta;
                return nullScore;
            }
        }

        // ---- Generate and order moves ----
        var moves = MoveGenerator.GenerateLegalMoves(board);

        if (moves.Count == 0)
        {
            if (inCheck) return -MateScore + ply; // Checkmate
            return 0; // Stalemate
        }

        int colorIndex = board.WhiteToMove ? 0 : 1;
        Move killer1 = ply < MaxPly ? _killerMoves[ply, 0] : Move.Null;
        Move killer2 = ply < MaxPly ? _killerMoves[ply, 1] : Move.Null;

        // Counter-move: the move that refuted the opponent's last move
        Move counterMove = Move.Null;
        if (!prevMove.IsNull)
            counterMove = _counterMoves[prevMove.Origin, prevMove.Destination];

        MoveRanker.OrderMoves(board, moves, ttMove, killer1, killer2, counterMove, _historyTable, colorIndex);

        // ---- Main search loop ----
        byte flag = TranspositionTable.UpperBound;
        Move bestMove = moves[0]; // fallback
        int bestScore = -Infinite;
        int movesSearched = 0;

        for (int i = 0; i < moves.Count; i++)
        {
            var move = moves[i];
            int destination = move.Destination;
            int capturedType = Piece.GetPieceType(board.Squares[destination]);
            bool isCapture = capturedType != Piece.Empty || move.IsEnPassant;
            bool isPromotion = move.IsPromotion;
            bool isQuiet = !isCapture && !isPromotion;

            // ---- Futility Pruning (quiet moves at shallow depth) ----
            if (!isPvNode && !inCheck && isQuiet && depth <= 2 && ply > 0 && bestScore > -MateScore + MaxPly)
            {
                int futilityMargin = depth == 1 ? 200 : 500;
                if (staticEval + futilityMargin <= alpha)
                    continue;
            }

            // ---- Late Move Pruning: skip very late quiet moves at shallow depth ----
            if (!isPvNode && !inCheck && isQuiet && depth <= 3 && ply > 0
                && movesSearched >= 3 + depth * depth && bestScore > -MateScore + MaxPly)
            {
                continue;
            }

            board.ExecuteMove(move);
            if (ply < MaxPly) _moveStack[ply] = move;
            movesSearched++;

            bool givesCheck = board.IsInCheck();
            int score;

            // ---- Late Move Reductions (LMR) ----
            if (movesSearched >= 4 && depth >= 3 && isQuiet && !inCheck && !givesCheck)
            {
                // Log-based reduction formula
                int R = (int)(1.0 + Math.Log(depth) * Math.Log(movesSearched) / 2.5);
                R = Math.Clamp(R, 1, depth - 2);

                // Reduced-depth null-window search
                score = -AlphaBeta(board, depth - 1 - R, ply + 1, -alpha - 1, -alpha, false, move);

                // If it fails high, re-search at full depth with null window
                if (score > alpha)
                    score = -AlphaBeta(board, depth - 1, ply + 1, -alpha - 1, -alpha, false, move);
            }
            else if (!isPvNode || movesSearched > 1)
            {
                // PVS: null-window search for non-first moves and non-PV nodes
                score = -AlphaBeta(board, depth - 1, ply + 1, -alpha - 1, -alpha, false, move);
            }
            else
            {
                // Force full-window search for the first move in a PV node
                score = alpha + 1;
            }

            // Full-window re-search if PVS failed high in PV node
            if (isPvNode && score > alpha && (movesSearched == 1 || score < beta))
            {
                score = -AlphaBeta(board, depth - 1, ply + 1, -beta, -alpha, true, move);
            }

            board.UndoMove(move);

            if (_isSearchCancelled) return 0;

            if (score > bestScore)
            {
                bestScore = score;
                bestMove = move;
            }

            if (score >= beta)
            {
                // ---- Beta cutoff ----
                _tt.Store(hash, score, depth, TranspositionTable.LowerBound, move);

                if (isQuiet && ply < MaxPly)
                {
                    // Update killer moves
                    if (_killerMoves[ply, 0] != move)
                    {
                        _killerMoves[ply, 1] = _killerMoves[ply, 0];
                        _killerMoves[ply, 0] = move;
                    }

                    // Update history heuristic (bonus for the cutoff move)
                    int bonus = depth * depth;
                    _historyTable[colorIndex, move.Origin, move.Destination] += bonus;

                    // Penalize all previously searched quiet moves (history malus)
                    for (int j = 0; j < i; j++)
                    {
                        var prev = moves[j];
                        int prevCaptured = Piece.GetPieceType(board.Squares[prev.Destination]);
                        if (prevCaptured == Piece.Empty && !prev.IsEnPassant && !prev.IsPromotion)
                        {
                            _historyTable[colorIndex, prev.Origin, prev.Destination] -= bonus;
                        }
                    }

                    // Update counter-move table
                    if (!prevMove.IsNull)
                    {
                        _counterMoves[prevMove.Origin, prevMove.Destination] = move;
                    }
                }

                return score;
            }

            if (score > alpha)
            {
                alpha = score;
                flag = TranspositionTable.Exact;

                // Update PV table
                if (ply < MaxPly)
                {
                    _pvTable[ply, ply] = move;
                    int nextPlyLen = (ply + 1 < MaxPly) ? _pvLength[ply + 1] : ply + 1;
                    for (int j = ply + 1; j < nextPlyLen && j < MaxPly; j++)
                        _pvTable[ply, j] = _pvTable[ply + 1, j];
                    _pvLength[ply] = nextPlyLen;
                }

                if (isRoot)
                    _bestMoveSoFar = move;
            }
        }

        _tt.Store(hash, bestScore, depth, flag, bestMove);
        return bestScore;
    }

    // ----------------------------------------------------------------
    //  Quiescence Search — resolves captures to avoid horizon effect
    // ----------------------------------------------------------------
    private int QuiescenceSearch(Board board, int alpha, int beta, int ply)
    {
        NodesEvaluated++;
        QNodes++;

        // Stand-pat: static evaluation as baseline
        int standPat = Evaluator.Evaluate(board);

        if (standPat >= beta)
            return beta;

        // Delta pruning: big margin below alpha means even the best capture won't help
        const int BigDelta = 975; // slightly more than queen value
        if (standPat + BigDelta < alpha)
            return alpha;

        if (standPat > alpha)
            alpha = standPat;

        // Generate and order captures only
        var moves = MoveGenerator.GenerateLegalMoves(board, capturesOnly: true);
        MoveRanker.OrderCaptures(board, moves);

        foreach (var move in moves)
        {
            // Delta pruning per move: skip captures that can't raise alpha
            int capturedType = Piece.GetPieceType(board.Squares[move.Destination]);
            if (capturedType == Piece.Empty && move.IsEnPassant)
                capturedType = Piece.Pawn;

            int captureValue = capturedType switch
            {
                Piece.Pawn => 100,
                Piece.Knight => 337,
                Piece.Bishop => 365,
                Piece.Rook => 477,
                Piece.Queen => 1025,
                _ => 0
            };

            if (!move.IsPromotion && standPat + captureValue + 200 < alpha)
                continue;

            board.ExecuteMove(move);
            int score = -QuiescenceSearch(board, -beta, -alpha, ply + 1);
            board.UndoMove(move);

            if (score >= beta)
                return beta;

            if (score > alpha)
                alpha = score;
        }

        return alpha;
    }

    // ----------------------------------------------------------------
    //  Helpers
    // ----------------------------------------------------------------
    private static bool HasNonPawnMaterial(Board board)
    {
        int color = board.ActiveColor;
        for (int sq = 0; sq < 64; sq++)
        {
            int p = board.Squares[sq];
            if (Piece.IsEmpty(p) || Piece.GetColor(p) != color) continue;
            int type = Piece.GetPieceType(p);
            if (type >= Piece.Knight && type <= Piece.Queen)
                return true;
        }
        return false;
    }

    /// <summary>Halve history scores to prevent overflow and age stale entries</summary>
    private void AgeHistory()
    {
        for (int c = 0; c < 2; c++)
            for (int f = 0; f < 64; f++)
                for (int t = 0; t < 64; t++)
                    _historyTable[c, f, t] /= 2;
    }

    private string GetFenKeyForBook(Board board)
    {
        string fullFen = FenParser.ToFen(board);
        string[] parts = fullFen.Split(' ');
        if (parts.Length >= 4)
            return $"{parts[0]} {parts[1]} {parts[2]} {parts[3]}";
        return fullFen;
    }

    private string BuildPvString(int ply)
    {
        if (ply >= MaxPly) return "";
        var sb = new StringBuilder();
        int len = _pvLength[ply];
        for (int i = ply; i < len && i < MaxPly; i++)
        {
            if (i > ply) sb.Append(' ');
            sb.Append(_pvTable[ply, i].ToAlgebraic());
        }
        return sb.ToString();
    }
}
