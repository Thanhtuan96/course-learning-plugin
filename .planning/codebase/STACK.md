# Technology Stack

**Analysis Date:** 2026-03-05

## Languages

**Primary:**
- JavaScript (CommonJS) - All tooling, hook scripts, and CLI utilities in `.claude/get-shit-done/bin/` and `.claude/hooks/`
- Markdown - Skill definition (`professor-skill-v3/professor-skill/SKILL.md`), planning templates, workflow and reference documents

**Secondary:**
- JSON - Configuration files (`config.json`, `gsd-file-manifest.json`, `settings.json`)
- YAML (frontmatter) - Embedded in Markdown files for structured metadata (SKILL.md frontmatter, planning template frontmatter)

## Runtime

**Environment:**
- Node.js v22.19.0 - All `.cjs` CLI scripts and hook scripts run via `#!/usr/bin/env node`

**Package Manager:**
- npm 10.9.3
- Lockfile: Not present (no `package-lock.json` at project root; minimal `package.json` with only `{"type":"commonjs"}` in `.claude/`)
- GSD framework installed as npm package `get-shit-done-cc` v1.22.4 (detected via `npm view get-shit-done-cc version`)

## Frameworks

**Core:**
- GSD (Get Shit Done) v1.22.4 - AI-assisted project management framework embedded in `.claude/get-shit-done/`. Provides planning, roadmapping, execution, and verification workflows via Claude Code custom commands and agents.

**Skill Platform:**
- Anthropic Agent Skills format - The project's primary deliverable (`professor-skill-v3/professor-skill/SKILL.md`) targets the Anthropic Agent Skills API (`skills-2025-10-02`) and Claude Code skill discovery

**Testing:**
- Not applicable - No test framework detected; the project is a content/config artifact (a Claude skill) not application code

**Build/Dev:**
- No build tooling present; distribution is via zip packaging (`scripts/build-skill-zip.sh` is planned, not yet created)

## Key Dependencies

**Critical:**
- `get-shit-done-cc` v1.22.4 - GSD framework providing all planning workflows, agent definitions, hooks, and CLI tools. Installed into `.claude/` directory.

**Infrastructure:**
- Node.js built-in modules only (`fs`, `path`, `os`, `child_process`) - All hook scripts and CLI tools use only Node.js stdlib; no `node_modules` or npm install required for hooks to function.

**Optional External:**
- Brave Search API (`BRAVE_API_KEY`) - Used by `gsd-tools.cjs websearch` command for web search augmentation. Falls back to Claude's built-in WebSearch when not configured.
- npm registry (`https://registry.npmjs.org`) - Queried at session start by `.claude/hooks/gsd-check-update.js` to check for GSD updates (`npm view get-shit-done-cc version`).

## Configuration

**Environment:**
- `BRAVE_API_KEY` - Optional; enables Brave Search integration in GSD. Can also be stored in `~/.gsd/brave_api_key` file.
- `GEMINI_API_KEY` - Optional; detected by context-monitor hook to switch hook event name from `PostToolUse` to `AfterTool` for Gemini compatibility.
- `CLAUDE_CONFIG_DIR` - Optional; overrides default `.claude/` config directory location for multi-account or custom setups.

**Build:**
- `.claude/get-shit-done/templates/config.json` - Default project config template: mode, granularity, workflow flags, parallelization settings, confirmation gates, safety options.
- `.planning/config.json` - Per-project GSD config (generated on project init). Key options: `model_profile` (`balanced`|`quality`|`budget`), `commit_docs`, `branching_strategy`, `brave_search`.
- `~/.gsd/defaults.json` - Optional global user-level defaults that override hardcoded GSD defaults.

## Platform Requirements

**Development:**
- Node.js v22+ (LTS recommended)
- Claude Code IDE extension or Claude.ai with Custom Skills enabled
- Git (required for GSD planning commit workflows)

**Production / Distribution:**
- Skill deployment targets: Claude.ai (zip upload), Claude Code (filesystem at `~/.claude/skills/` or `.claude/skills/`), Anthropic Messages API (POST `/v1/skills` with beta header `skills-2025-10-02`), Claude Agent SDK (`.claude/skills/` discovery)
- No server or cloud infrastructure required; the skill is a static Markdown artifact

---

*Stack analysis: 2026-03-05*
