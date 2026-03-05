# Testing Patterns

**Analysis Date:** 2026-03-05

## Codebase Type

This project is a **Claude Agent Skill** defined entirely in `professor-skill-v3/professor-skill/SKILL.md`. There is no compiled or interpreted source code. As a result:

- No automated test framework exists or applies
- No test files (`*.test.*`, `*.spec.*`) are present anywhere in the repository
- No test runner configuration (jest, vitest, pytest, etc.) is present
- The `.claude/package.json` contains only `{"type":"commonjs"}` with no test dependencies

---

## Current Test Coverage

**Automated tests:** None

**Manual / behavioral testing:** The skill is validated by interacting with it through a Claude surface (Claude.ai, Claude Code, API). Testing is conversational and manual.

---

## Validation Approach

The plan document (`.cursor/plans/Professor skill as Claude plugin-b9cbc254.plan.md`) describes a recommended validation step:

> "Validate: Confirm `professor-skill-v3/professor-skill/SKILL.md` has no XML in frontmatter and description ≤ 1024 chars."

This is the only documented verification check. It is a manual text-inspection step, not an automated test.

**What to check manually before deploying:**
1. YAML frontmatter `name` is lowercase, under 64 characters, no XML
2. `description` field is ≤ 1024 characters
3. Markdown body renders correctly in a standard Markdown viewer
4. All `profesor:*` command behaviors are documented with numbered steps

---

## Recommended Testing Approach (for future phases)

Since the skill is a natural-language instruction document, testing means **behavioral verification** against a live Claude instance. Recommended test checklist structure:

### Command Smoke Tests
| Command | Expected behavior |
|---------|------------------|
| `profesor:new-topic` | Asks for topic + level + background, creates COURSE.md + CAPSTONE.md |
| `profesor:next` | Generates LECTURE.md for first ⬜ section, updates COURSE.md status |
| `profesor:review` | Returns ✅ What's working, ❓ Socratic question, 💡 concept, ⏭️ next action |
| `profesor:done` | Asks for verbal explanation before marking ✅ Done |
| `profesor:hint` | Provides layer-appropriate hint (conceptual first) |
| `profesor:stuck` | Asks "walk me through what you've tried" before breaking down problem |
| `profesor:quiz` | Generates 5 questions appropriate to current level |
| `profesor:progress` | Reads COURSE.md and summarizes all statuses |
| `profesor:capstone` | Displays CAPSTONE.md contents |
| `profesor:capstone-review` | Blocked if sections incomplete; reviews full project if all ✅ Done |

### Guard / Boundary Tests
- Call `profesor:capstone-review` before completing all sections → expect refusal message
- Ask "just give me the answer" → expect Socratic deflection
- Ask for code during capstone → expect refusal with `profesor:discuss` redirect
- Request 4th hint layer → expect redirect to `profesor:stuck`

### State Integrity Tests
- Verify COURSE.md is updated (not recreated) after `profesor:done`
- Verify LECTURE.md is overwritten (not appended) on each `profesor:next`
- Verify CAPSTONE.md is never modified after initial creation

---

## Test Infrastructure

**None currently present.** To add lightweight validation:

- `scripts/validate-skill.sh` — script to check frontmatter constraints (description length, no XML, name format)
- Manual behavioral test log — a Markdown checklist in `.planning/` tracking which commands have been verified against a live Claude instance

---

## Skill Format Compliance

The Anthropic Agent Skill format has two hard constraints that can be script-checked:

```bash
# Check description length (must be <= 1024 chars)
awk '/^description:/,/^[a-z]/' SKILL.md | wc -c

# Check name format (lowercase, no spaces, < 64 chars)
grep '^name:' SKILL.md
```

These can be run from `professor-skill-v3/professor-skill/SKILL.md`.

---

*Testing analysis: 2026-03-05*
