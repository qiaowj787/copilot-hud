import { Palette } from './colors.js';
import { clamp, compactNumber, formatDuration, formatPath, formatTokenSummary } from './format.js';
import type { GitSnapshot, HudConfig, RenderResult, SessionMetrics } from './types.js';

function renderGit(git: GitSnapshot, config: HudConfig): string | undefined {
  if (!config.gitStatus.enabled || !git.branch) {
    return undefined;
  }

  let suffix = '';
  if (config.gitStatus.showDirty && git.dirty) suffix += '*';
  if (config.gitStatus.showAheadBehind && (git.ahead || git.behind)) {
    if (git.ahead) suffix += ` ↑${git.ahead}`;
    if (git.behind) suffix += ` ↓${git.behind}`;
  }
  if (config.gitStatus.showFileStats) {
    const parts = [];
    if (git.fileStats.modified) parts.push(`!${git.fileStats.modified}`);
    if (git.fileStats.added) parts.push(`+${git.fileStats.added}`);
    if (git.fileStats.deleted) parts.push(`x${git.fileStats.deleted}`);
    if (git.fileStats.untracked) parts.push(`?${git.fileStats.untracked}`);
    if (parts.length) suffix += ` ${parts.join(' ')}`;
  }
  return `git:(${git.branch}${suffix})`;
}

function renderTools(metrics: SessionMetrics): string | undefined {
  const active = metrics.activeTools.slice(0, 2).map((tool) => `◐ ${tool.name}`);
  const completed = Array.from(metrics.toolCompletions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `✓ ${name}${count > 1 ? ` ×${count}` : ''}`);
  const chunks = [...active, ...completed];
  return chunks.length ? chunks.join(' | ') : undefined;
}

function renderAgents(metrics: SessionMetrics): string | undefined {
  const active = metrics.activeAgents.map((agent) => `◐ ${agent.displayName ?? agent.name}`);
  const completed = metrics.completedAgents > 0 ? [`✓ done ${metrics.completedAgents}`] : [];
  const chunks = [...active, ...completed];
  return chunks.length ? chunks.join(' | ') : undefined;
}

function renderTodos(metrics: SessionMetrics): string | undefined {
  const todo = metrics.todoProgress;
  if (!todo || todo.total === 0) {
    return undefined;
  }
  const title = todo.currentTitle ? `${todo.currentTitle} ` : '';
  return `${title}(${todo.done}/${todo.total} done${todo.blocked ? `, ${todo.blocked} blocked` : ''})`;
}

function renderUsage(metrics: SessionMetrics, palette: Palette): string {
  const parts: string[] = [];
  if (metrics.contextWindow?.currentInputTokens !== undefined && metrics.contextWindow.maximumInputTokens) {
    const percent = clamp((metrics.contextWindow.currentInputTokens / metrics.contextWindow.maximumInputTokens) * 100, 0, 100);
    parts.push(`${palette.label('Context')} ${palette.value(`${Math.round(percent)}% (${compactNumber(metrics.contextWindow.currentInputTokens)}/${compactNumber(metrics.contextWindow.maximumInputTokens)})`)}`);
  }
  if (metrics.premiumRequests > 0) {
    parts.push(`${palette.label('Requests')} ${palette.value(String(metrics.premiumRequests))}`);
  }
  if (metrics.rateSummary) {
    parts.push(`${palette.label('Rate')} ${palette.value(metrics.rateSummary)}`);
  }
  if (metrics.tokenUsage.inputTokens || metrics.tokenUsage.outputTokens || metrics.tokenUsage.cacheReadTokens || metrics.tokenUsage.cacheWriteTokens) {
    parts.push(`${palette.label('Tokens')} ${palette.value(formatTokenSummary(metrics.tokenUsage.inputTokens, metrics.tokenUsage.outputTokens, metrics.tokenUsage.cacheReadTokens, metrics.tokenUsage.cacheWriteTokens))}`);
  } else if (metrics.tokenUsage.currentTokens) {
    parts.push(`${palette.label('Tokens')} ${palette.value(compactNumber(metrics.tokenUsage.currentTokens))}`);
  }
  if (metrics.durationMs) {
    parts.push(`${palette.label('Duration')} ${palette.value(formatDuration(metrics.durationMs))}`);
  }
  return parts.join(' | ');
}

export function renderSnapshot(metrics: SessionMetrics, git: GitSnapshot, config: HudConfig, useColor: boolean): RenderResult {
  const palette = new Palette(useColor, config.colors);
  const lines: string[] = [];
  const headline: string[] = [];

  if (config.display.showModel && metrics.modelName) {
    headline.push(palette.accent(`[${metrics.modelName}]`));
  }

  if (config.display.showProject) {
    const project = formatPath(metrics.cwd ?? metrics.gitRoot, config.pathLevels);
    if (project) headline.push(palette.value(project));
  }

  const gitText = renderGit(git, config);
  if (gitText) headline.push(palette.label(gitText));

  if (config.display.showSessionName && metrics.summary) {
    headline.push(palette.dim(`summary:${metrics.summary}`));
  }

  if (config.display.showMode && metrics.mode) {
    headline.push(palette.label(`mode:${metrics.mode}`));
  }

  if (headline.length) {
    lines.push(config.showSeparators || config.lineLayout === 'compact' ? headline.join(' | ') : headline.join('  '));
  }

  const usage = renderUsage(metrics, palette);
  if (usage) {
    lines.push(usage);
  }

  if (config.display.showTools) {
    const tools = renderTools(metrics);
    if (tools) lines.push(`${palette.label('Tools')} ${palette.value(tools)}`);
  }

  if (config.display.showAgents) {
    const agents = renderAgents(metrics);
    if (agents) lines.push(`${palette.label('Agents')} ${palette.value(agents)}`);
  }

  if (config.display.showTodos) {
    const todos = renderTodos(metrics);
    if (todos) lines.push(`${palette.label('Todos')} ${palette.value(todos)}`);
  }

  if (config.display.showSummary && metrics.summary) {
    lines.push(`${palette.label('Summary')} ${palette.value(metrics.summary)}`);
  }

  return {
    lines,
    json: {
      sessionId: metrics.id,
      cwd: metrics.cwd,
      active: metrics.active,
      ended: metrics.ended,
      model: metrics.modelName,
      premiumRequests: metrics.premiumRequests,
      tokenUsage: metrics.tokenUsage,
      activeTools: metrics.activeTools,
      activeAgents: metrics.activeAgents,
      completedAgents: metrics.completedAgents,
      todoProgress: metrics.todoProgress,
      git,
      durationMs: metrics.durationMs,
      summary: metrics.summary,
      mode: metrics.mode,
      lines
    }
  };
}
