namespace ChessEngine.Search;

using System;
using ChessEngine.Core;

public sealed class TranspositionTable
{
    public const byte Exact = 0;
    public const byte LowerBound = 1;
    public const byte UpperBound = 2;

    public struct Entry
    {
        public ulong Key;
        public int Value;
        public short Depth;
        public byte Flag;
        public byte Generation;
        public Move BestMove;
    }

    private readonly Entry[] _table;
    private readonly int _size;
    private byte _generation;

    public TranspositionTable(int sizeInMb = 256)
    {
        // Entry is roughly 24-32 bytes
        int entrySize = 28;
        int entryCount = (sizeInMb * 1024 * 1024) / entrySize;

        // Power-of-two size for fast masking
        _size = 1;
        while (_size <= entryCount)
            _size <<= 1;
        _size >>= 1;

        _table = new Entry[_size];
    }

    private int GetIndex(ulong key) => (int)(key & (ulong)(_size - 1));

    /// <summary>Increment generation counter at the start of each new search</summary>
    public void IncrementGeneration() => _generation++;

    public void Store(ulong key, int value, int depth, byte flag, Move bestMove)
    {
        int index = GetIndex(key);
        ref Entry existing = ref _table[index];

        // Replacement strategy:
        // Always replace if: slot is empty, same position, deeper/equal search, or stale generation
        bool shouldReplace = existing.Key == 0
            || existing.Key == key
            || depth >= existing.Depth
            || existing.Generation != _generation;

        if (shouldReplace)
        {
            // Preserve existing best move if we don't have one and it's the same position
            Move moveToStore = bestMove;
            if (moveToStore.IsNull && existing.Key == key && !existing.BestMove.IsNull)
                moveToStore = existing.BestMove;

            existing = new Entry
            {
                Key = key,
                Value = value,
                Depth = (short)depth,
                Flag = flag,
                Generation = _generation,
                BestMove = moveToStore
            };
        }
    }

    public Entry? Lookup(ulong key)
    {
        int index = GetIndex(key);
        ref Entry entry = ref _table[index];

        if (entry.Key == key)
            return entry;

        return null;
    }

    public void Clear()
    {
        Array.Clear(_table, 0, _table.Length);
        _generation = 0;
    }
}
