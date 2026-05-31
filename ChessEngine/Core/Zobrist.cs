namespace ChessEngine.Core;

/// <summary>
/// Zobrist hashing: assigns random 64-bit numbers to each (piece, square) pair,
/// plus side-to-move, castling rights, and en passant file.
/// The board hash is the XOR of all applicable keys.
/// </summary>
public static class Zobrist
{
    // [pieceType 0..6][color 0..1][square 0..63]
    // Flattened indices: 0-6 white pieces, 7-13 black pieces
    public static readonly ulong[,] PieceKeys = new ulong[14, 64]; 
    public static readonly ulong SideToMoveKey;
    public static readonly ulong[] CastleKeys = new ulong[16]; // 4-bit castle rights -> 16 combinations
    public static readonly ulong[] EnPassantKeys = new ulong[9]; // files 0-7 + index 8 for 'none'

    static Zobrist()
    {
        var rng = new Random(29426853); // fixed seed for reproducibility

        for (int p = 0; p < 14; p++)
            for (int sq = 0; sq < 64; sq++)
                PieceKeys[p, sq] = NextUlong(rng);

        SideToMoveKey = NextUlong(rng);

        for (int i = 0; i < 16; i++)
            CastleKeys[i] = NextUlong(rng);

        for (int i = 0; i < 9; i++)
            EnPassantKeys[i] = NextUlong(rng);
    }

    /// <summary>Get the Zobrist index for a colored piece (0-13)</summary>
    public static int PieceIndex(int piece)
    {
        int type = Piece.GetPieceType(piece);
        int offset = Piece.IsBlack(piece) ? 7 : 0;
        return type + offset;
    }

    /// <summary>Compute full hash from scratch for a board</summary>
    public static ulong ComputeHash(int[] squares, bool whiteToMove, int castleFlags, int enPassantFile)
    {
        ulong hash = 0;

        for (int sq = 0; sq < 64; sq++)
        {
            int piece = squares[sq];
            if (piece != Piece.Empty)
                hash ^= PieceKeys[PieceIndex(piece), sq];
        }

        if (!whiteToMove)
            hash ^= SideToMoveKey;

        hash ^= CastleKeys[castleFlags & 0xF];
        hash ^= EnPassantKeys[enPassantFile < 0 ? 8 : enPassantFile];

        return hash;
    }

    private static ulong NextUlong(Random rng)
    {
        byte[] buf = new byte[8];
        rng.NextBytes(buf);
        return BitConverter.ToUInt64(buf, 0);
    }
}
