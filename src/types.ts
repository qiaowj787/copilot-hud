export type LayoutMode = 'expanded' | 'compact';

export interface GitStatusConfig {
  enabled: boolean;
  showDirty: boolean;
  showAheadBehind: boolean;
  showFileStats: boolean;
}

export interface DisplayConfig {
  showModel: boolean;
  showProject: boolean;
  showSessionName: boolean;
  showDuration: boolean;
  showPremiumRequests: boolean;
  showTokenBreakdown: boolean;
  showMode: boolean;
  showTools: boolean;
  showAgents: boolean;
  showTodos: boolean;
  showSummary: boolean;
}

export interface ColorConfig {
  label: string;
  value: string;
  accent: string;
  warning: string;
  critical: string;
  success: string;
  dim: string;
}

export interface HudConfig {
  lineLayout: LayoutMode;
  showSeparators: boolean;
  pathLevels: number;
  refreshIntervalMs: number;
  gitStatus: GitStatusConfig;
  display: DisplayConfig;
  colors: ColorConfig;
}

export interface SessionWorkspace {
  id: string;
  cwd?: string;
  summary?: string;
  createdAt?: string;
  updatedAt?: string;
  path: string;
  active: boolean;
}

export interface ToolActivity {
  name: string;
  startedAt: string;
  intent?: string;
}

export interface AgentActivity {
  name: string;
  displayName?: string;
  startedAt: string;
}

export interface TodoProgress {
  total: number;
  done: number;
  inProgress: number;
  pending: number;
  blocked: number;
  currentTitle?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  currentTokens: number;
  conversationTokens: number;
  systemTokens: number;
  toolDefinitionsTokens: number;
}

export interface ContextWindowUsage {
  currentInputTokens?: number;
  maximumInputTokens?: number;
}

export interface SessionMetrics {
  id: string;
  cwd?: string;
  summary?: string;
  createdAt?: string;
  updatedAt?: string;
  active: boolean;
  modelName?: string;
  mode?: string;
  premiumRequests: number;
  tokenUsage: TokenUsage;
  contextWindow?: ContextWindowUsage;
  rateSummary?: string;
  toolCompletions: Map<string, number>;
  activeTools: ToolActivity[];
  activeAgents: AgentActivity[];
  completedAgents: number;
  todoProgress?: TodoProgress;
  lastActivityAt?: string;
  gitRoot?: string;
  gitBranch?: string;
  durationMs?: number;
  ended: boolean;
}

export interface StatusLineInput {
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  modelName?: string;
  mode?: string;
  summary?: string;
  contextWindow?: ContextWindowUsage;
  rateSummary?: string;
}

export interface GitFileStats {
  modified: number;
  added: number;
  deleted: number;
  untracked: number;
}

export interface GitSnapshot {
  branch?: string;
  dirty: boolean;
  ahead: number;
  behind: number;
  fileStats: GitFileStats;
}

export interface SnapshotOptions {
  configPath?: string;
  sessionId?: string;
  cwd?: string;
  noColor?: boolean;
  stateRoot?: string;
}

export interface RenderResult {
  lines: string[];
  json: Record<string, unknown>;
}
