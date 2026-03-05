# Architecture

**Analysis Date:** 2026-03-05

## Pattern Overview

**Overall:** Claude Agent Skill (Markdown-driven instruction architecture)

This project is not a traditional software application with compiled code. It is a **Claude Agent Skill** — a single Markdown file (`SKILL.md`) with YAML frontmatter that Claude reads as behavioral instructions. The "runtime" is Claude itself; there is no server, no build step, and no deployment pipeline beyond packaging and uploading.

**Key Characteristics:**
- All logic is expressed as natural language instructions in `professor-skill-v3/professor-skill/SKILL.md`
- State is persisted entirely in Markdown files written by Claude to a `courses/` directory at runtime
- The skill is triggered by command prefixes (`profesor:*`) or natural language phrases matched against the `description` frontmatter
- The GSD (Get Shit Done) framework in `.claude/` is the development tooling layer, not part of the deliverable skill

## Layers

**Skill Definition Layer:**
- Purpose: The behavioral spec that Claude executes — commands, rules, file formats, Socratic pedagogy logic
- Location: `professor-skill-v3/professor-skill/SKILL.md`
- Contains: YAML frontmatter trigger config, command reference table, command behavior specs, file format templates, absolute rules
- Depends on: Nothing (self-contained instruction document)
- Used by: Claude (as a loaded skill on any supported surface)

