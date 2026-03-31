---
description: Configure copilot-hud as the Copilot CLI status line, with tmux or shell fallback options
allowed-tools: Bash, Read, Write, AskUserQuestion
---

Configure `copilot-hud` for the user's environment.

## Goal

Use GitHub Copilot CLI's official `statusLine` setting as the primary integration path.

If the user does not want to edit their Copilot config, or if they explicitly prefer an external HUD, offer these fallbacks:

1. Copilot `statusLine` (recommended)
2. `tmux` status line
3. shell alias/function for `snapshot`
4. shell alias/function for `watch`

## Steps

1. Detect the installed plugin path and confirm `dist/index.js` exists.
2. Detect an available runtime: prefer `node`, fall back to `bun`.
3. Ask the user which integration target they want. Recommend Copilot `statusLine` first.
4. Generate the absolute command:

```bash
node "/ABSOLUTE/PLUGIN/PATH/dist/index.js"
```

5. For Copilot `statusLine`, update `~/.copilot/config.json` by merging:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"/ABSOLUTE/PLUGIN/PATH/dist/index.js\"",
    "padding": 1
  }
}
```

6. Preserve existing config keys and do not overwrite unrelated settings.
7. If the user chose tmux or shell fallback instead, only edit the corresponding dotfile and avoid changing Copilot config.

## Validation

After writing the config:

1. Run the generated command once by piping a tiny sample JSON payload into stdin, for example:

```bash
printf '%s' '{"context":{"cwd":"'"$(pwd)"'"},"model":{"display_name":"gpt-5.4"}}' | node "/ABSOLUTE/PLUGIN/PATH/dist/index.js"
```

2. If Copilot `statusLine` was configured, tell the user to restart Copilot CLI or start a new session to see the HUD below the input area.

## tmux fallback

If the user picks tmux, prefer:

```tmux
set -g status-right '#(node "/ABSOLUTE/PLUGIN/PATH/dist/index.js" snapshot --no-color | head -n 1)'
```

## Shell fallback

If the user picks shell aliases, prefer:

```bash
alias copilot-hud='node "/ABSOLUTE/PLUGIN/PATH/dist/index.js" snapshot'
alias copilot-hud-watch='node "/ABSOLUTE/PLUGIN/PATH/dist/index.js" watch'
```
