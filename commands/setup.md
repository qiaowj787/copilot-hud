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

## Approach

- Keep one user-facing choice: ask which integration target they want.
- Prefer shell-based detection and validation over asking the model to infer paths.
- Detect concrete values first, then show or write the resulting command.
- Only ask follow-up questions when shell detection fails or the user needs a fallback target.

## Steps

1. Detect the installed plugin path and confirm `dist/index.js` exists with shell commands first.

Preferred checks:

```bash
COPILOT_DIR="${COPILOT_HOME:-$HOME/.copilot}"
test -f "$COPILOT_DIR/installed-plugins/_direct/qiaowj787--copilot-hud/dist/index.js" && \
  printf '%s\n' "$COPILOT_DIR/installed-plugins/_direct/qiaowj787--copilot-hud"
```

If that path does not exist, inspect `~/.copilot/config.json` and `installed_plugins` to find the active plugin cache path before asking the user anything.

2. Detect an available runtime in shell: prefer `node`, fall back to `bun`.

```bash
command -v node 2>/dev/null || command -v bun 2>/dev/null
```

If neither exists, stop and explain that setup cannot continue until the current shell can resolve a JavaScript runtime.

3. Resolve the runtime to an absolute executable path and verify it exists:

```bash
RUNTIME_PATH="$(command -v node 2>/dev/null || command -v bun 2>/dev/null)"
test -x "$RUNTIME_PATH"
```

4. Ask the user which integration target they want. Recommend Copilot `statusLine` first.

5. Generate the absolute command in shell:

```bash
"/ABSOLUTE/RUNTIME/PATH" "/ABSOLUTE/PLUGIN/PATH/dist/index.js"
```

Do not ask the model to manually compose path strings when the shell can provide them directly.

6. For Copilot `statusLine`, update `~/.copilot/config.json` by merging:

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

Use a shell script or `python3` one-liner to merge JSON while preserving unrelated keys. Do not rewrite the whole file from scratch when a structured merge can do the job.

Preferred pattern:

```bash
python3 - <<'PY'
import json
from pathlib import Path

config_path = Path.home() / ".copilot" / "config.json"
runtime = "/ABSOLUTE/RUNTIME/PATH"
plugin = "/ABSOLUTE/PLUGIN/PATH/dist/index.js"
command = f'"{runtime}" "{plugin}"'

data = json.loads(config_path.read_text()) if config_path.exists() else {}
data["experimental"] = True
status = dict(data.get("statusLine") or {})
status.update({
    "type": "command",
    "command": command,
    "padding": 1,
})
data["statusLine"] = status
config_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
PY
```

7. Preserve existing config keys and do not overwrite unrelated settings.
8. If the user chose tmux or shell fallback instead, only edit the corresponding dotfile and avoid changing Copilot config.

## Validation

After writing the config:

1. Run the generated command once by piping a tiny sample JSON payload into stdin, for example:

```bash
printf '%s' '{"context":{"cwd":"'"$(pwd)"'"},"model":{"display_name":"gpt-5.4"}}' | "/ABSOLUTE/RUNTIME/PATH" "/ABSOLUTE/PLUGIN/PATH/dist/index.js"
```

2. If that succeeds, read back the relevant part of `~/.copilot/config.json` to verify the merged config actually contains:

- `"experimental": true`
- `statusLine.type = "command"`
- the generated absolute command

3. If Copilot `statusLine` was configured, remind the user that Copilot CLI currently requires `"experimental": true` for the status line to render.
4. Tell the user to restart Copilot CLI or start a new session to see the HUD below the input area.

5. If the HUD still does not appear, debug with shell first:

```bash
cat ~/.copilot/config.json
printf '%s' '{"context":{"cwd":"'"$(pwd)"'"},"model":{"display_name":"gpt-5.4"}}' | "/ABSOLUTE/RUNTIME/PATH" "/ABSOLUTE/PLUGIN/PATH/dist/index.js"
```

Only fall back to additional conversation after those checks fail.

## tmux fallback

If the user picks tmux, prefer:

```tmux
set -g status-right '#("/ABSOLUTE/RUNTIME/PATH" "/ABSOLUTE/PLUGIN/PATH/dist/index.js" snapshot --no-color | head -n 1)'
```

## Shell fallback

If the user picks shell aliases, prefer:

```bash
alias copilot-hud='"/ABSOLUTE/RUNTIME/PATH" "/ABSOLUTE/PLUGIN/PATH/dist/index.js" snapshot'
alias copilot-hud-watch='"/ABSOLUTE/RUNTIME/PATH" "/ABSOLUTE/PLUGIN/PATH/dist/index.js" watch'
```

When editing shell files, append the concrete alias lines with shell commands and then tell the user which file was updated.
