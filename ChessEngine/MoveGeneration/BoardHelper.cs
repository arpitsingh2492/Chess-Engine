namespace ChessEngine.MoveGeneration;

using System;
using System.Collections.Generic;
using ChessEngine.Core;

/// <summary>
/// Precomputes and caches static board topology data used during move generation.
/// </summary>
public static class BoardHelper
{
    // Direction offsets: N, S, W, E, NW, NE, SW, SE
    // Index: 0=N(+8), 1=S(-8), 2=W(-1), 3=E(+1), 4=NW(+7), 5=NE(+9), 6=SW(-9), 7=SE(-7)
    public static readonly int[] Directions = { 8, -8, -1, 1, 7, 9, -9, -7 };

    // For each square, how many squares to each edge in each direction
    // [square, directionIndex]
    public static readonly int[,] DistToEdge = new int[64, 8];

    // Precomputed legal destination squares for knights/kings from each square
    public static readonly int[][] KnightTargets = new int[64][];
    public static readonly int[][] KingTargets = new int[64][];

    // Pawn attack squares: [square]
    public static readonly int[][] WhitePawnAttacks = new int[64][];
    public static readonly int[][] BlackPawnAttacks = new int[64][];

    static BoardHelper()
    {
        ComputeEdgeDistances();
        ComputeKnightTargets();
        ComputeKingTargets();
        ComputePawnAttacks();
    }

    private static void ComputeEdgeDistances()
    {
        for (int sq = 0; sq < 64; sq++)
        {
            int f = sq % 8;
            int r = sq / 8;

            int north = 7 - r;
            int south = r;
            int west = f;
            int east = 7 - f;

            DistToEdge[sq, 0] = north;
            DistToEdge[sq, 1] = south;
            DistToEdge[sq, 2] = west;
            DistToEdge[sq, 3] = east;
            DistToEdge[sq, 4] = Math.Min(north, west); // NW (+7)
            DistToEdge[sq, 5] = Math.Min(north, east); // NE (+9)
            DistToEdge[sq, 6] = Math.Min(south, west); // SW (-9)
            DistToEdge[sq, 7] = Math.Min(south, east); // SE (-7)
        }
    }

    private static void ComputeKnightTargets()
    {
        int[] knightJumps = { -17, -15, -10, -6, 6, 10, 15, 17 };
        for (int sq = 0; sq < 64; sq++)
        {
            var targets = new List<int>();
            int f = sq % 8;
            int r = sq / 8;

            foreach (int jump in knightJumps)
            {
                int dest = sq + jump;
                if (dest < 0 || dest >= 64) continue;
                int df = dest % 8;
                int dr = dest / 8;
                int fileDiff = Math.Abs(f - df);
                int rankDiff = Math.Abs(r - dr);
                if ((fileDiff == 1 && rankDiff == 2) || (fileDiff == 2 && rankDiff == 1))
                    targets.Add(dest);
            }
            KnightTargets[sq] = targets.ToArray();
        }
    }

    private static void ComputeKingTargets()
    {
        for (int sq = 0; sq < 64; sq++)
        {
            var targets = new List<int>();
            int f = sq % 8;
            int r = sq / 8;

            for (int df = -1; df <= 1; df++)
            {
                for (int dr = -1; dr <= 1; dr++)
                {
                    if (df == 0 && dr == 0) continue;
                    int nf = f + df, nr = r + dr;
                    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8)
                        targets.Add(nr * 8 + nf);
                }
            }
            KingTargets[sq] = targets.ToArray();
        }
    }

    private static void ComputePawnAttacks()
    {
        for (int sq = 0; sq < 64; sq++)
        {
            int f = sq % 8;
            int r = sq / 8;

            // White pawns attack diagonally forward (north)
            var whiteAtk = new List<int>();
            if (r < 7)
            {
                if (f > 0) whiteAtk.Add(sq + 7);
                if (f < 7) whiteAtk.Add(sq + 9);
            }
            WhitePawnAttacks[sq] = whiteAtk.ToArray();

            // Black pawns attack diagonally forward (south)
            var blackAtk = new List<int>();
            if (r > 0)
            {
                if (f > 0) blackAtk.Add(sq - 9);
                if (f < 7) blackAtk.Add(sq - 7);
            }
            BlackPawnAttacks[sq] = blackAtk.ToArray();
        }
    }
}
