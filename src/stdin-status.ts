import type { ContextWindowUsage, StatusLineInput } from './types.js';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function summarizeRateLimits(rateLimits: unknown): string | undefined {
  const value = asRecord(rateLimits);
  if (!value) {
    return undefined;
  }

  const summaries: string[] = [];
  for (const [key, rawEntry] of Object.entries(value)) {
    const entry = asRecord(rawEntry);
    if (!entry) {
      continue;
    }
    const used = asNumber(entry.used) ?? asNumber(entry.consumed);
    const limit = asNumber(entry.limit) ?? asNumber(entry.max);
    const remaining = asNumber(entry.remaining);
    if (used !== undefined && limit !== undefined && limit > 0) {
      summaries.push(`${key} ${Math.round((used / limit) * 100)}%`);
      continue;
    }
    if (remaining !== undefined && limit !== undefined && limit > 0) {
      summaries.push(`${key} ${Math.round(((limit - remaining) / limit) * 100)}%`);
    }
  }
  return summaries.length ? summaries.join(' | ') : undefined;
}

function parseContextWindow(root: Record<string, unknown>): ContextWindowUsage | undefined {
  const contextWindow = asRecord(root.context_window) ?? asRecord(root.contextWindow);
  if (!contextWindow) {
    return undefined;
  }
  const currentUsage = asRecord(contextWindow.current_usage) ?? asRecord(contextWindow.currentUsage);
  const currentInputTokens = asNumber(currentUsage?.input_tokens) ?? asNumber(currentUsage?.inputTokens);
  const maximumInputTokens = asNumber(contextWindow.context_window_size) ?? asNumber(contextWindow.contextWindowSize);
  if (currentInputTokens === undefined && maximumInputTokens === undefined) {
    return undefined;
  }
  return { currentInputTokens, maximumInputTokens };
}

export async function readStatusLineInput(): Promise<StatusLineInput | undefined> {
  if (process.stdin.isTTY) {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return undefined;
  }

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const context = asRecord(parsed.context);
  const model = asRecord(parsed.model);
  const session = asRecord(parsed.session);

  return {
    sessionId: asString(parsed.sessionId) ?? asString(session?.id),
    cwd: asString(parsed.cwd) ?? asString(context?.cwd) ?? asString(session?.cwd),
    gitBranch: asString(parsed.branch) ?? asString(context?.branch),
    modelName: asString(parsed.currentModel) ?? asString(model?.display_name) ?? asString(model?.displayName) ?? asString(model?.name),
    mode: asString(parsed.mode) ?? asString(session?.mode),
    summary: asString(parsed.summary) ?? asString(session?.summary),
    contextWindow: parseContextWindow(parsed),
    rateSummary: summarizeRateLimits(parsed.rate_limits ?? parsed.rateLimits)
  };
}
