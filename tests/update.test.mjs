// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Copyright (c) 2026 Nguyễn Mạnh Hiếu (Nguoibianhz)
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('update checks GitHub main, advances a clean install and preserves its projects', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-update-'));
  t.after(() => fs.rm(temp, {recursive: true, force: true}));
  const upstream = path.join(temp, 'upstream');
  const install = path.join(temp, 'install');
  const git = (cwd, ...args) => execFileSync('git', args, {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const commit = () => {
    git(upstream, 'add', '.');
    git(upstream, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.com', 'commit', '-m', 'Fixture');
  };

  await fs.mkdir(path.join(upstream, 'scripts'), {recursive: true});
  git(upstream, 'init', '-b', 'main');
  await fs.copyFile(new URL('../scripts/update.mjs', import.meta.url), path.join(upstream, 'scripts', 'update.mjs'));
  await fs.writeFile(path.join(upstream, 'scripts', 'setup.mjs'), "console.log('Setup called');");
  await fs.writeFile(path.join(upstream, '.gitignore'), 'data/\n');
  await fs.writeFile(path.join(upstream, 'app.txt'), 'old');
  commit();
  git(temp, 'clone', upstream, install);
  git(install, 'config', `url.${pathToFileURL(upstream).href}.insteadOf`,
    'https://github.com/Nguoibianhz/zalo-sticker-animated-studio.git');
  await fs.mkdir(path.join(install, 'data'));
  const project = path.join(install, 'data', 'project.json');
  await fs.writeFile(project, '{"preserve":true}');

  const runUpdate = () => spawnSync(process.execPath, ['scripts/update.mjs'], {cwd: install, encoding: 'utf8'});
  const current = runUpdate();
  assert.equal(current.status, 0, current.stderr);
  assert.match(current.stdout, /Đang dùng bản mới nhất/);

  await fs.writeFile(path.join(upstream, 'app.txt'), 'new');
  commit();
  const updated = runUpdate();
  assert.equal(updated.status, 0, updated.stderr);
  assert.match(updated.stdout, /Setup called/);
  assert.equal(git(install, 'rev-parse', 'HEAD'), git(upstream, 'rev-parse', 'HEAD'));
  assert.equal(await fs.readFile(project, 'utf8'), '{"preserve":true}');

  await fs.writeFile(path.join(upstream, 'app.txt'), 'newer');
  commit();
  await fs.writeFile(path.join(install, 'app.txt'), 'local edit');
  const blocked = runUpdate();
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /Có thay đổi chưa lưu/);
  assert.equal(await fs.readFile(path.join(install, 'app.txt'), 'utf8'), 'local edit');
});
