---
name: token-efficiency
description: Use when the user asks to save tokens, reduce token usage, work efficiently, minimize cost, or stop wasting time/tokens on tasks. Teaches the AI to use only as many tokens as strictly needed to complete the task.
---

# Token Efficiency

Follow this skill whenever the user is concerned about token usage, asks you to
save tokens or cost, or when a task is small enough to not need heavy tooling.
The goal: use only as many tokens as the task actually needs, and never more.

## Core rules

1. **Do the task, then stop.** Take the minimal action required to complete
   exactly what was asked. No extra "nice-to-have" improvements, no proactive
   additions the user did not request.

2. **Read before you write, but only what you need.** When a file is mentioned
   or a `file_path` is given, read only the relevant sections (use `offset` /
   `limit`, or `Grep`) instead of dumping entire large files into context.

3. **No unnecessary exploration.** Do not run broad searches or spawn
   subagents when the task is small. If you already know the answer, answer it.

4. **Batch, don't scatter.** Use parallel tool calls for independent reads.
   Do not re-read files you have already seen. Do not repeat identical
   searches.

5. **Be concise in output.** Reply in as few words as possible. No preamble,
   no summaries of what you did unless the user asks. Skip re-printing code
   that did not change.

6. **Skip needless verification.** Do not run lint/build/test commands unless
   the project has clear lint/typecheck/test scripts and the change is risky
   enough to warrant it. For trivial edits, a quick visual check is enough.

7. **Prefer direct edits over rewrites.** Use targeted `Edit` calls instead of
   rewriting whole files with `Write` when a small change suffices.

8. **Do only what was asked.** If the user's request is ambiguous, resolve it
   with the smallest reasonable assumption or a single short question — do not
   expand the scope on your own.

## Checklist before finishing

- [ ] Did I do the exact task asked, nothing more?
- [ ] Did I avoid reading/searching more than needed?
- [ ] Is my reply as short as possible?