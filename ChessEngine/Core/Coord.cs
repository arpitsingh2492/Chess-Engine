namespace ChessEngine.Core;

public readonly struct Coord
{
    public readonly int File; // 0=a, 7=h
    public readonly int Rank; // 0=1, 7=8

    public Coord(int file, int rank) { File = file; Rank = rank; }

    public int SquareIndex => Rank * 8 + File;

    public static Coord FromIndex(int index) => new(index % 8, index / 8);

    public static Coord FromAlgebraic(string s) => new(s[0] - 'a', s[1] - '1');

    public string ToAlgebraic() => $"{(char)('a' + File)}{Rank + 1}";

    public bool IsValid => File >= 0 && File < 8 && Rank >= 0 && Rank < 8;

    public override string ToString() => ToAlgebraic();
}
