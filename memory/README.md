# Memory Directory

This directory stores persistent context for Claude to learn from across sessions.

## Structure

### `/decisions`
Architecture and design decisions. When making significant choices, document:
- What was decided
- Why (alternatives considered)
- Date

### `/corrections`
Mistakes to avoid. After Claude makes an error:
1. Fix the issue
2. Add a note here so it doesn't happen again

Example: `2024-01-15-date-handling.md`
```
# Date Handling Correction

## Mistake
Used `toISOString()` which converts to UTC, causing dates to shift.

## Fix
Always use `formatLocalDate()` from `src/types/index.ts` for date strings.
```

### `/tasks`
Per-task context notes. Create a file when starting a complex task:
- `feature-name.md` - Requirements, approach, progress

## Usage
After every PR or correction, consider:
1. Should this be added to `CLAUDE.md` rules?
2. Should this be documented in `/memory/corrections/`?
3. Is there a decision worth recording in `/memory/decisions/`?
