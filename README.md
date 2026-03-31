# copilot-hud

`copilot-hud` is a GitHub Copilot CLI plugin and HUD runtime that makes Copilot sessions easier to understand at a glance.

It is inspired by `claude-hud`, but adapted to the current GitHub Copilot CLI plugin model and local state layout.

## What it shows

- Current project path and git branch
- Session model and mode when available
- Context-window usage when Copilot passes official `statusLine` stdin JSON
- Premium request count and token usage derived from Copilot session events
- Active and completed tool activity
- Running and completed subagents
- Todo progress from the session database when present
- Session duration and summary metadata

## How it integrates

GitHub Copilot CLI exposes an official `statusLine` setting that executes a command and passes the current session status as JSON on `stdin`.

`copilot-hud` uses that as the primary integration path, then enriches the status line with local data from `~/.copilot/session-state`.

It also ships with fallback modes for `tmux`, shell prompts, and dedicated watch panes.

## Installation

### Plugin install

From a Copilot CLI session:

```bash
/plugin install OWNER/REPO
```

For local development:

```bash
copilot plugin install .
```

Then use the setup flow:

```text
/copilot-hud:setup
```

### Local development

```bash
npm install
npm run build
npm test
```

## Runtime usage

### Snapshot mode

Good for `tmux` status commands, shell prompts, or ad-hoc inspection.

```bash
node dist/index.js snapshot
node dist/index.js snapshot --json
node dist/index.js snapshot --cwd /path/to/project
printf '%s' '{\"context\":{\"cwd\":\"/path/to/project\"},\"model\":{\"display_name\":\"gpt-5.4\"}}' | node dist/index.js
```

### Watch mode

Good for a dedicated terminal pane.

```bash
node dist/index.js watch
node dist/index.js watch --interval 1000
```

### Session listing

```bash
node dist/index.js sessions
node dist/index.js sessions --json
```

## Copilot statusLine configuration

`/copilot-hud:setup` can write this for you automatically. Manual example:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"/ABSOLUTE/PLUGIN/PATH/dist/index.js\"",
    "padding": 1
  }
}
```

When invoked this way, Copilot sends session status JSON to `stdin`, and `copilot-hud` merges it with local session-state data.

## HUD configuration

Default config path:

```text
~/.copilot/plugins/copilot-hud/config.json
```

Example:

```json
{
  "lineLayout": "expanded",
  "pathLevels": 2,
  "refreshIntervalMs": 1500,
  "display": {
    "showTools": true,
    "showAgents": true,
    "showTodos": true,
    "showSummary": false
  },
  "gitStatus": {
    "enabled": true,
    "showDirty": true,
    "showAheadBehind": true,
    "showFileStats": false
  }
}
```

## Plugin contents

- `skills/copilot-hud/SKILL.md`
- `commands/setup.md`
- `commands/configure.md`
- `plugin.json`
- `dist/index.js`

## Design notes

The initial implementation plan is captured in `docs/plans/2026-03-31-copilot-hud-design.md`.
