namespace ChessEngine.Core;

/// <summary>
/// Snapshot of reversible board state, pushed before each move for undo support.
/// </summary>
public sealed record GameState(
    int CapturedPiece,
    int CastleFlags,
    int EnPassantFile,
    int HalfMoveClock,
    ulong Hash
);
