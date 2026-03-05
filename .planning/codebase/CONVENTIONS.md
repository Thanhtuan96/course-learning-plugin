# Coding Conventions

**Analysis Date:** 2026-03-05

## Codebase Type

This project is a **Claude Agent Skill** — a natural-language instruction document, not a compiled or interpreted program. The primary "source code" is `professor-skill-v3/professor-skill/SKILL.md`. There is no JavaScript, TypeScript, Python, or shell source code in this project.

Conventions therefore govern **Markdown authoring**, **YAML frontmatter**, **skill instruction structure**, and **file naming** rather than programmatic coding style.

---

## Skill File Structure

**Entry point:** `professor-skill-v3/professor-skill/SKILL.md`

All skill logic lives in a single SKILL.md file. The format is:

```markdown
---
name: <skill-name>          # lowercase, no reserved words, < 64 chars
description: >              # YAML multiline, <= 1024 chars, no XML
  [trigger description]
---

# [Skill Title]

## [Section Heading]
...
```

**Rules observed:**
- YAML frontmatter is always at the top with `name` and `description` fields
- `name` is lowercase, no spaces (e.g., `professor`)
- `description` uses YAML block scalar (`>`) for multiline values
- Markdown body uses `##` for top-level sections, `###` for subsections
- Commands are wrapped in backticks: `` `profesor:new-topic` ``

---

## Naming Patterns

**Skill directory:**
- Pattern: `<skill-name>/` containing `SKILL.md`
- Example: `professor-skill-v3/professor-skill/SKILL.md`

**User-facing command names:**
- Pattern: `profesor:<action>` (note intentional Spanish spelling "profesor", not "professor")
- Examples: `profesor:new-topic`, `profesor:review`, `profesor:capstone-review`
- Actions use kebab-case for multi-word names: `new-topic`, `capstone-review`

**Generated course files:**
- Pattern: UPPERCASE.md in `courses/{topic-slug}/`
- Filenames: `COURSE.md`, `LECTURE.md`, `CAPSTONE.md`
- Topic slug: lowercase, hyphenated (e.g., `courses/rust-async/`)

**Status indicators:**
- Consistent emoji-based status legend: `⬜ Not started · 🔄 In progress · ✅ Done · 🔒 Locked`
- Applied uniformly in COURSE.md syllabus tables

---

## Instruction Writing Style

**Imperative voice:** All behavioral instructions use imperative mood:
- "Read `COURSE.md` — find the first section..."
- "Update `COURSE.md`: change section status to..."
- "Never rewrite their code"

**Numbered steps for sequential flows:** Every multi-step command behavior uses an ordered list:
```markdown
1. Ask (if not already stated): ...
2. Research the topic using web search...
3. Create two files...
4. Tell the user: "..."
```

**Rules sections use bold prohibition language:**
- "**Never write working code** for the user"
- "**Never complete an exercise** on the user's behalf"

**User-facing text uses italics for quotes:**
- `*"Welcome back! You're on [Topic]..."*`

---

## Markdown Table Conventions

Tables are used for:
- Command reference (Command | What it does)
- Syllabus/progress tracker (# | Section Title | Status | Completed)
- Progress log (Date | Section | Activity | Notes)
- Level matrix (Level | Explanation style | Exercise scope | Hints)

Column alignment uses `---` without explicit alignment markers.

---

## Template Placeholder Convention

Placeholders in generated file formats use `[square brackets]`:
- `[Topic Name]`, `[Level]`, `[date]`, `[N]`, `[Section Title]`
- Consistent with standard Markdown template conventions

---

## File Immutability Rules

Documented explicitly in the skill as behavioral conventions:
- `COURSE.md` — mutable, updated in-place throughout the course (single source of truth)
- `LECTURE.md` — disposable; overwritten on each `profesor:next`
- `CAPSTONE.md` — immutable after creation; never edited

These are enforced via natural-language "Absolute Rules" at the bottom of `SKILL.md`.

---

## Error Handling

No programmatic error handling exists (no code). Behavioral error handling is defined via:

**Guard conditions at the start of commands:**
- `profesor:capstone-review`: "This command is only available after all sections are ✅ Done. If sections are still incomplete, respond: '...'"

**Escalation paths for stuck users:**
- After 2+ review rounds: suggest `profesor:stuck`
- After 3 hint layers: redirect to `profesor:stuck` rather than providing a 4th hint

**User override resistance:**
- If user says "just give me the answer": scripted deflection response provided
- If user asks for code during capstone: scripted refusal provided

---

## Comments and Documentation

No inline code comments (not applicable). Documentation approach:

- All behavioral rules are written directly into `SKILL.md` as Markdown sections
- The plan document `.cursor/plans/Professor skill as Claude plugin-b9cbc254.plan.md` serves as a deployment guide / architecture decision record
- Section headers act as navigation anchors for the skill body

---

## Formatting

**Tooling:** None — no linter, formatter, or CI enforced. Manual authoring only.

**Horizontal rules (`---`):** Used to visually separate major sections within `SKILL.md` and within generated file format templates.

**Code blocks (triple backtick):** Used for:
- File tree diagrams
- Generated file format templates (with language hint `markdown`)
- Example Mermaid diagrams in the plan document

---

*Convention analysis: 2026-03-05*
