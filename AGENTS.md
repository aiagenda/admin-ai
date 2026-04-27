# Repository agents (Cursor)

Human-facing guide (Hungarian): see **`docs/CURSOR_AGENTEK.md`**.

For the coding agent: **`/.cursor/rules/subagent-delegation.mdc`** defines when to delegate to Cursor background subagents (`explore`, `shell`, `deployment-expert`, `performance-optimizer`, `ai-architect`, `cursor-guide`, `generalPurpose`).

**How humans invoke help:** use **Agent / Composer** in Cursor, describe the goal, optionally ask for “explore first” or “check Vercel deploy”. The primary agent delegates internally where appropriate.
