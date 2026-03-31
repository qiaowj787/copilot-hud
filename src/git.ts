import { spawnSync } from 'node:child_process';
import type { GitSnapshot } from './types.js';

const EMPTY_GIT: GitSnapshot = {
  dirty: false,
  ahead: 0,
  behind: 0,
  fileStats: {
    modified: 0,
    added: 0,
    deleted: 0,
    untracked: 0
  }
};

export function getGitSnapshot(cwd?: string): GitSnapshot {
  if (!cwd) {
    return EMPTY_GIT;
  }

  const result = spawnSync('git', ['status', '--porcelain=2', '--branch'], {
    cwd,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    return EMPTY_GIT;
  }

  const snapshot: GitSnapshot = {
    branch: undefined,
    dirty: false,
    ahead: 0,
    behind: 0,
    fileStats: {
      modified: 0,
      added: 0,
      deleted: 0,
      untracked: 0
    }
  };

  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line) continue;
    if (line.startsWith('# branch.head ')) {
      snapshot.branch = line.replace('# branch.head ', '').trim();
      continue;
    }
    if (line.startsWith('# branch.ab ')) {
      const match = /\+(\d+)\s+-(\d+)/.exec(line);
      if (match) {
        snapshot.ahead = Number(match[1]);
        snapshot.behind = Number(match[2]);
      }
      continue;
    }
    if (line.startsWith('? ')) {
      snapshot.fileStats.untracked += 1;
      snapshot.dirty = true;
      continue;
    }
    if (line.startsWith('1 ') || line.startsWith('2 ')) {
      snapshot.dirty = true;
      const parts = line.split(' ');
      const xy = parts[1] ?? '';
      const x = xy[0];
      const y = xy[1];
      if (x === 'A' || y === 'A') snapshot.fileStats.added += 1;
      if (x === 'D' || y === 'D') snapshot.fileStats.deleted += 1;
      if (['M', 'R', 'C'].includes(x) || ['M', 'R', 'C'].includes(y)) snapshot.fileStats.modified += 1;
    }
  }

  return snapshot;
}
