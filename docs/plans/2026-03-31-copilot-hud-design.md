# copilot-hud design

## Problem

Build a GitHub Copilot CLI plugin named `copilot-hud` that delivers the practical value of `claude-hud`: always-available visibility into session health, usage, activity, and progress.

## Constraint

Copilot CLI does not expose a fully documented quota API, but it **does** expose an official `statusLine` command hook that sends current session status JSON on stdin. It also exposes enough local state under `~/.copilot/session-state` to enrich that stream.

## Architecture

The plugin is split into three layers:

1. Plugin surface
   - `plugin.json`
   - `skills/copilot-hud/SKILL.md`
   - `/copilot-hud:setup`
   - `/copilot-hud:configure`

2. Runtime engine
   - read status JSON from stdin when invoked as Copilot `statusLine`
   - discover sessions from `~/.copilot/session-state`
   - parse `workspace.yaml`
   - aggregate `events.jsonl`
   - read `session.db` todos when present
   - enrich with git status
   - render expanded or compact HUD output

3. Integration layer
   - native Copilot `statusLine` command
   - `snapshot` for tmux/shell status commands
   - `watch` for a dedicated terminal pane
   - `sessions` for debugging and session selection

## Data model

The runtime derives:

- project path
- session summary and mode
- active/ended state
- model name when available
- context-window usage when passed on stdin by Copilot
- premium request count
- token usage
- tools in flight and completion counts
- subagent activity
- todo progress
- git branch, dirty state, ahead/behind, and file stats

## Behavior choices

- Prefer accurate data from `session.shutdown` when available.
- Fall back to incremental live counters for active sessions.
- Keep runtime dependencies minimal so direct plugin installs remain portable.
- Expose machine-readable JSON for downstream integrations.

## Future extensions

- richer heuristics for current context-window saturation if Copilot starts emitting that data
- prompt/theme integrations for starship, zsh, and fish
- optional log parsing for deeper task timelines
