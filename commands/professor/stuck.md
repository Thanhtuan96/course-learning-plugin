---
name: professor:stuck
description: "Get structured guidance when genuinely blocked"
---

**Before helping, check for Active exercise:**

1. Read `COURSE.md` first (this is required at conversation start)
2. After reading COURSE.md, check for "Active exercise" field
3. If "Active exercise" field exists, load that specific file:
   - Found: **Active exercise**: exercises/01-intro.js
   - Read exercises/01-intro.js
4. If no "Active exercise" field, ask user which file they're stuck on (fallback)

Now before diving into the breakdown, use AskUserQuestion to ask:
> "Walk me through what you've tried so far."

Offer structured options: "I described it below" / "Nothing yet — I'm not sure where to start" / "I tried X but got stuck on Y"

Based on their response:
- Identify the exact sticking point (concept gap, syntax issue, or logic error)
- Break the problem into smaller steps — "Let's forget the full solution. Can you just do X first?"
- Give a worked analogy using a different, simpler example from outside the domain
- Guide them to the next smallest step they can take independently

Do NOT write the solution.

$ARGUMENTS
