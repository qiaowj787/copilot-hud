# copilot-hud

A HUD plugin for GitHub Copilot CLI.

`copilot-hud` turns Copilot session data into a compact terminal status view. It is designed for people who want a `claude-hud`-style experience in Copilot CLI, with a simple install flow and practical defaults.

[简体中文说明](./README.zh-CN.md)

## What it does

`copilot-hud` can show:

- project path and git branch
- current model and mode
- context window usage when Copilot passes `statusLine` JSON on stdin
- request and token usage derived from local session data
- active and completed tools
- subagent activity
- todo progress from the session database
- session duration and summary

## How it works

GitHub Copilot CLI supports a `statusLine` command that receives the current session state as JSON on stdin.

`copilot-hud` uses that official integration first, then enriches the display with data from `~/.copilot/session-state`.

It also supports standalone modes for `tmux`, shell prompts, and dedicated watch panes.

## Installation

### Quick install

Inside Copilot CLI:

```text
/plugin install qiaowj787/copilot-hud
/copilot-hud:setup
```

That is the shortest path to a working HUD.

### Requirements

- GitHub Copilot CLI
- Node.js `>= 22`

## Usage

### 1. Use as Copilot `statusLine`

This is the recommended mode.

After installation, run:

```text
/copilot-hud:setup
```

The setup flow can write the `statusLine` config for you. It should enable Copilot CLI experimental mode and use an absolute runtime path so the status command keeps working outside your interactive shell environment.

### 2. Snapshot mode

Useful for quick inspection, shell prompts, or tmux status commands.

```bash
node dist/index.js snapshot
node dist/index.js snapshot --json
node dist/index.js snapshot --cwd /path/to/project
```

### 3. Watch mode

Useful for a dedicated terminal pane.

```bash
node dist/index.js watch
node dist/index.js watch --interval 1000
```

### 4. List sessions

```bash
node dist/index.js sessions
node dist/index.js sessions --json
```

## Example output

```text
[gpt-5.4]  github/copilot-hud  git:(main*)  summary:Preview copilot-hud  mode:autopilot
Context 23% (45k/200k) | Requests 4 | Rate monthly 20% | weekly 30% | Tokens in 0 | out 69k | Duration 40m 2s
Tools ◐ bash | ◐ bash | ✓ bash ×117 | ✓ report_intent ×38 | ✓ apply_patch ×16
Agents ✓ done 1
Todos (5/5 done)
```

## Manual configuration

If you want to configure Copilot manually, add this to `~/.copilot/config.json`:

```json
{
  "experimental": true,
  "statusLine": {
    "type": "command",
    "command": "\"/ABSOLUTE/RUNTIME/PATH\" \"/ABSOLUTE/PLUGIN/PATH/dist/index.js\"",
    "padding": 1
  }
}
```

`statusLine` currently depends on Copilot CLI experimental mode. If the HUD does not appear after restart, make sure `"experimental": true` is present and start a new Copilot session.

## HUD config file

Optional runtime config:

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

## Development

```bash
npm install
npm run build
npm test
```

## Project files

- `plugin.json` — Copilot plugin manifest
- `commands/` — setup and configure flows
- `skills/copilot-hud/` — reusable skill
- `src/` — runtime source
- `dist/` — compiled runtime

## License

MIT. See [`LICENSE`](./LICENSE).
