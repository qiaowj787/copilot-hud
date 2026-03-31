import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import type { SessionWorkspace } from './types.js';

function parseSimpleYaml(raw: string): Record<string, string> {
  const output: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    output[match[1]] = match[2];
  }
  return output;
}

export function stateRoot(customRoot?: string): string {
  return customRoot ?? join(process.env.COPILOT_HOME ?? join(homedir(), '.copilot'), 'session-state');
}

export function listSessions(customRoot?: string): SessionWorkspace[] {
  const root = stateRoot(customRoot);
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const sessionPath = join(root, entry.name);
      const workspacePath = join(sessionPath, 'workspace.yaml');
      const data = existsSync(workspacePath) ? parseSimpleYaml(readFileSync(workspacePath, 'utf8')) : {};
      const active = readdirSync(sessionPath).some((file) => file.startsWith('inuse.') && file.endsWith('.lock'));
      return {
        id: data.id ?? entry.name,
        cwd: data.cwd,
        summary: data.summary,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        path: sessionPath,
        active
      } satisfies SessionWorkspace;
    })
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export function selectSession(sessions: SessionWorkspace[], sessionId?: string, cwd?: string): SessionWorkspace | undefined {
  if (sessionId) {
    return sessions.find((session) => session.id === sessionId || basename(session.path) === sessionId);
  }

  if (cwd) {
    const exactMatch = sessions.find((session) => session.cwd === cwd && session.active);
    if (exactMatch) {
      return exactMatch;
    }
    const closestMatch = sessions.find((session) => session.cwd === cwd);
    if (closestMatch) {
      return closestMatch;
    }
    const nested = sessions.find((session) => session.cwd && (cwd.startsWith(session.cwd) || session.cwd.startsWith(cwd)) && session.active);
    if (nested) {
      return nested;
    }
  }

  return sessions.find((session) => session.active) ?? sessions[0];
}
