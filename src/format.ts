export function compactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return String(value);
}

export function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) {
    return '0s';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length < 2 && seconds > 0) parts.push(`${seconds}s`);
  return parts.slice(0, 2).join(' ');
}

export function formatPath(input: string | undefined, levels: number): string | undefined {
  if (!input) {
    return undefined;
  }
  const parts = input.split('/').filter(Boolean);
  if (parts.length === 0) {
    return input;
  }
  return parts.slice(-Math.max(1, levels)).join('/');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatTokenSummary(inputTokens: number, outputTokens: number, cacheReadTokens: number, cacheWriteTokens: number): string {
  const segments = [`in ${compactNumber(inputTokens)}`, `out ${compactNumber(outputTokens)}`];
  if (cacheReadTokens > 0) {
    segments.push(`cacheR ${compactNumber(cacheReadTokens)}`);
  }
  if (cacheWriteTokens > 0) {
    segments.push(`cacheW ${compactNumber(cacheWriteTokens)}`);
  }
  return segments.join(' | ');
}
