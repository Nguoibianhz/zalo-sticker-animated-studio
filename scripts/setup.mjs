// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Copyright (c) 2026 Nguyễn Mạnh Hiếu (Nguoibianhz)
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const vendor=path.join(root,'vendor'), zca=path.join(vendor,'zca-js');
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
function run(cmd,args,options={}){const result=spawnSync(cmd,args,{cwd:root,stdio:'inherit',windowsHide:true,...options});if(result.error)throw result.error;if(result.status!==0)throw new Error(`${cmd} failed (exit ${result.status})`);}
async function main(){
 const modules=path.join(zca,'node_modules');
 const stamp=path.join(modules,'.studio-lock-sha256');
 const lockHash=createHash('sha256').update(await fs.readFile(path.join(zca,'package-lock.json'))).digest('hex');
 const installed=await exists(path.join(modules,'crypto-js','package.json')) && await fs.readFile(stamp,'utf8').catch(()=>null)===lockHash;
 const binary=path.join(vendor,process.platform==='win32'?'ffmpeg.exe':'ffmpeg');
 const binaryReady=await exists(binary);
 const ffmpeg=process.env.FFMPEG_PATH||binary;
 const checkFFmpeg=()=>spawnSync(ffmpeg,['-version'],{encoding:'utf8',windowsHide:true});
 if(process.argv.includes('--check')){const ok=checkFFmpeg().status===0;console.log(JSON.stringify({zcaDependencies:installed,ffmpeg:ok}));if(!installed||!ok)process.exitCode=1;return;}
 if(!installed){console.log('Installing pinned Zalo library dependencies…');
 if(process.platform==='win32')run('cmd.exe',['/d','/s','/c','npm ci --omit=dev --ignore-scripts'],{cwd:zca});
 else run('npm',['ci','--omit=dev','--ignore-scripts'],{cwd:zca});
 await fs.writeFile(stamp,lockHash);}
 if(!binaryReady&&!process.env.FFMPEG_PATH){
 console.log('Preparing FFmpeg via imageio-ffmpeg 0.7.0 (Python 3 required)…');
 let python='python';if(spawnSync(python,['--version'],{windowsHide:true}).status!==0)python='python3';
 if(spawnSync(python,['--version'],{windowsHide:true}).status!==0)throw new Error('Install Python 3, or set FFMPEG_PATH to your FFmpeg executable.');
 const deps=path.join(vendor,'python-deps');run(python,['-m','pip','install','--target',deps,'imageio-ffmpeg==0.7.0']);
 const code='import sys;sys.path.insert(0,sys.argv[1]);import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())';
 const result=spawnSync(python,['-c',code,deps],{encoding:'utf8',windowsHide:true});if(result.status!==0)throw new Error('Cannot locate FFmpeg. Set FFMPEG_PATH manually.');
 await fs.copyFile(result.stdout.trim(),binary);if(process.platform!=='win32')await fs.chmod(binary,0o755);
 }
 const check=checkFFmpeg();
 if(check.status!==0){
  const hint=process.env.FFMPEG_PATH?'Kiểm tra FFMPEG_PATH có trỏ đến FFmpeg chạy được.':'Kiểm tra file FFmpeg trong vendor. Nếu file hỏng, đổi tên file rồi chạy lại npm run setup.';
  const detail=check.stderr?.trim()||check.error?.code||check.signal||check.status;
  throw new Error(`Không chạy được FFmpeg (${detail}). ${hint}`);
 }
 await fs.mkdir(path.join(root,'data'),{recursive:true});console.log('Ready. Run npm start, then open http://127.0.0.1:4317');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
