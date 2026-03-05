# Codebase Structure

**Analysis Date:** 2026-03-05

## Directory Layout

```
course-learning-plugin/
├── professor-skill-v3/                  # Skill source directory (deployable artifact)
│   └── professor-skill/
│       └── SKILL.md                     # The Professor skill — single source of truth
├── professor-skill-v3.skill             # Zip archive of professor-skill/ for Claude.ai upload
├── .claude/                             # Claude Code project configuration (GSD framework)
│   ├── agents/                          # GSD sub-agent definitions (12 agent .md files)
│   ├── commands/
│   │   └── gsd/                         # 32 GSD slash commands for developer workflow
│   ├── get-shit-done/                   # GSD framework internals
│   │   ├── bin/                         # GSD runtime scripts
│   │   │   └── lib/
│   │   ├── references/                  # Reference docs (checkpoints, git, model profiles, etc.)
│   │   ├── templates/                   # GSD document templates
│   │   │   ├── codebase/                # Codebase analysis templates (STACK, ARCH, TESTING, etc.)
│   │   │   └── research-project/
│   │   └── workflows/                   # Detailed workflow definitions for each GSD command
│   ├── hooks/                           # Claude Code session hooks (JS scripts)
│   ├── gsd-file-manifest.json           # GSD framework file registry
│   ├── package.json                     # Minimal Node.js package (for hooks)
│   ├── settings.json                    # Claude Code hook and statusline config
│   └── settings.local.json              # Local overrides (not committed)
├── .planning/                           # GSD planning artifacts (generated)
│   └── codebase/                        # Codebase analysis documents (this directory)
└── .cursor/                             # Cursor IDE artifacts
    └── plans/                           # Cursor plan documents
        └── Professor skill as Claude plugin-b9cbc254.plan.md
```

## Directory Purposes

**`professor-skill-v3/professor-skill/`:**
- Purpose: The deployable skill — the actual product of this project
- Contains: `SKILL.md` only — the complete Professor Claude Agent Skill specification
- Key files: `professor-skill-v3/professor-skill/SKILL.md`

**`professor-skill-v3.skill`:**
- Purpose: Pre-built distribution artifact for Claude.ai upload
- Contains: Zip archive of `professor-skill/SKILL.md`
- Key files: `professor-skill-v3.skill` (binary zip, not human-editable directly)

**`.claude/agents/`:**
- Purpose: Sub-agent definitions used by GSD commands
- Contains: 12 Markdown agent spec files (e.g., `gsd-codebase-mapper.md`, `gsd-executor.md`, `gsd-planner.md`)
- Key files: `gsd-planner.md`, `gsd-executor.md`, `gsd-verifier.md`

**`.claude/commands/gsd/`:**
- Purpose: Developer-facing slash commands for the GSD project management workflow
- Contains: 32 Markdown command definition files
- Key files: `plan-phase.md`, `execute-phase.md`, `map-codebase.md`, `verify-work.md`, `debug.md`

**`.claude/get-shit-done/workflows/`:**
- Purpose: Full workflow instructions referenced by slash commands and agents
- Contains: 36 workflow Markdown files — detailed procedures for each GSD operation
- Key files: `execute-phase.md`, `plan-phase.md`, `discuss-phase.md`, `map-codebase.md`

**`.claude/get-shit-done/references/`:**
- Purpose: Shared reference documentation used across GSD workflows
- Contains: 14 reference Markdown files covering checkpoints, git integration, model profiles, TDD, verification patterns
- Key files: `checkpoints.md`, `verification-patterns.md`, `planning-config.md`

**`.claude/get-shit-done/templates/codebase/`:**
- Purpose: Templates for the `/gsd:map-codebase` command outputs
- Contains: 7 template files: `architecture.md`, `concerns.md`, `conventions.md`, `integrations.md`, `stack.md`, `structure.md`, `testing.md`

**`.claude/hooks/`:**
- Purpose: Automated Claude Code session hooks running as Node.js scripts
- Contains: `gsd-check-update.js` (session start update check), `gsd-context-monitor.js` (post-tool-use monitor), `gsd-statusline.js` (status bar display)

