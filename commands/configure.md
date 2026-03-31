---
description: Configure copilot-hud display options
allowed-tools: Read, Write, AskUserQuestion
---

Configure `copilot-hud` by editing `~/.copilot/plugins/copilot-hud/config.json`.

## Rules

- Preserve unknown keys.
- Merge with the existing file if it already exists.
- If the file is invalid JSON, stop and explain the error instead of overwriting it.
- Ask one question at a time.

## Supported settings

- `lineLayout`: `expanded` or `compact`
- `showSeparators`: `true` or `false`
- `pathLevels`: `1` to `4`
- `refreshIntervalMs`
- `display.showModel`
- `display.showProject`
- `display.showSessionName`
- `display.showDuration`
- `display.showPremiumRequests`
- `display.showTokenBreakdown`
- `display.showMode`
- `display.showTools`
- `display.showAgents`
- `display.showTodos`
- `display.showSummary`
- `gitStatus.enabled`
- `gitStatus.showDirty`
- `gitStatus.showAheadBehind`
- `gitStatus.showFileStats`

## Conversation flow

1. Read the current config if it exists.
2. Ask for layout first.
3. Ask whether the user wants a minimal, essential, or full HUD.
4. Ask whether to show tools, agents, and todos.
5. Ask whether to show premium requests and token breakdowns.
6. Ask whether to show git dirty/ahead-behind/file-stats details.
7. Present a short summary of the resulting config.
8. Save only after confirmation.

## Presets

### Minimal

- keep project and git
- hide tools, agents, todos, summary
- show duration
- show premium requests
- hide token breakdown

### Essential

- show project, git, premium requests, token breakdown, duration
- show tools and agents
- hide todos and summary

### Full

- show everything except file stats by default

## Finish

After saving, tell the user they can verify with:

```bash
node dist/index.js snapshot
```
