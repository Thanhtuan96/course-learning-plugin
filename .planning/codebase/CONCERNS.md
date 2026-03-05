# Codebase Concerns

**Analysis Date:** 2026-03-05

---

## Tech Debt

**Duplicate skill artifact (directory vs. zip):**
- Issue: The skill exists in two forms — `professor-skill-v3/professor-skill/SKILL.md` (editable source) and `professor-skill-v3.skill` (a zip artifact checked into git). These are currently in sync but any edit to the source without rebuilding the zip creates a silent divergence. There is no build script or CI to enforce they stay in sync.
- Files: `professor-skill-v3/professor-skill/SKILL.md`, `professor-skill-v3.skill`
- Impact: A user downloads `professor-skill-v3.skill` expecting the latest version but gets a stale one. Or a contributor edits SKILL.md and the distributed artifact never updates.
- Fix approach: Remove the zip artifact from version control. Add a `scripts/build-skill-zip.sh` that zips the source directory on demand, and add a GitHub Release step that attaches the generated zip. Reference this in a README so consumers always download from Releases.

**No single canonical install path:**
- Issue: The plan document (`.cursor/plans/Professor skill as Claude plugin-b9cbc254.plan.md`) specifies that the skill should live at `professor/SKILL.md` as the single source of truth, but the actual file is at `professor-skill-v3/professor-skill/SKILL.md`. The planned canonical path has not been created.
- Files: `professor-skill-v3/professor-skill/SKILL.md`
- Impact: Installation instructions in the plan reference `professor/SKILL.md`; users following those instructions will look in the wrong place.
- Fix approach: Create the canonical `professor/SKILL.md` directory structure as specified in the plan and retire the `professor-skill-v3/` path, or update all documentation to match the actual path.

**No README at repo root:**
- Issue: The repo has no `README.md`. The plan document identifies adding a README as a required step. Without it, the repo is not self-explanatory to anyone who clones or finds it.
- Files: (missing)
- Impact: Users cannot discover install steps, command reference, or download links without reading the plan document. The repo is not distributable in its current state.
- Fix approach: Create `README.md` with title, one-line description, quick-start section, per-surface install instructions, and full `profesor:*` command reference (as outlined in the plan).

**No build/release script:**
- Issue: No `scripts/build-skill-zip.sh` or equivalent exists despite the plan calling for it.
- Files: (missing)
- Impact: Anyone wanting to distribute the Claude.ai zip must manually zip the skill directory, risking incorrect zip structure (Anthropic requires a specific zip root layout).
- Fix approach: Add `scripts/build-skill-zip.sh` that zips `professor/SKILL.md` with the correct structure for Claude.ai upload.

---

## Known Bugs

**`profesor:syllabus` has no behavior spec:**
- Symptoms: The command is listed in the Commands Reference table (line 60 of SKILL.md) and in the frontmatter trigger list, but no `### profesor:syllabus` section exists in the Command Behaviors block. The LLM gets no explicit instruction on how to handle it.
- Files: `professor-skill-v3/professor-skill/SKILL.md`
- Trigger: User runs `profesor:syllabus` expecting a formatted syllabus view.
- Workaround: The LLM may infer behavior from `profesor:progress`, but the output will be inconsistent. The fix is to add a `### profesor:syllabus` section that specifies: "Display the full Syllabus & Progress table from COURSE.md as-is, then remind the user of the current active section."

---

## Security Considerations

**No validation that `courses/` path is sandboxed:**
- Risk: The skill instructs Claude to create and read files under `courses/{topic-slug}/`. The `topic-slug` is derived from user input. On surfaces with filesystem access (Claude Code, API with file tools), a maliciously crafted topic name (e.g., containing `../`) could theoretically cause file operations outside the intended directory.
- Files: `professor-skill-v3/professor-skill/SKILL.md`
- Current mitigation: None explicitly specified in the skill instructions.
- Recommendations: Add an instruction to sanitize topic slugs to alphanumeric + hyphens before using them as directory names. For example: "Sanitize `{topic-slug}` to lowercase alphanumeric characters and hyphens only (e.g., `my-topic-name`). Never allow path separators."

---

## Performance Bottlenecks

