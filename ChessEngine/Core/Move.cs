namespace ChessEngine.Core;

public readonly struct Move : IEquatable<Move>
{
    public readonly ushort RawValue;

    // Flags
    public const int FlagNone = 0;
    public const int FlagEnPassant = 1;
    public const int FlagCastle = 2;
    public const int FlagDoublePush = 3;
    public const int FlagPromoteQueen = 4;
    public const int FlagPromoteRook = 5;
    public const int FlagPromoteBishop = 6;
    public const int FlagPromoteKnight = 7;

    public Move(ushort rawValue) => RawValue = rawValue;

    public Move(int origin, int destination, int flag = FlagNone)
    {
        RawValue = (ushort)(origin | (destination << 6) | (flag << 12));
    }

    public int Origin => RawValue & 0x3F;
    public int Destination => (RawValue >> 6) & 0x3F;
    public int Flag => (RawValue >> 12) & 0xF;

    public bool IsPromotion => Flag >= FlagPromoteQueen && Flag <= FlagPromoteKnight;
    public bool IsNull => RawValue == 0;
    public bool IsCastle => Flag == FlagCastle;
    public bool IsEnPassant => Flag == FlagEnPassant;

    public int PromotionPieceType => Flag switch
    {
        FlagPromoteQueen => Piece.Queen,
        FlagPromoteRook => Piece.Rook,
        FlagPromoteBishop => Piece.Bishop,
        FlagPromoteKnight => Piece.Knight,
        _ => Piece.Empty
    };

    public static readonly Move Null = new(0);

    public string ToAlgebraic()
    {
        string promo = Flag switch
        {
            FlagPromoteQueen => "q",
            FlagPromoteRook => "r",
            FlagPromoteBishop => "b",
            FlagPromoteKnight => "n",
            _ => ""
        };
        return $"{Coord.FromIndex(Origin).ToAlgebraic()}{Coord.FromIndex(Destination).ToAlgebraic()}{promo}";
    }

    public override string ToString() => IsNull ? "null" : ToAlgebraic();
    public bool Equals(Move other) => RawValue == other.RawValue;
    public override bool Equals(object? obj) => obj is Move m && Equals(m);
    public override int GetHashCode() => RawValue;
    public static bool operator ==(Move a, Move b) => a.RawValue == b.RawValue;
    public static bool operator !=(Move a, Move b) => a.RawValue != b.RawValue;
}
