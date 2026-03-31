import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentActivity, SessionMetrics, SessionWorkspace, StatusLineInput, TodoProgress, ToolActivity, TokenUsage } from './types.js';

interface EventRecord {
  timestamp?: string;
  type?: string;
  data?: Record<string, unknown>;
}

function emptyUsage(): TokenUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    currentTokens: 0,
    conversationTokens: 0,
    systemTokens: 0,
    toolDefinitionsTokens: 0
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readTodoProgress(sessionPath: string): TodoProgress | undefined {
  const dbPath = join(sessionPath, 'session.db');
  if (!existsSync(dbPath)) {
    return undefined;
  }

  try {
    const check = spawnSync('sqlite3', [dbPath, "SELECT name FROM sqlite_master WHERE type='table' AND name='todos';"], {
      encoding: 'utf8'
    });
    if (check.status !== 0 || !check.stdout.trim()) {
      return undefined;
    }

    const countsResult = spawnSync('sqlite3', [dbPath, "SELECT status || '|' || COUNT(*) FROM todos GROUP BY status;"], {
      encoding: 'utf8'
    });
    if (countsResult.status !== 0) {
      return undefined;
    }
    const rows = countsResult.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [status, count] = line.split('|');
        return { status, count: Number(count) };
      });
    const currentResult = spawnSync('sqlite3', [dbPath, "SELECT title FROM todos WHERE status = 'in_progress' LIMIT 1;"], {
      encoding: 'utf8'
    });
    const currentTitle = currentResult.status === 0 ? currentResult.stdout.trim() || undefined : undefined;
    const counts = Object.fromEntries(rows.map((row) => [row.status, row.count]));
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return {
      total,
      done: counts.done ?? 0,
      inProgress: counts.in_progress ?? 0,
      pending: counts.pending ?? 0,
      blocked: counts.blocked ?? 0,
      currentTitle
    };
  } catch {
    return undefined;
  }
}

