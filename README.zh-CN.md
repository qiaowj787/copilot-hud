# copilot-hud

一个用于 GitHub Copilot CLI 的 HUD 插件。

`copilot-hud` 可以把 Copilot 会话中的关键信息整理成简洁的终端状态视图，目标是为 Copilot CLI 提供接近 `claude-hud` 的使用体验，同时保持安装方式简单、默认配置可直接使用。

[English README](./README.md)

## 它能做什么

`copilot-hud` 可以展示：

- 当前项目路径和 git 分支
- 当前模型与模式
- Copilot 通过 `statusLine` stdin 传入的上下文窗口使用率
- 基于本地会话数据计算的请求数和 token 用量
- 当前活跃与已完成的工具调用
- subagent 活动状态
- session 数据库中的 todo 进度
- 会话时长与 summary

## 工作方式

GitHub Copilot CLI 支持配置 `statusLine` 命令，并会通过 stdin 传入当前会话状态 JSON。

`copilot-hud` 会优先使用这个官方集成方式，再结合 `~/.copilot/session-state` 中的本地数据补充展示内容。

除此之外，它还支持独立运行模式，适合用于 `tmux`、shell prompt 或单独的监控窗口。

## 安装

### 最简安装方式

在 Copilot CLI 中执行：

```text
/plugin install qiaowj787/copilot-hud
/copilot-hud:setup
```

这是最快的安装路径。

### 环境要求

- GitHub Copilot CLI
- Node.js `>= 22`

## 使用方式

### 1. 作为 Copilot `statusLine` 使用

这是推荐方式。

安装完成后执行：

```text
/copilot-hud:setup
```

它会帮你写入 `statusLine` 配置。建议同时开启 Copilot CLI 的实验特性，并写入运行时的绝对路径，这样就不会依赖当前 shell 的 `PATH`。

### 2. 快照模式

适合快速查看、shell prompt 或 tmux 状态栏调用。

```bash
node dist/index.js snapshot
node dist/index.js snapshot --json
node dist/index.js snapshot --cwd /path/to/project
```

### 3. 监视模式

适合单独开一个终端窗口持续刷新。

```bash
node dist/index.js watch
node dist/index.js watch --interval 1000
```

### 4. 列出会话

```bash
node dist/index.js sessions
node dist/index.js sessions --json
```

## 输出示例

```text
[gpt-5.4]  github/copilot-hud  git:(main*)  summary:Preview copilot-hud  mode:autopilot
Context 23% (45k/200k) | Requests 4 | Rate monthly 20% | weekly 30% | Tokens in 0 | out 69k | Duration 40m 2s
Tools ◐ bash | ◐ bash | ✓ bash ×117 | ✓ report_intent ×38 | ✓ apply_patch ×16
Agents ✓ done 1
Todos (5/5 done)
```

## 手动配置

如果你希望手动写 Copilot 配置，可以把下面内容加入 `~/.copilot/config.json`：

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

`statusLine` 目前依赖 Copilot CLI 的实验特性。如果重启后 HUD 仍未显示，请确认配置里存在 `"experimental": true`，然后重新开启一个新的 Copilot 会话。

## HUD 配置文件

可选配置文件路径：

```text
~/.copilot/plugins/copilot-hud/config.json
```

示例：

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

## 开发

```bash
npm install
npm run build
npm test
```

## 项目结构

- `plugin.json` — Copilot 插件清单
- `commands/` — setup / configure 引导命令
- `skills/copilot-hud/` — 可复用 skill
- `src/` — 源码
- `dist/` — 编译产物

## 许可证

MIT，详见 [`LICENSE`](./LICENSE)。
