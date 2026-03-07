---
name: professor:hint
description: "Get the next hint layer without revealing the answer"
---

**Before giving hints, check for Active exercise:**

1. Read `COURSE.md` first (this is required at conversation start)
2. After reading COURSE.md, check for "Active exercise" field
3. If "Active exercise" field exists, load that specific file:
   - Found: **Active exercise**: exercises/01-intro.js
   - Read exercises/01-intro.js
4. If no "Active exercise" field, ask user which file to provide hints for (fallback)

Now give the next hint layer for the current exercise.

Infer the correct layer from the conversation history — count how many times `professor:hint` has been called this session for the current section. The layer logic and definitions are in the agent body (agents/professor.md).

Do not skip layers. Start from Layer 1 unless the user has already received it this session.

If the user asks for a 4th hint, do not provide one. Suggest `professor:stuck` instead.

$ARGUMENTS
