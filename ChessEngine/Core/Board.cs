namespace ChessEngine.Core;

using System;
using System.Collections.Generic;

public class Board
{
    public int[] Squares = new int[64];
    public bool WhiteToMove = true;
    public int ActiveColor => WhiteToMove ? Piece.White : Piece.Black;
    public int InactiveColor => WhiteToMove ? Piece.Black : Piece.White;
    
    // Castle flags
    public const int CastleWK = 1;
    public const int CastleWQ = 2;
    public const int CastleBK = 4;
    public const int CastleBQ = 8;
    public int CastleFlags = 0;

    public int EnPassantFile = -1; // -1 means no en passant available
    public int HalfMoveClock = 0;  // for 50-move rule
    public int FullMoveNumber = 1;

    public int[] KingSquares = new int[2]; // [0] = white king, [1] = black king

    public ulong Hash;

    private readonly Stack<GameState> _history = new();

    // Position hash history for repetition detection
    private readonly List<ulong> _positionHistory = new();

    // Piece lists for fast iteration
    public List<int>[] PieceLists = new List<int>[32]; // indexed by piece value (type|color)

    public Board()
    {
        for (int i = 0; i < 32; i++)
            PieceLists[i] = new List<int>();
    }

    /// <summary>Initialize from the standard starting position</summary>
    public void SetupStartingPosition()
    {
        LoadFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    }

    /// <summary>Load position from a FEN string</summary>
    public void LoadFen(string fen)
    {
        FenParser.LoadFen(this, fen);
        Hash = Zobrist.ComputeHash(Squares, WhiteToMove, CastleFlags, EnPassantFile);
        _positionHistory.Clear();
        _positionHistory.Add(Hash);
    }

    /// <summary>Apply a move to the board. Push state to history for undo.</summary>
    public void ExecuteMove(Move move)
    {
        int origin = move.Origin;
        int destination = move.Destination;
        int movingPiece = Squares[origin];
        int capturedPiece = Squares[destination];
        int pieceType = Piece.GetPieceType(movingPiece);
        int color = Piece.GetColor(movingPiece);
        bool isWhite = color == Piece.White;

        // Save current state
        _history.Push(new GameState(capturedPiece, CastleFlags, EnPassantFile, HalfMoveClock, Hash));

        // Update half-move clock
        HalfMoveClock++;
        if (pieceType == Piece.Pawn || capturedPiece != Piece.Empty)
            HalfMoveClock = 0;

        // Remove Zobrist for old state
        Hash ^= Zobrist.CastleKeys[CastleFlags & 0xF];
        Hash ^= Zobrist.EnPassantKeys[EnPassantFile < 0 ? 8 : EnPassantFile];

        // Handle en passant capture
        if (move.IsEnPassant)
        {
            int epPawnSquare = isWhite ? destination - 8 : destination + 8;
            int epPawn = Squares[epPawnSquare];
            Hash ^= Zobrist.PieceKeys[Zobrist.PieceIndex(epPawn), epPawnSquare];
            Squares[epPawnSquare] = Piece.Empty;
            RemoveFromPieceList(epPawn, epPawnSquare);
        }

        // Remove captured piece from hash and piece list
        if (capturedPiece != Piece.Empty)
        {
            Hash ^= Zobrist.PieceKeys[Zobrist.PieceIndex(capturedPiece), destination];
            RemoveFromPieceList(capturedPiece, destination);
        }

        // Move the piece
        Hash ^= Zobrist.PieceKeys[Zobrist.PieceIndex(movingPiece), origin];
        Squares[origin] = Piece.Empty;
        RemoveFromPieceList(movingPiece, origin);

        int finalPiece = movingPiece;

        // Handle promotion
        if (move.IsPromotion)
        {
            finalPiece = Piece.MakePiece(move.PromotionPieceType, color);
        }

        Squares[destination] = finalPiece;
        Hash ^= Zobrist.PieceKeys[Zobrist.PieceIndex(finalPiece), destination];
        AddToPieceList(finalPiece, destination);

        // Update king position
        if (pieceType == Piece.King)
        {
            KingSquares[isWhite ? 0 : 1] = destination;

            // Handle castling rook movement
            if (move.IsCastle)
            {
                int rookFrom, rookTo;
                if (destination > origin) // King-side
                {
                    rookFrom = isWhite ? 7 : 63;
                    rookTo = isWhite ? 5 : 61;
                }
                else // Queen-side
                {
                    rookFrom = isWhite ? 0 : 56;
                    rookTo = isWhite ? 3 : 59;
                }

                int rook = Squares[rookFrom];
                Hash ^= Zobrist.PieceKeys[Zobrist.PieceIndex(rook), rookFrom];
                Hash ^= Zobrist.PieceKeys[Zobrist.PieceIndex(rook), rookTo];
                Squares[rookFrom] = Piece.Empty;
                Squares[rookTo] = rook;
                RemoveFromPieceList(rook, rookFrom);
                AddToPieceList(rook, rookTo);
            }
        }

        // Update en passant file
        EnPassantFile = -1;
        if (move.Flag == Move.FlagDoublePush)
        {
            EnPassantFile = origin % 8;
        }

        // Update castle rights
        // If king moves, lose both castling rights for that color
        if (pieceType == Piece.King)
        {
            if (isWhite) CastleFlags &= ~(CastleWK | CastleWQ);
            else CastleFlags &= ~(CastleBK | CastleBQ);
        }
        // If rook moves from its starting square, lose that castling right
        if (origin == 0) CastleFlags &= ~CastleWQ;
        if (origin == 7) CastleFlags &= ~CastleWK;
        if (origin == 56) CastleFlags &= ~CastleBQ;
        if (origin == 63) CastleFlags &= ~CastleBK;
        // If rook is captured on its starting square
        if (destination == 0) CastleFlags &= ~CastleWQ;
        if (destination == 7) CastleFlags &= ~CastleWK;
        if (destination == 56) CastleFlags &= ~CastleBQ;
        if (destination == 63) CastleFlags &= ~CastleBK;

        // Zobrist for new castle/en passant state
        Hash ^= Zobrist.CastleKeys[CastleFlags & 0xF];
        Hash ^= Zobrist.EnPassantKeys[EnPassantFile < 0 ? 8 : EnPassantFile];

        // Switch side to move
        WhiteToMove = !WhiteToMove;
        Hash ^= Zobrist.SideToMoveKey;

        if (WhiteToMove)
            FullMoveNumber++;

        // Record position for repetition detection
        _positionHistory.Add(Hash);
    }

