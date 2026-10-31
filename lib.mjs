// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Copyright (c) 2026 Nguyễn Mạnh Hiếu (Nguoibianhz)
export function settings(input, media) {
  const n = (v, min, max, label) => { const x = Number(v); if (!Number.isFinite(x) || x < min || x > max) throw new Error(`${label} không hợp lệ`); return x; };
  const side = Math.floor(n(input.side, 16, Math.min(media.width, media.height), 'Vùng cắt'));
  const x = Math.floor(n(input.x, 0, media.width-side, 'Vị trí ngang'));
  const y = Math.floor(n(input.y, 0, media.height-side, 'Vị trí dọc'));
  const start = n(input.start, 0, Math.max(0,media.duration-0.1), 'Điểm bắt đầu');
  const end = n(input.end, start+0.1, media.duration+0.02, 'Điểm kết thúc');
  const speed = n(input.speed, 0.25, 4, 'Tốc độ');
  const size = n(input.size, 128, 512, 'Kích thước');
  if (![128,256,384,512].includes(size)) throw new Error('Kích thước không hỗ trợ');
  const fps = n(input.fps, 8, 30, 'FPS');
  const thumb = n(input.thumb, start, end, 'Thumbnail');
  return {x,y,side,start,end,speed,size,fps,thumb};
}
export function command(value) {
  const v=String(value||'').trim().replace(/^!/, '');
  if (!/^[a-z0-9_-]{1,32}$/.test(v)) throw new Error('Lệnh chỉ gồm a–z, 0–9, dấu - hoặc _, tối đa 32 ký tự');
  return '!'+v;
}
export function webpFrames(bytes) {
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP') return 0;
  let count=0;
  for(let i=12;i+8<=bytes.length;) {const len=bytes.readUInt32LE(i+4);if(bytes.toString('ascii',i,i+4)==='ANMF')count++;i+=8+len+(len%2);}
  return count;
}
