namespace ChessEngine;

using System;
using System.Collections.Generic;
using ChessEngine.Core;
using ChessEngine.MoveGeneration;
using ChessEngine.Search;
using ChessEngine.UI;

internal class Program
{
    private static void Main(string[] args)
    {
        // Force Unicode support in the console
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        ConsoleInputHelper.EnableMouseInput();

        try
        {
            Display.ShowWelcomeMessage();

            bool sideChosen = false;
            bool playerIsWhite = true;

            while (!sideChosen)
            {
                var choice = ConsoleInputHelper.GetSideChoice();
                if (choice == SideChoice.White)
                {
                    playerIsWhite = true;
                    Display.IsFlipped = false;
                    sideChosen = true;
                }
                else if (choice == SideChoice.Black)
                {
                    playerIsWhite = false;
                    Display.IsFlipped = true;
                    sideChosen = true;
                }
                else if (choice == SideChoice.Quit)
                {
                    return;
                }
                System.Threading.Thread.Sleep(20);
            }

            var board = new Board();
            board.SetupStartingPosition();

            var searcher = new SearchEngine();
            
            // Track move history for undoing
            var moveHistory = new Stack<Move>();

            int selectedSquare = -1;

            while (true)
            {
                var legalMoves = MoveGenerator.GenerateLegalMoves(board);

                // Redraw the board
                Display.DrawBoard(board, selectedSquare, legalMoves);

                // Announce checks or game status
                if (board.IsInCheck())
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("  [!] Check!");
                    Console.ResetColor();
                }

                // Game over checks
                if (legalMoves.Count == 0)
                {
                    if (board.IsInCheck())
                    {
                        Console.ForegroundColor = ConsoleColor.Red;
                        string winnerName;
                        if (board.WhiteToMove)
                        {
                            winnerName = playerIsWhite ? "AI (Black)" : "Human (Black)";
                        }
                        else
                        {
                            winnerName = playerIsWhite ? "Human (White)" : "AI (White)";
                        }
                        Console.WriteLine($"  [#] Checkmate! {winnerName} wins!");
                    }
                    else
                    {
                        Console.ForegroundColor = ConsoleColor.Yellow;
                        Console.WriteLine("  [=] Stalemate! The game is a draw.");
                    }
                    Console.ResetColor();
                    Console.WriteLine("\n  Press 'r' to restart or any other key to exit.");
                    
                    var keyChar = '\0';
                    while (keyChar == '\0')
                    {
                        var ev = ConsoleInputHelper.GetInput();
                        if (ev.Type == InputType.Quit) return;
                        if (ev.Type == InputType.Restart) { keyChar = 'r'; break; }
                        if (ev.KeyChar != '\0') { keyChar = ev.KeyChar; break; }
                        System.Threading.Thread.Sleep(20);
                    }
                    if (char.ToLower(keyChar) == 'r')
                    {
                        Display.ShowWelcomeMessage();
                        sideChosen = false;
                        while (!sideChosen)
                        {
                            var choice = ConsoleInputHelper.GetSideChoice();
                            if (choice == SideChoice.White)
                            {
                                playerIsWhite = true;
                                Display.IsFlipped = false;
                                sideChosen = true;
                            }
                            else if (choice == SideChoice.Black)
                            {
                                playerIsWhite = false;
                                Display.IsFlipped = true;
                                sideChosen = true;
                            }
                            else if (choice == SideChoice.Quit)
                            {
                                return;
                            }
                            System.Threading.Thread.Sleep(20);
                        }

                        board.SetupStartingPosition();
                        moveHistory.Clear();
                        selectedSquare = -1;
                        continue;
                    }
                    break;
                }

                if (board.HalfMoveClock >= 100)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine("  [=] Draw by 50-move rule!");
                    Console.ResetColor();
                    break;
                }

                // Turn info
                if (board.WhiteToMove == playerIsWhite)
                {
                    bool moveMade = false;

                    while (!moveMade)
                    {
                        Console.SetCursorPosition(0, 31);
                        Console.ForegroundColor = ConsoleColor.Green;
                        string sideName = playerIsWhite ? "White" : "Black";
                        Console.Write($"  Your Move ({sideName}) > [Click squares to select and move]");
                        Console.Write(new string(' ', 15)); // Clear the rest of the line
                        Console.ResetColor();

                        var inputEvent = ConsoleInputHelper.GetInput();
                        if (inputEvent.Type == InputType.None)
                        {
                            System.Threading.Thread.Sleep(20);
                            continue;
                        }

                        if (inputEvent.Type == InputType.Quit)
                        {
                            return;
                        }

                        if (inputEvent.Type == InputType.Theme)
                        {
                            // Cycle theme: NeoAscii -> Classic -> Letters -> NeoAscii
                            Display.CurrentTheme = Display.CurrentTheme switch
                            {
                                PieceTheme.NeoAscii => PieceTheme.Classic,
                                PieceTheme.Classic => PieceTheme.Letters,
                                PieceTheme.Letters => PieceTheme.NeoAscii,
                                _ => PieceTheme.NeoAscii
                            };
                            break; // exit loop to redraw immediately
                        }

                        if (inputEvent.Type == InputType.Undo)
                        {
                            if (moveHistory.Count >= 2)
                            {
                                var aiMove = moveHistory.Pop();
                                board.UndoMove(aiMove);

                                var humanMove = moveHistory.Pop();
                                board.UndoMove(humanMove);

                                selectedSquare = -1;
                            }
                            else
                            {
                                Console.SetCursorPosition(0, 31);
                                Console.ForegroundColor = ConsoleColor.Red;
                                Console.Write("  No moves to undo!                     ");
                                Console.ResetColor();
                                System.Threading.Thread.Sleep(1000);
                            }
                            break; // exit loop to redraw board
                        }

                        if (inputEvent.Type == InputType.Restart)
                        {
                            Display.ShowWelcomeMessage();
                            sideChosen = false;
                            while (!sideChosen)
                            {
                                var choice = ConsoleInputHelper.GetSideChoice();
                                if (choice == SideChoice.White)
                                {
                                    playerIsWhite = true;
                                    Display.IsFlipped = false;
                                    sideChosen = true;
                                }
                                else if (choice == SideChoice.Black)
                                {
                                    playerIsWhite = false;
                                    Display.IsFlipped = true;
                                    sideChosen = true;
                                }
                                else if (choice == SideChoice.Quit)
                                {
                                    return;
                                }
                                System.Threading.Thread.Sleep(20);
                            }

                            board.SetupStartingPosition();
                            moveHistory.Clear();
                            selectedSquare = -1;
                            break; // exit loop to redraw board
                        }

                        if (inputEvent.Type == InputType.SquareClick)
                        {
                            int sq = inputEvent.SquareIndex;
                            int piece = board.Squares[sq];

                            // Clicked on friendly piece -> select it
                            bool isFriendlyPiece = piece != Piece.Empty && 
                                ((playerIsWhite && Piece.IsWhite(piece)) || (!playerIsWhite && Piece.IsBlack(piece)));

                            if (isFriendlyPiece)
                            {
                                selectedSquare = sq;
                                break; // exit loop to redraw board
                            }

                            // Clicked somewhere else while we have a piece selected
                            if (selectedSquare != -1)
                            {
                                Move? chosenMove = null;
                                foreach (var m in legalMoves)
                                {
                                    if (m.Origin == selectedSquare && m.Destination == sq)
                                    {
                                        chosenMove = m;
                                        break;
                                    }
                                }

                                if (chosenMove.HasValue)
                                {
                                    var moveVal = chosenMove.Value;
                                    if (moveVal.IsPromotion)
                                    {
                                        Console.SetCursorPosition(0, 31);
                                        Console.ForegroundColor = ConsoleColor.Magenta;
                                        Console.Write("  [?] Promotion! Press key: (Q)ueen, (R)ook, (B)ishop, (K)night > ");
                                        Console.ResetColor();

                                        char promoChar = 'q';
                                        bool promoSelected = false;
                                        while (!promoSelected)
                                        {
                                            var keyEvent = ConsoleInputHelper.GetInput();
                                            if (keyEvent.Type == InputType.Quit) return;
                                            if (keyEvent.KeyChar != '\0')
                                            {
                                                char c = char.ToLower(keyEvent.KeyChar);
                                                if (c is 'q' or 'r' or 'b' or 'n')
                                                {
                                                    promoChar = c;
                                                    promoSelected = true;
                                                }
                                            }
                                            System.Threading.Thread.Sleep(20);
                                        }

                                        int expectedType = promoChar switch
                                        {
                                            'q' => Piece.Queen,
                                            'r' => Piece.Rook,
                                            'b' => Piece.Bishop,
                                            'n' => Piece.Knight,
                                            _ => Piece.Queen
                                        };

                                        foreach (var m in legalMoves)
                                        {
                                            if (m.Origin == selectedSquare && m.Destination == sq && m.PromotionPieceType == expectedType)
                                            {
                                                moveVal = m;
                                                break;
                                            }
                                        }
                                    }

                                    board.ExecuteMove(moveVal);
                                    moveHistory.Push(moveVal);
                                    selectedSquare = -1;
                                    moveMade = true;
                                }
                                else
                                {
                                    // Invalid square clicked -> reset selection
                                    selectedSquare = -1;
                                    break;
                                }
                            }
                        }
                    }
                }
                else
                {
                    // AI turn (White or Black depending on side selection)
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    string aiColorStr = playerIsWhite ? "Black" : "White";
                    Console.WriteLine($"  AI ({aiColorStr}) is thinking...");
                    Console.ResetColor();

                    var result = searcher.GetBestMove(board, 5000);

                    if (!result.move.IsNull)
                    {
                        board.ExecuteMove(result.move);
                        moveHistory.Push(result.move);
                        
                        Console.ForegroundColor = ConsoleColor.Yellow;
                        string evalStr;
                        if (Math.Abs(result.score) > 90000)
                        {
                            int mateDist = (100000 - Math.Abs(result.score) + 1) / 2;
                            evalStr = result.score > 0 ? $"Mate in {mateDist}" : $"Mated in {mateDist}";
                        }
                        else
                        {
                            evalStr = $"{result.score / 100.0:+0.00;-0.00}";
                        }
                        Console.WriteLine($"  AI played: {result.move} (eval: {evalStr}, depth: {result.depth} plies)");
                        if (!string.IsNullOrEmpty(result.pv))
                        {
                            Console.ForegroundColor = ConsoleColor.DarkGray;
                            Console.WriteLine($"  PV: {result.pv}");
                        }
                        Console.ResetColor();
                        System.Threading.Thread.Sleep(1500);
                    }
                    else
                    {
                        break;
                    }
                }
            }
        }
        finally
        {
            ConsoleInputHelper.RestoreConsoleMode();
        }

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("\n  Thank you for playing!");
        Console.ResetColor();
    }
}
