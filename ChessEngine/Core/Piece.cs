namespace ChessEngine.Core;

public static class Piece
{
    // Piece type values
    public const int Empty = 0;
    public const int Pawn = 1;
    public const int Knight = 2;
    public const int Bishop = 3;
    public const int Rook = 4;
    public const int Queen = 5;
    public const int King = 6;

    // Color flags (bits 3-4)
    public const int White = 8;
    public const int Black = 16;

    // Masks
    public const int TypeMask = 0b00111;
    public const int ColorMask = 0b11000;

    public static int GetPieceType(int piece) => piece & TypeMask;
    public static int GetColor(int piece) => piece & ColorMask;
    public static bool IsWhite(int piece) => (piece & ColorMask) == White;
    public static bool IsBlack(int piece) => (piece & ColorMask) == Black;
    public static bool IsColor(int piece, int color) => (piece & ColorMask) == color;
    public static bool IsSlidingPiece(int piece) => GetPieceType(piece) is Bishop or Rook or Queen;
    public static bool IsEmpty(int piece) => piece == Empty;

    public static int MakePiece(int type, int color) => type | color;

    // For display purposes
    public static char GetSymbol(int piece) => GetPieceType(piece) switch
    {
        Pawn => IsWhite(piece) ? 'P' : 'p',
        Knight => IsWhite(piece) ? 'N' : 'n',
        Bishop => IsWhite(piece) ? 'B' : 'b',
        Rook => IsWhite(piece) ? 'R' : 'r',
        Queen => IsWhite(piece) ? 'Q' : 'q',
        King => IsWhite(piece) ? 'K' : 'k',
        _ => '.'
    };

    public static int FromSymbol(char c) => char.ToLower(c) switch
    {
        'p' => Pawn | (char.IsUpper(c) ? White : Black),
        'n' => Knight | (char.IsUpper(c) ? White : Black),
        'b' => Bishop | (char.IsUpper(c) ? White : Black),
        'r' => Rook | (char.IsUpper(c) ? White : Black),
        'q' => Queen | (char.IsUpper(c) ? White : Black),
        'k' => King | (char.IsUpper(c) ? White : Black),
        _ => Empty
    };
}
