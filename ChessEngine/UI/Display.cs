namespace ChessEngine.UI;

using System;
using System.Collections.Generic;
using ChessEngine.Core;

public static class Display
{
    private static string GetPieceArtLine(int piece, int lineIndex)
    {
        int type = Piece.PieceType(piece);
        if (type == Piece.Empty)
        {
            return "      ";
        }

        switch (type)
        {
            case Piece.Pawn:
                return lineIndex switch
                {
                    0 => "  ()  ",
                    1 => "  )(  ",
                    2 => " (__) ",
                    _ => "      "
                };
            case Piece.Knight:
                return lineIndex switch
                {
                    0 => "  /|  ",
                    1 => " /_|  ",
                    2 => " (___)",
                    _ => "      "
                };
            case Piece.Bishop:
                return lineIndex switch
                {
                    0 => "  /\\  ",
                    1 => " (()) ",
                    2 => " [____]",
                    _ => "      "
                };
            case Piece.Rook:
                return lineIndex switch
                {
                    0 => " [TT] ",
                    1 => " |  | ",
                    2 => " [____]",
                    _ => "      "
                };
            case Piece.Queen:
                return lineIndex switch
                {
                    0 => " \\^/^/",
                    1 => "  )(  ",
                    2 => " [____]",
                    _ => "      "
                };
            case Piece.King:
                return lineIndex switch
                {
                    0 => "  +   ",
                    1 => " \\___/",
                    2 => " [____]",
                    _ => "      "
                };
            default:
                return "      ";
        }
    }

    public static void ShowWelcomeMessage()
    {
        Console.Clear();
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine(@"
   =============================================
   *          BHOSDU ENGINE         *
   *        You (White) vs. AI (Black)       *
   =============================================
        ");
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine("Controls:");
        Console.WriteLine("  - Click on a White piece to select it and see legal moves.");
        Console.WriteLine("  - Click on a highlighted green square to move there.");
        Console.WriteLine("  - Click on the interactive HUD buttons below the board:");
        Console.WriteLine("    * [ Undo ]    (or press keyboard key 'U')");
        Console.WriteLine("    * [ Restart ] (or press keyboard key 'R')");
        Console.WriteLine("    * [ Quit ]    (or press keyboard key 'Q')");
        Console.WriteLine("\nPress any key to start...");
        Console.ReadKey(true);
    }

    private static ConsoleColor GetCellBgColor(int sqIndex, int selectedSquare, HashSet<int> targetSquares, bool isLightSquare)
    {
        if (sqIndex == selectedSquare)
        {
            return ConsoleColor.DarkYellow; // Selected square
        }
        if (targetSquares.Contains(sqIndex))
        {
            return ConsoleColor.DarkGreen; // Legal move target
        }
        return isLightSquare ? ConsoleColor.Gray : ConsoleColor.DarkGray;
    }

    public static void DrawBoard(Board board, int selectedSquare = -1, List<Move>? legalMoves = null)
    {
        var targetSquares = new HashSet<int>();
        if (legalMoves != null && selectedSquare != -1)
        {
            foreach (var m in legalMoves)
            {
                if (m.Origin == selectedSquare)
                    targetSquares.Add(m.Destination);
            }
        }

        Console.Clear();
        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("     A     B     C     D     E     F     G     H");
        Console.ResetColor();

        for (int rank = 7; rank >= 0; rank--)
        {
            for (int lineIndex = 0; lineIndex < 3; lineIndex++)
            {
                if (lineIndex == 1)
                {
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.Write($" {rank + 1} ");
                    Console.ResetColor();
                }
                else
                {
                    Console.Write("   ");
                }

                for (int file = 0; file < 8; file++)
                {
                    int sqIndex = rank * 8 + file;
                    int piece = board.Squares[sqIndex];
                    bool isLightSquare = (rank + file) % 2 != 0;

                    ConsoleColor bg = GetCellBgColor(sqIndex, selectedSquare, targetSquares, isLightSquare);
                    ConsoleColor fg = Piece.IsWhite(piece) ? ConsoleColor.White : ConsoleColor.Black;

                    // Adjust foreground for readability on different square colors
                    if (Piece.IsWhite(piece))
                    {
                        if (bg == ConsoleColor.Gray) fg = ConsoleColor.Blue;
                        else if (bg == ConsoleColor.DarkGray) fg = ConsoleColor.Cyan;
                    }
                    else
                    {
                        if (bg == ConsoleColor.DarkGray) fg = ConsoleColor.Red;
                        else if (bg == ConsoleColor.DarkGreen) fg = ConsoleColor.DarkRed;
                    }

                    Console.BackgroundColor = bg;
                    Console.ForegroundColor = fg;

                    string artLine = GetPieceArtLine(piece, lineIndex);
                    Console.Write(artLine);
                }

                Console.ResetColor();
                if (lineIndex == 1)
                {
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.WriteLine($" {rank + 1}");
                    Console.ResetColor();
                }
                else
                {
                    Console.WriteLine();
                }
            }
        }

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("     A     B     C     D     E     F     G     H");
        Console.ResetColor();
        Console.WriteLine();

        // Row 28 - Draw beautiful interactive buttons!
        Console.Write("    "); // 4 spaces padding

        Console.ForegroundColor = ConsoleColor.DarkCyan;
        Console.Write("[");
        Console.ForegroundColor = ConsoleColor.Green;
        Console.Write(" Undo (U) ");
        Console.ForegroundColor = ConsoleColor.DarkCyan;
        Console.Write("]    [");
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.Write(" Restart (R) ");
        Console.ForegroundColor = ConsoleColor.DarkCyan;
        Console.Write("]    [");
        Console.ForegroundColor = ConsoleColor.Red;
        Console.Write(" Quit (Q) ");
        Console.ForegroundColor = ConsoleColor.DarkCyan;
        Console.Write("]");
        Console.ResetColor();
        Console.WriteLine();
        Console.WriteLine();
    }
}
