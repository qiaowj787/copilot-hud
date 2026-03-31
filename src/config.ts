import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { HudConfig } from './types.js';

export const DEFAULT_CONFIG: HudConfig = {
  lineLayout: 'expanded',
  showSeparators: false,
  pathLevels: 2,
  refreshIntervalMs: 1500,
  gitStatus: {
    enabled: true,
    showDirty: true,
    showAheadBehind: true,
    showFileStats: false
  },
  display: {
    showModel: true,
    showProject: true,
    showSessionName: true,
    showDuration: true,
    showPremiumRequests: true,
    showTokenBreakdown: true,
    showMode: true,
    showTools: true,
    showAgents: true,
    showTodos: true,
    showSummary: false
  },
  colors: {
    label: 'brightBlack',
    value: 'brightWhite',
    accent: 'cyan',
    warning: 'yellow',
    critical: 'red',
    success: 'green',
    dim: 'dim'
  }
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: unknown): T {
  if (!isObject(base) || !isObject(override)) {
    return (override as T) ?? base;
  }
  const output = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    const current = output[key];
    output[key] = isObject(current) && isObject(value) ? deepMerge(current, value) : value;
  }
  return output as T;
}

function normalizeConfig(config: HudConfig): HudConfig {
  return {
    ...config,
    pathLevels: Math.min(4, Math.max(1, Number(config.pathLevels) || DEFAULT_CONFIG.pathLevels)),
    refreshIntervalMs: Math.max(250, Number(config.refreshIntervalMs) || DEFAULT_CONFIG.refreshIntervalMs)
  };
}

export function defaultConfigPath(): string {
  return process.env.COPILOT_HUD_CONFIG ?? join(process.env.COPILOT_HOME ?? join(homedir(), '.copilot'), 'plugins', 'copilot-hud', 'config.json');
}

export function loadConfig(configPath?: string): HudConfig {
  const finalPath = configPath ?? defaultConfigPath();
  if (!existsSync(finalPath)) {
    return DEFAULT_CONFIG;
  }
  const raw = readFileSync(finalPath, 'utf8');
  const parsed = JSON.parse(raw) as Partial<HudConfig>;
  return normalizeConfig(deepMerge(DEFAULT_CONFIG, parsed));
}
