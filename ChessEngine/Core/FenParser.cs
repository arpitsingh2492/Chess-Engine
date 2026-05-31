namespace ChessEngine.Core;

using System;

public static class FenParser
{
    public const string StartingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    public static void LoadFen(Board board, string fen)
    {
        // Clear board
        Array.Clear(board.Squares, 0, board.Squares.Length);
        foreach (var list in board.PieceLists)
            list.Clear();

        string[] parts = fen.Split(' ');
        string placement = parts[0];

        // Parse piece placement (rank 8 first, rank 1 last in FEN)
        int file = 0, rank = 7;
        foreach (char c in placement)
        {
            if (c == '/')
            {
                file = 0;
                rank--;
            }
            else if (char.IsDigit(c))
            {
                file += c - '0';
            }
            else
            {
                int piece = Piece.FromSymbol(c);
                int sq = rank * 8 + file;
                board.Squares[sq] = piece;

                if (piece < board.PieceLists.Length)
                    board.PieceLists[piece].Add(sq);

                if (Piece.GetPieceType(piece) == Piece.King)
                {
                    board.KingSquares[Piece.IsWhite(piece) ? 0 : 1] = sq;
                }

                file++;
            }
        }

        // Side to move
        board.WhiteToMove = parts.Length > 1 ? parts[1] == "w" : true;

        // Castling rights
        board.CastleFlags = 0;
        if (parts.Length > 2)
        {
            string castling = parts[2];
            if (castling.Contains('K')) board.CastleFlags |= Board.CastleWK;
            if (castling.Contains('Q')) board.CastleFlags |= Board.CastleWQ;
            if (castling.Contains('k')) board.CastleFlags |= Board.CastleBK;
            if (castling.Contains('q')) board.CastleFlags |= Board.CastleBQ;
        }

        // En passant
        board.EnPassantFile = -1;
        if (parts.Length > 3 && parts[3] != "-")
        {
            board.EnPassantFile = parts[3][0] - 'a';
        }

        // Half-move clock
        board.HalfMoveClock = parts.Length > 4 ? int.Parse(parts[4]) : 0;

        // Full move number
        board.FullMoveNumber = parts.Length > 5 ? int.Parse(parts[5]) : 1;
    }

    public static string ToFen(Board board)
    {
        var sb = new System.Text.StringBuilder();

        // Piece placement
        for (int rank = 7; rank >= 0; rank--)
        {
            int emptyCount = 0;
            for (int file = 0; file < 8; file++)
            {
                int piece = board.Squares[rank * 8 + file];
                if (piece == Piece.Empty)
                {
                    emptyCount++;
                }
                else
                {
                    if (emptyCount > 0) { sb.Append(emptyCount); emptyCount = 0; }
                    sb.Append(Piece.GetSymbol(piece));
                }
            }
            if (emptyCount > 0) sb.Append(emptyCount);
            if (rank > 0) sb.Append('/');
        }

        sb.Append(board.WhiteToMove ? " w " : " b ");

        // Castling
        string castle = "";
        if ((board.CastleFlags & Board.CastleWK) != 0) castle += "K";
        if ((board.CastleFlags & Board.CastleWQ) != 0) castle += "Q";
        if ((board.CastleFlags & Board.CastleBK) != 0) castle += "k";
        if ((board.CastleFlags & Board.CastleBQ) != 0) castle += "q";
        sb.Append(castle.Length > 0 ? castle : "-");

        // En passant
        if (board.EnPassantFile >= 0)
        {
            int epRank = board.WhiteToMove ? 5 : 2;
            sb.Append($" {(char)('a' + board.EnPassantFile)}{epRank + 1}");
        }
        else
        {
            sb.Append(" -");
        }

        sb.Append($" {board.HalfMoveClock} {board.FullMoveNumber}");

        return sb.ToString();
    }
}
