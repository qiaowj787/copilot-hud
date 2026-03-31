import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listSessions, selectSession } from '../dist/sessions.js';
import { mergeStatusLineInput, parseSessionMetrics } from '../dist/events.js';
import { renderSnapshot } from '../dist/render.js';
import { DEFAULT_CONFIG } from '../dist/config.js';
import { resolveMetrics } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, 'fixtures');

test('listSessions discovers fixture sessions and active flag', () => {
  const sessions = listSessions(fixturesRoot);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].id, 'sample-session-b');
  assert.equal(sessions[0].active, true);
});

test('selectSession prefers active cwd match', () => {
  const sessions = listSessions(fixturesRoot);
  const selected = selectSession(sessions, undefined, '/tmp/project-b');
  assert.equal(selected?.id, 'sample-session-b');
});

test('parseSessionMetrics reads shutdown totals', () => {
  const session = listSessions(fixturesRoot).find((item) => item.id === 'sample-session-a');
  assert.ok(session);
  const metrics = parseSessionMetrics(session);
  assert.equal(metrics.modelName, 'gpt-5.4');
  assert.equal(metrics.premiumRequests, 4);
  assert.equal(metrics.tokenUsage.inputTokens, 85829);
  assert.equal(metrics.toolCompletions.get('view'), 1);
  assert.equal(metrics.completedAgents, 1);
  assert.equal(metrics.ended, true);
});

test('parseSessionMetrics keeps active tools and agents for live session', () => {
  const session = listSessions(fixturesRoot).find((item) => item.id === 'sample-session-b');
  assert.ok(session);
  const metrics = parseSessionMetrics(session);
  assert.equal(metrics.mode, 'autopilot');
  assert.equal(metrics.activeTools.length, 1);
  assert.equal(metrics.activeTools[0].name, 'bash');
  assert.equal(metrics.activeAgents.length, 1);
  assert.equal(metrics.activeAgents[0].name, 'task');
  assert.equal(metrics.ended, false);
});

test('renderSnapshot produces readable HUD lines', () => {
  const session = listSessions(fixturesRoot).find((item) => item.id === 'sample-session-a');
  assert.ok(session);
  const metrics = parseSessionMetrics(session);
  const result = renderSnapshot(metrics, {
    branch: 'main',
    dirty: true,
    ahead: 2,
    behind: 1,
    fileStats: { modified: 3, added: 1, deleted: 0, untracked: 1 }
  }, DEFAULT_CONFIG, false);
  assert.ok(result.lines.some((line) => line.includes('[gpt-5.4]')));
  assert.ok(result.lines.some((line) => line.includes('Requests')));
  assert.ok(result.lines.some((line) => line.includes('Tools')));
});

test('mergeStatusLineInput adds context information from Copilot statusLine stdin', () => {
  const session = listSessions(fixturesRoot).find((item) => item.id === 'sample-session-b');
  assert.ok(session);
  const metrics = mergeStatusLineInput(parseSessionMetrics(session), {
    modelName: 'gpt-5.4',
    contextWindow: {
      currentInputTokens: 45000,
      maximumInputTokens: 200000
    },
    rateSummary: 'monthly 20%'
  });
  const result = renderSnapshot(metrics, {
    branch: 'feature/hud',
    dirty: false,
    ahead: 0,
    behind: 0,
    fileStats: { modified: 0, added: 0, deleted: 0, untracked: 0 }
  }, DEFAULT_CONFIG, false);
  assert.ok(result.lines.some((line) => line.includes('Context 23%')));
  assert.ok(result.lines.some((line) => line.includes('Rate monthly 20%')));
});

test('compact layout collapses HUD into one line and respects display toggles', () => {
  const session = listSessions(fixturesRoot).find((item) => item.id === 'sample-session-a');
  assert.ok(session);
  const metrics = mergeStatusLineInput(parseSessionMetrics(session), {
    modelName: 'gpt-5.4',
    contextWindow: {
      currentInputTokens: 45000,
      maximumInputTokens: 200000
    },
    rateSummary: 'monthly 20%'
  });
  const result = renderSnapshot(metrics, {
    branch: 'main',
    dirty: true,
    ahead: 0,
    behind: 0,
    fileStats: { modified: 0, added: 0, deleted: 0, untracked: 0 }
  }, {
    ...DEFAULT_CONFIG,
    lineLayout: 'compact',
    showSeparators: true,
    display: {
      ...DEFAULT_CONFIG.display,
      showSessionName: false,
      showPremiumRequests: false,
      showTokenBreakdown: false,
      showDuration: false,
      showTools: false,
      showAgents: false,
      showTodos: false,
      showSummary: false
    }
  }, false);
  assert.equal(result.lines.length, 1);
  assert.ok(result.lines[0].includes('[gpt-5.4]'));
  assert.ok(result.lines[0].includes('Context 23%'));
  assert.ok(!result.lines[0].includes('Requests'));
  assert.ok(!result.lines[0].includes('Tokens'));
  assert.ok(!result.lines[0].includes('Duration'));
  assert.ok(!result.lines[0].includes('Tools'));
});

test('resolveMetrics falls back to stdin statusLine input when no session exists', () => {
  const metrics = resolveMetrics({ stateRoot: join(fixturesRoot, 'missing-root') }, {
    sessionId: 'stdin-session',
    cwd: '/tmp/stdin-project',
    modelName: 'gpt-5.4',
    mode: 'autopilot',
    summary: 'StatusLine only',
    contextWindow: {
      currentInputTokens: 45000,
      maximumInputTokens: 200000
    },
    rateSummary: 'monthly 20%'
  });
  assert.equal(metrics.id, 'stdin-session');
  assert.equal(metrics.cwd, '/tmp/stdin-project');
  assert.equal(metrics.modelName, 'gpt-5.4');
  assert.equal(metrics.activeTools.length, 0);
  assert.equal(metrics.contextWindow?.currentInputTokens, 45000);
});

test('snapshot renders from stdin statusLine input without local session-state', () => {
  const distIndex = join(here, '..', 'dist', 'index.js');
  const result = spawnSync(process.execPath, [distIndex, 'snapshot', '--state-root', join(fixturesRoot, 'missing-root'), '--no-color'], {
    input: JSON.stringify({
      sessionId: 'stdin-session',
      cwd: '/Users/bruce.qiao/Documents/code/github/copilot-hud',
      currentModel: 'gpt-5.4',
      mode: 'autopilot',
      summary: 'StatusLine only',
      context_window: {
        current_usage: {
          input_tokens: 45000
        },
        context_window_size: 200000
      },
      rate_limits: {
        monthly: {
          used: 20,
          limit: 100
        }
      }
    }),
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\[gpt-5\.4\]/);
  assert.match(result.stdout, /Context 23%/);
  assert.match(result.stdout, /Rate monthly 20%/);
});
