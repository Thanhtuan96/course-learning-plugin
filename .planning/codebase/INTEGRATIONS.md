# External Integrations

**Analysis Date:** 2026-03-05

## APIs & External Services

**Anthropic Platform:**
- Claude Agent Skills API - Target deployment surface for the professor skill
  - SDK/Client: Anthropic Messages API with beta headers (`skills-2025-10-02`, `code-execution-2025-08-25`, optionally `files-api-2025-04-14`)
  - Auth: Anthropic API key (user-managed; not stored in this repo)
  - Endpoint: `POST /v1/skills` for skill upload; skill referenced via `skill_id` in Messages API `container.skills`
  - Docs referenced in `.cursor/plans/Professor skill as Claude plugin-b9cbc254.plan.md`

**Web Search (optional):**
- Brave Search API - Used by GSD tooling for web search augmentation during research phases
  - SDK/Client: Native `fetch()` in `.claude/get-shit-done/bin/lib/commands.cjs`
  - Auth: `BRAVE_API_KEY` environment variable, or file at `~/.gsd/brave_api_key`
  - Endpoint: `https://api.search.brave.com/res/v1/web/search`
  - Optional: GSD falls back silently to Claude's built-in WebSearch if `BRAVE_API_KEY` is not set

**npm Registry:**
- npm public registry - Queried by `.claude/hooks/gsd-check-update.js` at session start to detect available GSD updates
  - Client: `execSync('npm view get-shit-done-cc version', ...)` in Node.js child process
  - Auth: None (public registry, read-only)
  - Package: `get-shit-done-cc` (GSD framework)
  - Result cached to `~/.claude/cache/gsd-update-check.json`; result shown in Claude Code status line

## Data Storage

**Databases:**
- None - No database is used. The project is a static skill artifact.

**File Storage:**
- Local filesystem only
  - GSD planning state: `.planning/` directory (STATE.md, ROADMAP.md, config.json, phase directories)
  - Context bridge (temporary): `/tmp/claude-ctx-{session_id}.json` - Written by statusline hook, read by context-monitor hook to pass context usage metrics between hooks
  - Update check cache: `~/.claude/cache/gsd-update-check.json` - Written by update-check hook, read by statusline hook
  - Warning debounce state: `/tmp/claude-ctx-{session_id}-warned.json` - Written and read by context-monitor hook

**Caching:**
- Filesystem-based (see `/tmp/` files above). No external cache services.

## Authentication & Identity

**Auth Provider:**
- None - No authentication system is implemented. The project distributes a skill file.
- For API deployment of the skill: standard Anthropic API key authentication (managed by the end user, outside this repo)

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service integrated.

**Logs:**
- All hook scripts (`.claude/hooks/gsd-check-update.js`, `.claude/hooks/gsd-context-monitor.js`, `.claude/hooks/gsd-statusline.js`) use silent-fail patterns (`process.exit(0)` on errors) to avoid breaking Claude Code tool execution. No persistent log files produced.

## CI/CD & Deployment

**Hosting:**
- None currently. Planned: GitHub Releases for zip distribution of the professor skill, per `.cursor/plans/Professor skill as Claude plugin-b9cbc254.plan.md`.

**CI Pipeline:**
- None detected. No `.github/workflows/`, `Makefile`, or CI config files present.

**Planned Deployment Script:**
- `scripts/build-skill-zip.sh` - Referenced in plan but not yet created. Will zip `professor/SKILL.md` for Claude.ai upload and GitHub Releases attachment.

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None (GSD hooks run locally as Claude Code session hooks; no outbound webhooks)

## Claude Code Hook Integration

**SessionStart hook:**
- `.claude/hooks/gsd-check-update.js` - Spawns detached background process to query npm registry for GSD updates; writes result to cache file. Configured in `.claude/settings.json`.

**PostToolUse hook:**
- `.claude/hooks/gsd-context-monitor.js` - Reads context metrics from `/tmp/claude-ctx-{session_id}.json` (written by statusline) and injects `additionalContext` warnings into the agent conversation when context usage exceeds WARNING (35% remaining) or CRITICAL (25% remaining) thresholds. Configured in `.claude/settings.json`.

**StatusLine hook:**
- `.claude/hooks/gsd-statusline.js` - Reads session context window data from Claude Code, writes bridge metrics to `/tmp/claude-ctx-{session_id}.json`, renders a formatted status bar showing model name, current todo task, directory, and context usage progress bar. Configured in `.claude/settings.json`.

## Environment Configuration

**Required env vars:**
- None required for core skill functionality.

**Optional env vars:**
- `BRAVE_API_KEY` - Enables Brave Search in GSD research workflows
- `GEMINI_API_KEY` - Signals Gemini runtime compatibility to context-monitor hook (changes hook event name)
- `CLAUDE_CONFIG_DIR` - Overrides the default `.claude/` config directory path

**Secrets location:**
- No secrets stored in this repository. API keys are user-managed environment variables or files in `~/.gsd/`.

---

*Integration audit: 2026-03-05*
