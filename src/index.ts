#!/usr/bin/env node
import { cwd as currentWorkingDirectory } from 'node:process';
import { loadConfig } from './config.js';
import { mergeStatusLineInput, parseSessionMetrics } from './events.js';
import { getGitSnapshot } from './git.js';
import { renderSnapshot } from './render.js';
import { listSessions, selectSession } from './sessions.js';
import { readStatusLineInput } from './stdin-status.js';
import type { SessionMetrics, SessionWorkspace, SnapshotOptions, StatusLineInput } from './types.js';

function printHelp(): void {
  console.log(`copilot-hud

Usage:
  copilot-hud snapshot [--json] [--session ID] [--cwd PATH] [--config PATH] [--state-root PATH] [--no-color]
  copilot-hud watch [--session ID] [--cwd PATH] [--config PATH] [--state-root PATH] [--interval MS] [--no-color]
  copilot-hud sessions [--json] [--state-root PATH]
`);
}

function parseArgs(argv: string[]): { command: string; flags: Map<string, string | boolean> } {
  const hasExplicitCommand = argv[0] !== undefined && !argv[0].startsWith('--');
  const command = hasExplicitCommand ? argv[0] : 'snapshot';
  const rest = hasExplicitCommand ? argv.slice(1) : argv;
  const flags = new Map<string, string | boolean>();
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const [key, inlineValue] = token.slice(2).split('=', 2);
    if (inlineValue !== undefined) {
      flags.set(key, inlineValue);
      continue;
    }
    const next = rest[index + 1];
    if (next && !next.startsWith('--')) {
      flags.set(key, next);
      index += 1;
    } else {
      flags.set(key, true);
    }
  }
  return { command, flags };
}

function resolveSession(options: SnapshotOptions): SessionWorkspace | undefined {
  const sessions = listSessions(options.stateRoot);
  if (sessions.length === 0) {
    return undefined;
  }
  return selectSession(sessions, options.sessionId, options.cwd ?? currentWorkingDirectory());
}

function emptyMetrics(options: SnapshotOptions, statusLineInput: StatusLineInput): SessionMetrics {
  const cwd = options.cwd ?? statusLineInput.cwd ?? currentWorkingDirectory();
  return {
    id: statusLineInput.sessionId ?? 'statusline',
    cwd,
    summary: statusLineInput.summary,
    createdAt: undefined,
    updatedAt: undefined,
    active: true,
    modelName: statusLineInput.modelName,
    mode: statusLineInput.mode,
    premiumRequests: 0,
    tokenUsage: {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      currentTokens: 0,
      conversationTokens: 0,
      systemTokens: 0,
      toolDefinitionsTokens: 0
    },
    contextWindow: statusLineInput.contextWindow,
    rateSummary: statusLineInput.rateSummary,
    toolCompletions: new Map<string, number>(),
    activeTools: [],
    activeAgents: [],
    completedAgents: 0,
    todoProgress: undefined,
    lastActivityAt: undefined,
    gitRoot: cwd,
    gitBranch: statusLineInput.gitBranch,
    durationMs: undefined,
    ended: false
  };
}

export function resolveMetrics(options: SnapshotOptions, statusLineInput?: StatusLineInput): SessionMetrics {
  const session = resolveSession({
    ...options,
    sessionId: options.sessionId ?? statusLineInput?.sessionId,
    cwd: options.cwd ?? statusLineInput?.cwd
  });
  if (session) {
    return mergeStatusLineInput(parseSessionMetrics(session), statusLineInput);
  }
  if (statusLineInput) {
    return emptyMetrics(options, statusLineInput);
  }
  throw new Error('No Copilot CLI sessions found under ~/.copilot/session-state.');
}

async function buildSnapshot(options: SnapshotOptions, asJson: boolean): Promise<string> {
  const config = loadConfig(options.configPath);
  const statusLineInput = await readStatusLineInput();
  const metrics = resolveMetrics(options, statusLineInput);
  const git = getGitSnapshot(metrics.cwd ?? metrics.gitRoot);
  const result = renderSnapshot(metrics, git, config, !options.noColor && !asJson);
  return asJson ? `${JSON.stringify(result.json, null, 2)}\n` : `${result.lines.join('\n')}\n`;
}

async function watch(options: SnapshotOptions, intervalMs: number): Promise<void> {
  const draw = async (): Promise<void> => {
    const output = await buildSnapshot(options, false);
    process.stdout.write('\u001bc');
    process.stdout.write(output);
  };

  await draw();
  const timer = setInterval(() => {
    void draw();
  }, intervalMs);
  const cleanup = (): void => {
    clearInterval(timer);
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const options: SnapshotOptions = {
    configPath: typeof flags.get('config') === 'string' ? String(flags.get('config')) : undefined,
    sessionId: typeof flags.get('session') === 'string' ? String(flags.get('session')) : undefined,
    cwd: typeof flags.get('cwd') === 'string' ? String(flags.get('cwd')) : undefined,
    noColor: Boolean(flags.get('no-color')),
    stateRoot: typeof flags.get('state-root') === 'string' ? String(flags.get('state-root')) : undefined
  };

  if (command === 'help' || flags.has('help')) {
    printHelp();
    return;
  }

  if (command === 'sessions') {
    const sessions = listSessions(options.stateRoot).map((session) => ({
      id: session.id,
      cwd: session.cwd,
      summary: session.summary,
      active: session.active,
      updatedAt: session.updatedAt
    }));
    if (flags.has('json')) {
      process.stdout.write(`${JSON.stringify(sessions, null, 2)}\n`);
    } else {
      for (const session of sessions) {
        process.stdout.write(`${session.active ? '*' : ' '} ${session.id} ${session.cwd ?? ''} ${session.summary ?? ''}\n`);
      }
    }
    return;
  }

  if (command === 'watch') {
    const config = loadConfig(options.configPath);
    const interval = typeof flags.get('interval') === 'string' ? Number(flags.get('interval')) : config.refreshIntervalMs;
    await watch(options, Number.isFinite(interval) && interval > 0 ? interval : config.refreshIntervalMs);
    return;
  }

  const asJson = flags.has('json');
  process.stdout.write(await buildSnapshot(options, asJson));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`copilot-hud: ${message}\n`);
  process.exit(1);
});
