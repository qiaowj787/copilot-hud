---
name: copilot-hud
description: Use this when you need to inspect GitHub Copilot CLI session health, usage, tools, subagents, or todo progress through the copilot-hud runtime.
---

When the user asks about GitHub Copilot CLI session usage, live activity, current session state, or wants a HUD/status overview, use this workflow:

1. Prefer the local `copilot-hud` runtime over hand-reading session files.
2. If the user wants the HUD visible inside Copilot CLI itself, configure Copilot `statusLine` to run `node dist/index.js`.
3. Use `node dist/index.js snapshot --json` for structured inspection.
4. Use `node dist/index.js watch` when the user wants a continuously refreshing HUD in a dedicated terminal pane.
5. Use `node dist/index.js sessions --json` if you need to choose the right session first.
6. Explain the difference between:
   - live counters from active `events.jsonl`
   - definitive totals from `session.shutdown`
7. If the user wants the HUD wired into their environment, direct them to `/copilot-hud:setup`.

Notes:

- Copilot CLI supports `statusLine` command integration. `copilot-hud` should use that first, then enrich with local session-state data.
- `copilot-hud` reads local state from `~/.copilot/session-state`; avoid dumping private prompt contents unless the user explicitly asks.