    /// <summary>Undo the last move</summary>
    public void UndoMove(Move move)
    {
        // Remove position from repetition history
        if (_positionHistory.Count > 0)
            _positionHistory.RemoveAt(_positionHistory.Count - 1);

        var state = _history.Pop();

        // Switch side back
        WhiteToMove = !WhiteToMove;

        int origin = move.Origin;
        int destination = move.Destination;
        int movedPiece = Squares[destination];
        int color = WhiteToMove ? Piece.White : Piece.Black;
        bool isWhite = color == Piece.White;

        // If promotion, restore to pawn
        int originalPiece = move.IsPromotion ? Piece.MakePiece(Piece.Pawn, color) : movedPiece;

        // Move piece back
        RemoveFromPieceList(movedPiece, destination);
        Squares[destination] = Piece.Empty;
        Squares[origin] = originalPiece;
        AddToPieceList(originalPiece, origin);

        // Restore captured piece
        if (state.CapturedPiece != Piece.Empty)
        {
            Squares[destination] = state.CapturedPiece;
            AddToPieceList(state.CapturedPiece, destination);
        }

        // Handle en passant undo
        if (move.IsEnPassant)
        {
            int epPawnSquare = isWhite ? destination - 8 : destination + 8;
            int epPawn = Piece.MakePiece(Piece.Pawn, isWhite ? Piece.Black : Piece.White);
            Squares[destination] = Piece.Empty; // The captured piece was not on destination
            Squares[epPawnSquare] = epPawn;
            AddToPieceList(epPawn, epPawnSquare);
        }

        // Handle castling undo - move rook back
        if (move.IsCastle)
        {
            int rookFrom, rookTo;
            if (destination > origin) // King-side
            {
                rookFrom = isWhite ? 7 : 63;
                rookTo = isWhite ? 5 : 61;
            }
            else // Queen-side
            {
                rookFrom = isWhite ? 0 : 56;
                rookTo = isWhite ? 3 : 59;
            }

            int rook = Squares[rookTo];
            Squares[rookTo] = Piece.Empty;
            Squares[rookFrom] = rook;
            RemoveFromPieceList(rook, rookTo);
            AddToPieceList(rook, rookFrom);
        }

        // Update king position
        if (Piece.GetPieceType(originalPiece) == Piece.King)
            KingSquares[isWhite ? 0 : 1] = origin;

        // Restore state
        CastleFlags = state.CastleFlags;
        EnPassantFile = state.EnPassantFile;
        HalfMoveClock = state.HalfMoveClock;
        Hash = state.Hash;

        if (WhiteToMove)
            FullMoveNumber--;
    }