**`.planning/codebase/`:**
- Purpose: Output directory for `/gsd:map-codebase` analysis documents
- Contains: Generated codebase analysis Markdown files
- Generated: Yes (by GSD codebase mapper agent)
- Committed: Yes (planning artifacts are version controlled)

**`.cursor/plans/`:**
- Purpose: Cursor IDE plan documents for the project
- Contains: Research and deployment plan written by Cursor
- Key files: `Professor skill as Claude plugin-b9cbc254.plan.md`

## Key File Locations

**Entry Points (Skill):**
- `professor-skill-v3/professor-skill/SKILL.md`: The Professor skill — all behavior, commands, file formats, and rules

**Distribution Artifact:**
- `professor-skill-v3.skill`: Zip archive for direct Claude.ai upload

**GSD Framework Configuration:**
- `.claude/settings.json`: Hook registration and statusline command
- `.claude/settings.local.json`: Local developer overrides
- `.claude/package.json`: Node.js manifest for hook scripts
- `.claude/gsd-file-manifest.json`: GSD framework file registry

**Development Planning:**
- `.cursor/plans/Professor skill as Claude plugin-b9cbc254.plan.md`: Deployment strategy and packaging plan
- `.planning/codebase/ARCHITECTURE.md`: This project's architecture analysis
- `.planning/codebase/STRUCTURE.md`: This project's structure analysis

**GSD Version:**
- `.claude/get-shit-done/VERSION`: Current GSD framework version (1.22.4)

## Naming Conventions

**Files:**
- Skill spec: `SKILL.md` (uppercase, single file)
- GSD agents: `gsd-{role}.md` (kebab-case with `gsd-` prefix)
- GSD commands: `{verb}-{noun}.md` (kebab-case action names, e.g., `plan-phase.md`, `execute-phase.md`)
- GSD workflows: Match command names exactly
- GSD references: Descriptive kebab-case, e.g., `verification-patterns.md`, `model-profiles.md`
- Hook scripts: `gsd-{purpose}.js` (kebab-case with `gsd-` prefix)
- Planning docs: `UPPERCASE.md` for analysis documents; Cursor plans use natural names with UUID suffix

**Directories:**
- Skill source: Matches `professor-skill-v3/{skill-name}/` pattern
- Distribution zip: `{skill-name}-{version}.skill` extension

## Where to Add New Code

**New Skill Version:**
- Create new directory: `professor-skill-v{N}/professor-skill/SKILL.md`
- Update zip artifact: rebuild `professor-skill-v{N}.skill`
- Update plan: `.cursor/plans/` or `.planning/`

**Skill Content Changes:**
- Edit only: `professor-skill-v3/professor-skill/SKILL.md`
- Rebuild zip after changes for distribution

**New GSD Command:**
- Command definition: `.claude/commands/gsd/{verb}-{noun}.md`
- Workflow instructions: `.claude/get-shit-done/workflows/{verb}-{noun}.md`
- Agent (if needed): `.claude/agents/gsd-{role}.md`

**Codebase Analysis Documents:**
- Output location: `.planning/codebase/{DOCNAME}.md`
- Templates source: `.claude/get-shit-done/templates/codebase/`

**Planning Documents:**
- GSD planning artifacts: `.planning/`
- Cursor plans: `.cursor/plans/`

## Special Directories

**`.claude/`:**
- Purpose: Claude Code project configuration and GSD framework
- Generated: Partially (installed via GSD setup)
- Committed: Yes

**`.planning/`:**
- Purpose: GSD-generated planning and analysis artifacts
- Generated: Yes (by GSD commands)
- Committed: Yes (serves as persistent project memory)

**`courses/` (runtime only, not in repo):**
- Purpose: Runtime state directory written by Claude when the skill runs
- Generated: Yes (by Claude during conversations)
- Committed: No (user-specific runtime data, created in the user's environment)

---

*Structure analysis: 2026-03-05*
