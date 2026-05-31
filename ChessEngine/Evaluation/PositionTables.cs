namespace ChessEngine.Evaluation;

using System;
using ChessEngine.Core;

/// <summary>
/// Piece-square tables providing positional bonuses/penalties for each piece on each square.
/// Values are from White's perspective (a1=index 0). For black, the table is flipped vertically.
/// </summary>
public static class PositionTables
{
    // Pawn middlegame: center pawns worth more, advanced pawns worth more
    public static readonly int[] PawnTable = {
         0,  0,  0,  0,  0,  0,  0,  0,
        15, 20, 20,-20,-20, 20, 20, 15,
        10,  0,-10,  0,  0,-10,  0, 10,
         0,  0, 10, 25, 25, 10,  0,  0,
         5,  5, 15, 27, 27, 15,  5,  5,
        15, 15, 25, 30, 30, 25, 15, 15,
        50, 50, 50, 50, 50, 50, 50, 50,
         0,  0,  0,  0,  0,  0,  0,  0
    };

    // Pawn endgame: strongly encourage advancement, all files equal
    public static readonly int[] PawnEndTable = {
         0,  0,  0,  0,  0,  0,  0,  0,
        10, 10, 10, 10, 10, 10, 10, 10,
        20, 20, 20, 20, 20, 20, 20, 20,
        35, 35, 35, 35, 35, 35, 35, 35,
        55, 55, 55, 55, 55, 55, 55, 55,
        85, 85, 85, 85, 85, 85, 85, 85,
       130,130,130,130,130,130,130,130,
         0,  0,  0,  0,  0,  0,  0,  0
    };

    // Knight: strong in center, weak on edges
    public static readonly int[] KnightTable = {
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -30,  5, 20, 25, 25, 20,  5,-30,
        -30, 10, 25, 30, 30, 25, 10,-30,
        -30, 10, 25, 30, 30, 25, 10,-30,
        -30,  5, 20, 25, 25, 20,  5,-30,
        -40,-20,  0, 10, 10,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    };

    // Bishop: long diagonals, avoid corners
    public static readonly int[] BishopTable = {
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  5,  0,  5,  5,  0,  5,-10,
        -10, 10, 15, 15, 15, 15, 10,-10,
        -10,  5, 15, 20, 20, 15,  5,-10,
        -10, 10, 15, 20, 20, 15, 10,-10,
        -10, 15, 20, 20, 20, 20, 15,-10,
        -10,  5,  5,  5,  5,  5,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    };

    // Rook: 7th rank, open files
    public static readonly int[] RookTable = {
         0,  0,  0,  5,  5,  0,  0,  0,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         5, 10, 10, 10, 10, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0
    };

    // Queen: avoid early development to edges
    public static readonly int[] QueenTable = {
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -10,  5,  5,  5,  5,  5,  0,-10,
          0,  0,  5,  5,  5,  5,  0, -5,
         -5,  0,  5,  5,  5,  5,  0, -5,
        -10,  0,  5,  5,  5,  5,  0,-10,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    };

    // King middlegame: castled is safe, avoid center
    public static readonly int[] KingMiddleTable = {
         20, 30, 10,  0,  0, 10, 30, 20,
         20, 20,  0,  0,  0,  0, 20, 20,
        -10,-20,-20,-20,-20,-20,-20,-10,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30
    };

    // King endgame: centralized is good
    public static readonly int[] KingEndTable = {
        -50,-30,-30,-30,-30,-30,-30,-50,
        -30,-30,  0,  0,  0,  0,-30,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-20,-10,  0,  0,-10,-20,-30,
        -50,-40,-30,-20,-20,-30,-40,-50
    };

    /// <summary>
    /// Read a positional value from a table, flipping for black.
    /// </summary>
    public static int ReadTable(int[] table, int square, bool isWhite)
    {
        int idx = square;
        if (!isWhite)
        {
            int file = square % 8;
            int rank = square / 8;
            idx = (7 - rank) * 8 + file;
        }
        return table[idx];
    }

    /// <summary>Get the appropriate middlegame table for a piece type</summary>
    public static int[] GetMgTable(int pieceType) => pieceType switch
    {
        Piece.Pawn => PawnTable,
        Piece.Knight => KnightTable,
        Piece.Bishop => BishopTable,
        Piece.Rook => RookTable,
        Piece.Queen => QueenTable,
        Piece.King => KingMiddleTable,
        _ => Array.Empty<int>()
    };

    /// <summary>Get the appropriate endgame table for a piece type</summary>
    public static int[] GetEgTable(int pieceType) => pieceType switch
    {
        Piece.Pawn => PawnEndTable,
        Piece.Knight => KnightTable,
        Piece.Bishop => BishopTable,
        Piece.Rook => RookTable,
        Piece.Queen => QueenTable,
        Piece.King => KingEndTable,
        _ => Array.Empty<int>()
    };

    /// <summary>Get the appropriate table for a piece type (legacy compat)</summary>
    public static int[] GetTable(int pieceType, bool isEndgame) =>
        isEndgame ? GetEgTable(pieceType) : GetMgTable(pieceType);
}