    /// <summary>Execute a null move (pass the turn without moving)</summary>
    public void ExecuteNullMove()
    {
        _history.Push(new GameState(Piece.Empty, CastleFlags, EnPassantFile, HalfMoveClock, Hash));

        // Remove en passant from hash
        Hash ^= Zobrist.EnPassantKeys[EnPassantFile < 0 ? 8 : EnPassantFile];
        EnPassantFile = -1;
        Hash ^= Zobrist.EnPassantKeys[8]; // no en passant

        // Switch side to move
        WhiteToMove = !WhiteToMove;
        Hash ^= Zobrist.SideToMoveKey;

        _positionHistory.Add(Hash);
    }

    /// <summary>Undo a null move</summary>
    public void UndoNullMove()
    {
        if (_positionHistory.Count > 0)
            _positionHistory.RemoveAt(_positionHistory.Count - 1);

        WhiteToMove = !WhiteToMove;

        var state = _history.Pop();
        EnPassantFile = state.EnPassantFile;
        HalfMoveClock = state.HalfMoveClock;
        Hash = state.Hash;
    }

    /// <summary>Check if the current position is a repetition (twofold)</summary>
    public bool IsRepetition()
    {
        int count = _positionHistory.Count;
        // Only look back as far as the halfmove clock (no repetitions across irreversible moves)
        int lookback = Math.Min(HalfMoveClock, count - 1);

        for (int i = 1; i <= lookback; i++)
        {
            if (_positionHistory[count - 1 - i] == Hash)
                return true;
        }
        return false;
    }

    /// <summary>Check if a square is attacked by the given color</summary>
    public bool IsSquareAttacked(int square, int attackerColor)
    {
        // Check knight attacks
        ReadOnlySpan<int> knightOffsets = stackalloc int[] { -17, -15, -10, -6, 6, 10, 15, 17 };
        foreach (int offset in knightOffsets)
        {
            int target = square + offset;
            if (target >= 0 && target < 64)
            {
                int file1 = square % 8, file2 = target % 8;
                if (Math.Abs(file1 - file2) <= 2)
                {
                    int p = Squares[target];
                    if (Piece.GetPieceType(p) == Piece.Knight && Piece.GetColor(p) == attackerColor)
                        return true;
                }
            }
        }

        // Check sliding attacks (bishop/rook/queen)
        ReadOnlySpan<int> slidingDirs = stackalloc int[] { -8, 8, -1, 1, -9, -7, 7, 9 };
        for (int d = 0; d < 8; d++)
        {
            int dir = slidingDirs[d];
            bool isDiagonal = d >= 4;
            for (int i = 1; i < 8; i++)
            {
                int target = square + dir * i;
                if (target < 0 || target >= 64) break;

                // Check for wrapping
                int prevFile = (square + dir * (i - 1)) % 8;
                int currFile = target % 8;
                if (prevFile < 0) prevFile += 8;
                if (currFile < 0) currFile += 8;
                // For horizontal/diagonal moves, file should change by at most 1 per step
                if (Math.Abs(currFile - prevFile) > 1) break;

                int p = Squares[target];
                if (p != Piece.Empty)
                {
                    if (Piece.GetColor(p) == attackerColor)
                    {
                        int pt = Piece.GetPieceType(p);
                        if (pt == Piece.Queen) return true;
                        if (isDiagonal && pt == Piece.Bishop) return true;
                        if (!isDiagonal && pt == Piece.Rook) return true;
                        // King attacks from distance 1
                        if (i == 1 && pt == Piece.King) return true;
                    }
                    break; // blocked
                }
            }
        }

        // Check pawn attacks
        if (attackerColor == Piece.White)
        {
            // White pawns attack from below
            int left = square - 9, right = square - 7;
            if (left >= 0 && (square % 8) > 0 && Squares[left] == (Piece.Pawn | Piece.White)) return true;
            if (right >= 0 && (square % 8) < 7 && Squares[right] == (Piece.Pawn | Piece.White)) return true;
        }
        else
        {
            // Black pawns attack from above
            int left = square + 7, right = square + 9;
            if (left < 64 && (square % 8) > 0 && Squares[left] == (Piece.Pawn | Piece.Black)) return true;
            if (right < 64 && (square % 8) < 7 && Squares[right] == (Piece.Pawn | Piece.Black)) return true;
        }

        return false;
    }

    /// <summary>Is the current side's king in check?</summary>
    public bool IsInCheck()
    {
        int kingSquare = KingSquares[WhiteToMove ? 0 : 1];
        return IsSquareAttacked(kingSquare, InactiveColor);
    }

    private void AddToPieceList(int piece, int square)
    {
        if (piece < PieceLists.Length)
            PieceLists[piece].Add(square);
    }

    private void RemoveFromPieceList(int piece, int square)
    {
        if (piece < PieceLists.Length)
            PieceLists[piece].Remove(square);
    }
}