**Runtime State Layer (generated at runtime by Claude):**
- Purpose: Persistent course state written and read by Claude during conversations
- Location: `courses/{topic-slug}/` (created at runtime in the user's working environment)
- Contains:
  - `COURSE.md` — single source of truth for syllabus, section statuses, progress log
  - `LECTURE.md` — disposable current-section content, overwritten by each `profesor:next`
  - `CAPSTONE.md` — immutable capstone project brief created once, never modified
- Depends on: Skill definition layer (file formats defined there)
- Used by: Claude on subsequent conversations to restore context

**GSD Development Tooling Layer:**
- Purpose: AI-assisted project management and planning framework for developing this skill
- Location: `.claude/`
- Contains: Slash commands, agent definitions, hooks, workflow templates, references
- Depends on: Claude Code CLI
- Used by: The developer, not the end user of the skill

**Planning & Research Layer:**
- Purpose: Design decisions, deployment plans, and codebase analysis documents
- Location: `.planning/`, `.cursor/plans/`
- Contains: Cursor plan documents, GSD codebase analysis outputs
- Depends on: Nothing
- Used by: Developer during planning phases

## Data Flow

**New Course Creation (`profesor:new-topic`):**

1. User triggers command via chat
2. Claude asks calibration questions (topic, background, level)
3. Claude performs web search for current best practices on the topic
4. Claude writes `courses/{topic-slug}/COURSE.md` (syllabus, all sections ⬜ Not started)
5. Claude writes `courses/{topic-slug}/CAPSTONE.md` (immutable project brief)
6. Claude confirms to user with instructions to run `profesor:next`

**Session Restore Flow:**

1. User starts any conversation
2. Claude checks for existence of `courses/` directory
3. If found: Claude reads `COURSE.md` to restore topic, level, active section, and progress
4. Claude greets user with current position: "Welcome back! You're on [Topic] — Section [N]..."
5. If not found: Claude prompts `profesor:new-topic`

**Learning Loop (`profesor:next` → `profesor:review` → `profesor:done`):**

1. `profesor:next`: Claude reads `COURSE.md`, finds first ⬜ section, optionally web-searches for content, writes section to `LECTURE.md`, updates `COURSE.md` section status to 🔄 In progress
2. `profesor:review`: User shares work; Claude gives structured Socratic feedback (no code written)
3. `profesor:done`: Claude verifies verbal understanding, updates `COURSE.md` section to ✅ Done, appends progress log entry
4. If all sections ✅ Done: Capstone unlocked, special message shown

**State Management:**
- `COURSE.md` is the authoritative state store — read at session start, updated immediately on any status change
- `LECTURE.md` is ephemeral — only one section at a time, fully overwritten
- `CAPSTONE.md` is write-once — created at course creation, never modified
- No external database; all state is filesystem Markdown

## Key Abstractions

**The Skill File:**
- Purpose: Single instruction document that defines all Professor behavior
- Examples: `professor-skill-v3/professor-skill/SKILL.md`
- Pattern: YAML frontmatter (trigger metadata) + Markdown body (full behavioral spec)

**Course State Files:**
- Purpose: Represent the learner's current position and history
- Examples: `courses/rust-basics/COURSE.md`, `courses/rust-basics/LECTURE.md`, `courses/rust-basics/CAPSTONE.md`
- Pattern: Structured Markdown with specific format defined in SKILL.md; Claude reads/writes these directly

**Hint Layers:**
- Purpose: Progressive disclosure of help without giving solutions
- Pattern: Layer 1 = conceptual nudge, Layer 2 = tool/pattern pointer, Layer 3 = pseudo-code shape only; 4th hint → redirect to `profesor:stuck`

**Socratic Review Pattern:**
- Purpose: Structured feedback that guides without solving
- Pattern: ✅ What's working → ❓ Socratic question → 💡 Concept to study → ⏭️ Next action

**Skill Distribution Formats:**
- Purpose: The same `SKILL.md` can be deployed to multiple surfaces
- Pattern: Zip file for Claude.ai upload; directory copy for Claude Code; API upload with `skill_id` for Messages API; `.claude/skills/` for Agent SDK

## Entry Points

**Claude.ai (zip upload):**
- Location: `professor-skill-v3.skill` (zip archive containing `professor-skill/SKILL.md`)
- Triggers: Uploaded via Settings → Features → Custom Skills; activates on `profesor:*` commands or natural language matches
- Responsibilities: Full skill behavior as defined in SKILL.md

**Claude Code (filesystem):**
- Location: `~/.claude/skills/professor/SKILL.md` (personal) or `.claude/skills/professor/SKILL.md` (project)
- Triggers: `/professor` slash command or natural language trigger phrases
- Responsibilities: Same skill behavior; file creation goes to project working directory

**Claude Messages API:**
- Location: Skill uploaded via POST `/v1/skills`, referenced by `skill_id` in `container.skills`
- Triggers: Programmatic invocation with beta headers `skills-2025-10-02`, `code-execution-2025-08-25`
- Responsibilities: Same skill behavior in API context

**GSD Commands (developer tooling):**
- Location: `.claude/commands/gsd/` (34 slash commands)
- Triggers: Developer types `/gsd:*` commands in Claude Code
- Responsibilities: Project management — planning phases, executing tasks, mapping codebase, verifying work

## Error Handling

**Strategy:** Graceful degradation via natural language guards

**Patterns:**
- Missing `courses/` directory: Claude prompts user to start with `profesor:new-topic` instead of failing silently
- Premature `profesor:capstone-review`: Claude responds with explicit gate message directing to complete sections first
- Premature `profesor:done`: Claude challenges with verbal explanation requirement before marking complete
- User requests code: Claude redirects to Socratic alternatives in all phases; during capstone phase `profesor:stuck` and hints are disabled entirely

## Cross-Cutting Concerns

**State Consistency:** `COURSE.md` must be updated immediately on any section status change — this is an absolute rule in the skill spec. LECTURE.md and CAPSTONE.md have complementary immutability contracts.

**Pedagogy Enforcement:** Multiple absolute rules prevent the skill from ever writing working code for the user regardless of command, phrasing, or surface. This is enforced via natural language rules in SKILL.md.

**Surface Agnosticism:** The single `SKILL.md` file is the source of truth for all deployment surfaces. The `.skill` file at `professor-skill-v3.skill` is a zip archive of the same content.

---

*Architecture analysis: 2026-03-05*
