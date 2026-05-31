namespace ChessEngine.UI;

using System;
using System.Runtime.InteropServices;

public enum InputType
{
    SquareClick,
    Undo,
    Restart,
    Quit,
    Theme,
    None
}

public enum SideChoice
{
    White,
    Black,
    Quit,
    None
}

public struct ChessInputEvent
{
    public InputType Type;
    public int SquareIndex;
    public char KeyChar;
}

public static class ConsoleInputHelper
{
    private const int STD_INPUT_HANDLE = -10;
    private const uint ENABLE_MOUSE_INPUT = 0x0010;
    private const uint ENABLE_EXTENDED_FLAGS = 0x0080;
    private const uint ENABLE_QUICK_EDIT_MODE = 0x0040;

    private static IntPtr _hStdIn;
    private static uint _originalMode;
    private static bool _isWindows;

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GetStdHandle(int nStdHandle);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern bool ReadConsoleInput(IntPtr hConsoleInput, [Out] INPUT_RECORD[] lpBuffer, uint nLength, out uint lpNumberOfEventsRead);

    [StructLayout(LayoutKind.Sequential)]
    private struct COORD
    {
        public short X;
        public short Y;
    }

    [StructLayout(LayoutKind.Explicit)]
    private struct INPUT_RECORD
    {
        [FieldOffset(0)]
        public ushort EventType;
        [FieldOffset(4)]
        public KEY_EVENT_RECORD KeyEvent;
        [FieldOffset(4)]
        public MOUSE_EVENT_RECORD MouseEvent;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct KEY_EVENT_RECORD
    {
        public int bKeyDown;
        public ushort wRepeatCount;
        public ushort wVirtualKeyCode;
        public ushort wVirtualScanCode;
        public char UnicodeChar;
        public uint dwControlKeyState;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MOUSE_EVENT_RECORD
    {
        public COORD dwMousePosition;
        public uint dwButtonState;
        public uint dwControlKeyState;
        public uint dwEventFlags;
    }

    static ConsoleInputHelper()
    {
        _isWindows = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
    }

    public static void EnableMouseInput()
    {
        if (!_isWindows) return;

        try
        {
            _hStdIn = GetStdHandle(STD_INPUT_HANDLE);
            if (GetConsoleMode(_hStdIn, out _originalMode))
            {
                // Disable quick edit (intercepts mouse clicks for text selection)
                // and enable mouse input
                uint newMode = _originalMode;
                newMode &= ~ENABLE_QUICK_EDIT_MODE;
                newMode |= ENABLE_MOUSE_INPUT;
                newMode |= ENABLE_EXTENDED_FLAGS;

                SetConsoleMode(_hStdIn, newMode);
            }
        }
        catch
        {
            // Fallback gracefully
        }
    }

    public static void RestoreConsoleMode()
    {
        if (!_isWindows) return;

        try
        {
            if (_hStdIn != IntPtr.Zero)
            {
                SetConsoleMode(_hStdIn, _originalMode);
            }
        }
        catch
        {
            // Fail silently
        }
    }

    public static SideChoice GetSideChoice()
    {
        if (!_isWindows)
        {
            if (Console.KeyAvailable)
            {
                char key = char.ToLower(Console.ReadKey(true).KeyChar);
                if (key == 'w') return SideChoice.White;
                if (key == 'b') return SideChoice.Black;
                if (key == 'q') return SideChoice.Quit;
            }
            System.Threading.Thread.Sleep(50);
            return SideChoice.None;
        }

        try
        {
            var buffer = new INPUT_RECORD[1];
            uint eventsRead = 0;

            if (ReadConsoleInput(_hStdIn, buffer, 1, out eventsRead) && eventsRead > 0)
            {
                var record = buffer[0];

                if (record.EventType == 0x0002) // MOUSE_EVENT
                {
                    var mouse = record.MouseEvent;
                    if (mouse.dwEventFlags == 0 && (mouse.dwButtonState & 1) != 0)
                    {
                        int x = mouse.dwMousePosition.X;
                        int y = mouse.dwMousePosition.Y;

                        // Row 16 - Side Choice
                        if (y == 16)
                        {
                            if (x >= 5 && x <= 21)
                            {
                                return SideChoice.White;
                            }
                            if (x >= 28 && x <= 44)
                            {
                                return SideChoice.Black;
                            }
                        }
                    }
                }
                else if (record.EventType == 0x0001) // KEY_EVENT
                {
                    var key = record.KeyEvent;
                    if (key.bKeyDown != 0)
                    {
                        char c = char.ToLower(key.UnicodeChar);
                        if (c == 'w') return SideChoice.White;
                        if (c == 'b') return SideChoice.Black;
                        if (c == 'q') return SideChoice.Quit;
                    }
                }
            }
        }
        catch
        {
            if (Console.KeyAvailable)
            {
                char key = char.ToLower(Console.ReadKey(true).KeyChar);
                if (key == 'w') return SideChoice.White;
                if (key == 'b') return SideChoice.Black;
                if (key == 'q') return SideChoice.Quit;
            }
        }

        return SideChoice.None;
    }

    public static ChessInputEvent GetInput()
    {
        if (!_isWindows)
        {
            if (Console.KeyAvailable)
            {
                var key = Console.ReadKey(true);
                return ParseKey(key.KeyChar);
            }
            System.Threading.Thread.Sleep(50);
            return new ChessInputEvent { Type = InputType.None };
        }

        try
        {
            var buffer = new INPUT_RECORD[1];
            uint eventsRead = 0;

            if (ReadConsoleInput(_hStdIn, buffer, 1, out eventsRead) && eventsRead > 0)
            {
                var record = buffer[0];

                // 1. Handle mouse click
                if (record.EventType == 0x0002) // MOUSE_EVENT
                {
                    var mouse = record.MouseEvent;
                    if (mouse.dwEventFlags == 0 && (mouse.dwButtonState & 1) != 0)
                    {
                        int x = mouse.dwMousePosition.X;
                        int y = mouse.dwMousePosition.Y;

                        // Check board bounds
                        if (x >= 3 && x <= 50 && y >= 2 && y <= 25)
                        {
                            int fileRaw = (x - 3) / 6;
                            int rankRaw = 7 - (y - 2) / 3;

                            int file = Display.IsFlipped ? 7 - fileRaw : fileRaw;
                            int rank = Display.IsFlipped ? 7 - rankRaw : rankRaw;

                            if (file >= 0 && file <= 7 && rank >= 0 && rank <= 7)
                            {
                                int sq = rank * 8 + file;
                                return new ChessInputEvent { Type = InputType.SquareClick, SquareIndex = sq };
                            }
                        }

                        // Check button bounds (Row 28)
                        if (y == 28)
                        {
                            if (x >= 4 && x <= 15)
                            {
                                return new ChessInputEvent { Type = InputType.Undo };
                            }
                            if (x >= 20 && x <= 34)
                            {
                                return new ChessInputEvent { Type = InputType.Restart };
                            }
                            if (x >= 39 && x <= 50)
                            {
                                return new ChessInputEvent { Type = InputType.Quit };
                            }
                            if (x >= 55 && x <= 80)
                            {
                                return new ChessInputEvent { Type = InputType.Theme };
                            }
                        }
                    }
                }
                // 2. Handle key press
                else if (record.EventType == 0x0001) // KEY_EVENT
                {
                    var key = record.KeyEvent;
                    if (key.bKeyDown != 0)
                    {
                        return ParseKey(key.UnicodeChar);
                    }
                }
            }
        }
        catch
        {
            if (Console.KeyAvailable)
            {
                var key = Console.ReadKey(true);
                return ParseKey(key.KeyChar);
            }
        }

        return new ChessInputEvent { Type = InputType.None };
    }

    private static ChessInputEvent ParseKey(char keyChar)
    {
        char lower = char.ToLower(keyChar);
        if (lower == 'u')
        {
            return new ChessInputEvent { Type = InputType.Undo, KeyChar = keyChar };
        }
        if (lower == 'r')
        {
            return new ChessInputEvent { Type = InputType.Restart, KeyChar = keyChar };
        }
        if (lower == 't')
        {
            return new ChessInputEvent { Type = InputType.Theme, KeyChar = keyChar };
        }
        if (lower is 'q' or 'e') // e for exit
        {
            return new ChessInputEvent { Type = InputType.Quit, KeyChar = keyChar };
        }

        return new ChessInputEvent { Type = InputType.None, KeyChar = keyChar };
    }
}