**No LLM context limit strategy for long courses:**
- Problem: `COURSE.md` is read at the start of every conversation and grows with each section's Progress Log entries. For long courses (10+ sections with detailed notes), the mandatory full-read of COURSE.md at conversation start consumes a meaningful portion of the context window.
- Files: `professor-skill-v3/professor-skill/SKILL.md`
- Cause: Rule 7 ("Always read COURSE.md first") is unconditional.
- Improvement path: Add guidance to read only the progress summary section if COURSE.md exceeds a threshold, or structure COURSE.md to keep the Progress Log in a separate file that is only read on `profesor:progress`.

---

## Fragile Areas

**Hint layer counter is stateless across conversations:**
- Files: `professor-skill-v3/professor-skill/SKILL.md` (lines 178–186)
- Why fragile: The hint layer system instructs Claude to "infer the layer from how many times they've asked this session." This is pure in-context inference with no persistence. If the user starts a new conversation mid-section, the counter resets to Layer 1 and the user can always get fresh Layer 1 hints by starting new sessions — defeating the intent.
- Safe modification: Consider logging hint usage in COURSE.md's Progress Log per section (e.g., "Hints used: 2 of 3"), so `profesor:hint` reads that count and continues from the correct layer across sessions.
- Test coverage: None — the skill has no test suite.

**`profesor:done` quality gate relies entirely on LLM judgment:**
- Files: `professor-skill-v3/professor-skill/SKILL.md` (lines 122–135)
- Why fragile: Whether a user's verbal explanation is "solid" or "shaky" is a soft judgment made by the model in the moment. There are no rubric criteria defined for what constitutes a passing explanation, making the gate inconsistent across model versions, temperatures, or conversation moods.
- Safe modification: Add explicit pass/fail criteria for each section type (e.g., "For a coding section: the user must correctly name the core mechanism, describe when to use it, and identify at least one failure case").
- Test coverage: None.

**LECTURE.md overwrite is irreversible:**
- Files: `professor-skill-v3/professor-skill/SKILL.md` (line 97, 306)
- Why fragile: `profesor:next` overwrites `LECTURE.md` with the new section's content, discarding the previous section's lecture. If a user runs `profesor:next` prematurely (before reviewing and marking done), the previous section's lecture is permanently lost. COURSE.md tracks status but not section content.
- Safe modification: Before overwriting, check that the current section is ✅ Done. If not, warn the user: "Section [N] is still in progress. Running `profesor:next` will overwrite your current lecture. Run `profesor:done` first, or confirm with `profesor:next --force`."
- Test coverage: None.

---

## Missing Critical Features

**No multi-course navigation:**
- Problem: The skill creates courses under `courses/{topic-slug}/` but provides no command to switch between courses, list all courses, or archive a completed course. A user with multiple courses in progress has no way to tell the Professor to switch context.
- Blocks: Users learning multiple topics simultaneously. The startup read of `COURSE.md` (singular) implies only one active course at a time.
- Recommended addition: A `profesor:courses` command that lists all subdirectories of `courses/` and their status, plus a `profesor:switch {topic}` command that changes the active course context.

**No mechanism to handle non-existent course on startup:**
- Problem: Rule 1 says "Check if a `courses/` folder exists." If it does not, prompt for `profesor:new-topic`. But there is no specification for the case where `courses/` exists but contains no valid COURSE.md files (e.g., empty directories, corrupted files).
- Files: `professor-skill-v3/professor-skill/SKILL.md` (lines 40–44)
- Blocks: First-time use after partial setup could leave the user in an undefined state.

---

## Test Coverage Gaps

**No testing of any kind:**
- What's not tested: All command behaviors, state transitions (section status changes, capstone unlock), edge cases (running `profesor:done` twice, running `profesor:capstone-review` before sections complete), and the hint layer progression system.
- Files: `professor-skill-v3/professor-skill/SKILL.md`
- Risk: Regressions to the skill spec go unnoticed when editing SKILL.md. A change to the `profesor:done` logic could silently break the capstone unlock path.
- Priority: Medium — the skill is prompt-only, so "testing" means creating scenario scripts (e.g., using the Claude API with the skill in `container.skills`) that walk through defined flows and assert on outputs. Even a manual test checklist in `tests/MANUAL_TEST_CASES.md` would significantly reduce regression risk.

---

*Concerns audit: 2026-03-05*