export function parseSessionMetrics(session: SessionWorkspace): SessionMetrics {
  const metrics: SessionMetrics = {
    id: session.id,
    cwd: session.cwd,
    summary: session.summary,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    active: session.active,
    modelName: undefined,
    mode: undefined,
    premiumRequests: 0,
    tokenUsage: emptyUsage(),
    contextWindow: undefined,
    rateSummary: undefined,
    toolCompletions: new Map<string, number>(),
    activeTools: [],
    activeAgents: [],
    completedAgents: 0,
    todoProgress: readTodoProgress(session.path),
    lastActivityAt: session.updatedAt,
    gitRoot: undefined,
    gitBranch: undefined,
    durationMs: undefined,
    ended: false
  };

  const eventsPath = join(session.path, 'events.jsonl');
  if (!existsSync(eventsPath)) {
    return metrics;
  }

  const activeTools = new Map<string, ToolActivity>();
  const activeAgents = new Map<string, AgentActivity>();
  const lines = readFileSync(eventsPath, 'utf8').split(/\r?\n/).filter(Boolean);

  for (const line of lines) {
    let event: EventRecord;
    try {
      event = JSON.parse(line) as EventRecord;
    } catch {
      continue;
    }

    const timestamp = event.timestamp;
    const data = event.data ?? {};
    if (timestamp) {
      metrics.lastActivityAt = timestamp;
    }

    switch (event.type) {
      case 'session.start': {
        const context = data.context as Record<string, unknown> | undefined;
        metrics.cwd = asString(context?.cwd) ?? metrics.cwd;
        metrics.gitRoot = asString(context?.gitRoot) ?? metrics.gitRoot;
        metrics.gitBranch = asString(context?.branch) ?? metrics.gitBranch;
        break;
      }
      case 'user.message':
        metrics.premiumRequests += 1;
        break;
      case 'assistant.message':
        metrics.tokenUsage.outputTokens += asNumber(data.outputTokens);
        break;
      case 'tool.execution_start': {
        const toolCallId = asString(data.toolCallId);
        const toolName = asString(data.toolName) ?? 'tool';
        const args = data.arguments as Record<string, unknown> | undefined;
        if (toolCallId) {
          activeTools.set(toolCallId, {
            name: toolName,
            startedAt: timestamp ?? metrics.updatedAt ?? new Date().toISOString(),
            intent: asString(args?.intent)
          });
        }
        break;
      }
      case 'tool.execution_complete': {
        const toolCallId = asString(data.toolCallId);
        const model = asString(data.model);
        if (model) {
          metrics.modelName = model;
        }
        if (toolCallId) {
          const started = activeTools.get(toolCallId);
          if (started) {
            activeTools.delete(toolCallId);
            metrics.toolCompletions.set(started.name, (metrics.toolCompletions.get(started.name) ?? 0) + 1);
          }
        }
        break;
      }
      case 'subagent.started': {
        const toolCallId = asString(data.toolCallId);
        if (toolCallId) {
          activeAgents.set(toolCallId, {
            name: asString(data.agentName) ?? 'agent',
            displayName: asString(data.agentDisplayName),
            startedAt: timestamp ?? metrics.updatedAt ?? new Date().toISOString()
          });
        }
        break;
      }
      case 'subagent.completed': {
        const toolCallId = asString(data.toolCallId);
        if (toolCallId && activeAgents.has(toolCallId)) {
          activeAgents.delete(toolCallId);
        }
        metrics.completedAgents += 1;
        break;
      }
      case 'session.mode_changed':
        metrics.mode = asString(data.newMode) ?? metrics.mode;
        break;
      case 'session.shutdown': {
        metrics.ended = true;
        metrics.modelName = asString(data.currentModel) ?? metrics.modelName;
        metrics.premiumRequests = asNumber(data.totalPremiumRequests) || metrics.premiumRequests;
        metrics.tokenUsage.currentTokens = asNumber(data.currentTokens);
        metrics.tokenUsage.conversationTokens = asNumber(data.conversationTokens);
        metrics.tokenUsage.systemTokens = asNumber(data.systemTokens);
        metrics.tokenUsage.toolDefinitionsTokens = asNumber(data.toolDefinitionsTokens);
        const modelMetrics = data.modelMetrics as Record<string, unknown> | undefined;
        if (modelMetrics) {
          for (const [modelName, rawMetrics] of Object.entries(modelMetrics)) {
            const modelEntry = rawMetrics as Record<string, unknown>;
            const usage = modelEntry.usage as Record<string, unknown> | undefined;
            metrics.modelName = modelName;
            if (usage) {
              metrics.tokenUsage.inputTokens += asNumber(usage.inputTokens);
              metrics.tokenUsage.outputTokens += asNumber(usage.outputTokens);
              metrics.tokenUsage.cacheReadTokens += asNumber(usage.cacheReadTokens);
              metrics.tokenUsage.cacheWriteTokens += asNumber(usage.cacheWriteTokens);
            }
          }
        }
        const startTime = asString(data.sessionStartTime) ?? metrics.createdAt;
        if (startTime && timestamp) {
          metrics.durationMs = Date.parse(timestamp) - Date.parse(startTime);
        }
        break;
      }
      default:
        break;
    }
  }

  metrics.activeTools = Array.from(activeTools.values());
  metrics.activeAgents = Array.from(activeAgents.values());
  if (!metrics.durationMs && metrics.createdAt && metrics.lastActivityAt) {
    metrics.durationMs = Date.parse(metrics.lastActivityAt) - Date.parse(metrics.createdAt);
  }
  return metrics;
}

export function mergeStatusLineInput(metrics: SessionMetrics, input?: StatusLineInput): SessionMetrics {
  if (!input) {
    return metrics;
  }

  return {
    ...metrics,
    id: input.sessionId ?? metrics.id,
    cwd: input.cwd ?? metrics.cwd,
    summary: input.summary ?? metrics.summary,
    modelName: input.modelName ?? metrics.modelName,
    mode: input.mode ?? metrics.mode,
    gitBranch: input.gitBranch ?? metrics.gitBranch,
    contextWindow: input.contextWindow ?? metrics.contextWindow,
    rateSummary: input.rateSummary ?? metrics.rateSummary
  };
}
