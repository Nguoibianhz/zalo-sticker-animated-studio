// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Copyright (c) 2026 Nguyễn Mạnh Hiếu (Nguoibianhz)
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const upstream = 'https://github.com/Nguoibianhz/zalo-sticker-animated-studio.git';

function git(...args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

try {
  const gitRoot = git('rev-parse', '--show-toplevel');
  if (path.relative(root, gitRoot) !== '') {
    throw new Error('Hãy chạy lệnh trong bản cài của repo này được tạo bằng git clone.');
  }
  const local = git('rev-parse', 'HEAD');
  console.log('Đang kiểm tra bản mới nhất trên GitHub…');
  git('fetch', '--no-tags', upstream, 'refs/heads/main');
  const latest = git('rev-parse', '--verify', 'FETCH_HEAD');

  if (local === latest) {
    console.log(`Đang dùng bản mới nhất (${local.slice(0, 7)}).`);
  } else {
    if (git('status', '--porcelain', '--untracked-files=no')) {
      throw new Error('Có thay đổi chưa lưu trong mã nguồn. Hãy commit hoặc stash trước khi cập nhật.');
    }
    if (git('merge-base', local, latest) !== local) {
      throw new Error('Bản local có commit riêng. Hãy hợp nhất với nhánh main trước khi cập nhật.');
    }
    console.log(`Đang cập nhật ${local.slice(0, 7)} → ${latest.slice(0, 7)}…`);
    git('merge', '--ff-only', '--no-overwrite-ignore', latest);
  }

  const setup = spawnSync(process.execPath, [path.join(root, 'scripts', 'setup.mjs')], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (setup.error) throw setup.error;
  if (setup.status !== 0) {
    throw new Error('Thiết lập chưa xong. Sửa lỗi ở trên rồi chạy lại npm run update.');
  }
  if (local !== latest) console.log('Đã cập nhật. Khởi động lại app để dùng bản mới.');
} catch (error) {
  console.error('Cập nhật chưa hoàn tất. ' + error.message);
  process.exitCode = 1;
}
