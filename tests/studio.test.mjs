// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Copyright (c) 2026 Nguyễn Mạnh Hiếu (Nguoibianhz)
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {settings,command,webpFrames} from '../lib.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('crop and command validation reject invalid boundaries',()=>{
 const media={width:1920,height:1080,duration:5},s={x:420,y:0,side:1080,start:0,end:4,speed:2,size:256,fps:15,thumb:1};
 assert.equal(settings(s,media).side,1080);assert.throws(()=>settings({...s,x:1000},media));assert.throws(()=>settings({...s,speed:0},media));assert.throws(()=>settings({...s,end:8},media));assert.equal(command('rockmeme'),'!rockmeme');assert.throws(()=>command('hello world'));assert.equal(webpFrames(Buffer.from('not webp')),0);
});
test('real FFmpeg render, archive round trip, and local API boundary',{timeout:60000},async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sticker-studio-test-'));
 const ffmpeg=process.env.FFMPEG_PATH||path.join(root,'vendor',process.platform==='win32'?'ffmpeg.exe':'ffmpeg'),source=path.join(temp,'fixture.mkv');
 const f=spawn(ffmpeg,['-loglevel','error','-f','lavfi','-i','testsrc=size=161x121:rate=30','-t','3','-c:v','ffv1','-pix_fmt','yuv444p','-y',source],{windowsHide:true});assert.equal((await once(f,'exit'))[0],0);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:'4318',DATA_DIR:path.join(temp,'data')},windowsHide:true});
 try {
 await new Promise((resolve,reject)=>{child.stdout.on('data',d=>{if(String(d).includes('http://'))resolve()});child.on('error',reject);child.on('exit',c=>reject(new Error('Server exited '+c)));});
 const base='http://127.0.0.1:4318';const html=await(await fetch(base)).text();const token=html.match(/name="studio-token" content="([^"]+)"/)[1];
 const post=async(url,obj,method='POST')=>{const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json','X-Studio-Token':token},body:JSON.stringify(obj)});const j=await r.json();assert.equal(r.ok,true,JSON.stringify(j));return j;};
 const denied=await fetch(base+'/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,403);
 const unreadable=await fetch(base+'/api/projects',{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Token':token},body:JSON.stringify({video:Buffer.from('invalid video').toString('base64')})});
 assert.equal(unreadable.status,400);assert.match((await unreadable.json()).error,/Không đọc được khung hình video \(FFmpeg /);
 let p=await post('/api/projects',{name:'Test motion',video:(await fs.readFile(source)).toString('base64')});assert.equal(p.media.width,161);assert.equal(p.media.height,121);
 const s={...p.settings,x:20,y:0,side:120,start:.5,end:2.5,speed:2,thumb:1};
 p=await post('/api/projects/'+p.id,{command:'test-motion',settings:s},'PATCH');
 p=await post('/api/projects/'+p.id+'/render',{settings:s});assert.equal(p.ready,true);assert.ok(p.frames>=13&&p.frames<=17,`Expected ~15 frames for one-second result, got ${p.frames}`);
 const bytes=Buffer.from(await(await fetch(base+`/media/${p.id}/sticker.webp`)).arrayBuffer());assert.equal(webpFrames(bytes),p.frames);
 const archive=await(await fetch(base+`/api/projects/${p.id}/export`)).json();assert.equal(archive.command,'!test-motion');assert.equal(archive.settings.speed,2);
 const imported=await post('/api/import',archive);assert.deepEqual(imported.settings,p.settings);assert.notEqual(imported.id,p.id);assert.equal(imported.ready,false);
 const range=await fetch(base+`/media/${p.id}/source`,{headers:{Range:'bytes=0-99'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,100);
 const bad=await fetch(base+`/api/projects/${p.id}/render`,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Token':token},body:JSON.stringify({settings:{...s,x:900}})});assert.equal(bad.status,400);
 const state=await(await fetch(base+'/api/zalo/status')).json();assert.equal(state.status,'disconnected');assert.equal(state.qr,null);
 await post('/api/projects/'+p.id,{},'DELETE');
 const removed=await(await fetch(base+'/api/projects')).json();assert.ok(!removed.some(x=>x.id===p.id));
 const restored=await post('/api/projects/'+p.id+'/restore',{});assert.equal(restored.id,p.id);assert.equal(restored.ready,true);
 const restoredBytes=Buffer.from(await(await fetch(base+`/media/${p.id}/sticker.webp`)).arrayBuffer());assert.deepEqual(restoredBytes,bytes);
 } finally {child.kill();await once(child,'exit').catch(()=>{});await fs.rm(temp,{recursive:true,force:true});}
});
