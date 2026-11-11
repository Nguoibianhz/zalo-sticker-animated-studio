// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Copyright (c) 2026 Nguyễn Mạnh Hiếu (Nguoibianhz)
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {settings,command,webpFrames} from './lib.mjs';
import {Zalo,LoginQRCallbackEventType as QR} from './vendor/zca-js/dist/index.js';
const root=path.dirname(fileURLToPath(import.meta.url)), data=process.env.DATA_DIR||path.join(root,'data');
const ffmpeg=process.env.FFMPEG_PATH||path.join(root,'vendor',process.platform==='win32'?'ffmpeg.exe':'ffmpeg');
const port=Number(process.env.PORT||4317), token=randomBytes(24).toString('hex');
await fs.mkdir(data,{recursive:true});
const file=(id,name)=>path.join(data,id,name);
const validId=id=>/^[a-f0-9-]{36}$/.test(id);
async function get(id){if(!validId(id))throw new Error('Dự án không hợp lệ');return JSON.parse(await fs.readFile(file(id,'project.json'),'utf8'));}
async function save(p){await fs.writeFile(file(p.id,'project.json'),JSON.stringify(p,null,2));return p;}
function run(args, failure = 'Không xử lý được video') {
  return new Promise((resolve, reject) => {
    const process = spawn(ffmpeg, ['-hide_banner', ...args], {windowsHide: true});
    let stderr = '';
    process.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-30000); });
    process.on('error', error => {
      reject(new Error(`Không khởi động được FFmpeg (${error.code || 'spawn'}). Chạy npm run setup và kiểm tra FFMPEG_PATH nếu đã đặt.`));
    });
    process.on('close', (code, signal) => {
      if (code === 0) return resolve(stderr);
      const detail = stderr.trim().slice(-700);
      reject(new Error(`${failure} (FFmpeg ${signal || code}).${detail ? ' ' + detail : ''}`));
    });
  });
}
async function probe(source){const log=await run(['-i',source,'-map','0:V:0','-an','-frames:v','1','-abort_on','empty_output','-f','null','-'],'Không đọc được khung hình video');
const dimensions=log.split('Output #0,')[1]?.match(/Video:.*?\b(\d{1,5})x(\d{1,5})\b/);const d=log.match(/Duration: (\d+):(\d+):([\d.]+)/);
if(!dimensions||!d)throw new Error('Video phải có thời lượng xác định.');
const media={width:+dimensions[1],height:+dimensions[2],duration:+d[1]*3600+ +d[2]*60+ +d[3]};if(media.duration>120)throw new Error('Chọn video tối đa 2 phút cho sticker.');return media;}
async function create(name,source,imported){const id=randomUUID();await fs.mkdir(path.join(data,id));await fs.writeFile(file(id,'source'),source);
try {const media=await probe(file(id,'source'));const side=Math.min(media.width,media.height);const s=imported?settings(imported,media):{x:Math.floor((media.width-side)/2),y:Math.floor((media.height-side)/2),side,start:0,end:media.duration,speed:1,size:256,fps:15,thumb:Math.min(1,media.duration/2)};
await run(['-loglevel','error','-i',file(id,'source'),'-map','0:V:0','-vf',"scale='max(2,trunc(min(1280,iw)/2)*2)':-2,format=yuv420p",'-an','-c:v','libx264','-preset','veryfast','-crf','23','-movflags','+faststart','-y',file(id,'preview.mp4')],'Không tạo được bản xem trước');
return save({id,name:String(name||'Sticker mới').slice(0,80),command:'!sticker-'+id.slice(0,4),media,settings:s,ready:false,createdAt:new Date().toISOString()});}catch(e){await fs.rm(path.join(data,id),{recursive:true,force:true});throw e;}}
const rendering=new Set();
async function render(p){if(rendering.has(p.id))throw new Error('Sticker đang được xử lý');rendering.add(p.id);try{const s=p.settings;const crop=`crop=${s.side}:${s.side}:${s.x}:${s.y},scale=${s.size}:${s.size}:flags=lanczos`;
await run(['-loglevel','error','-ss',String(s.start),'-t',String(s.end-s.start),'-i',file(p.id,'source'),'-map','0:V:0','-vf',`${crop},setpts=(PTS-STARTPTS)/${s.speed},fps=${s.fps}`,'-an','-c:v','libwebp_anim','-loop','0','-quality','78','-y',file(p.id,'sticker.tmp.webp')]);
const bytes=await fs.readFile(file(p.id,'sticker.tmp.webp'));const frames=webpFrames(bytes);if(frames<2)throw new Error('Đoạn cắt quá ngắn để tạo ảnh động. Hãy tăng thời lượng hoặc FPS.');
await run(['-loglevel','error','-ss',String(s.thumb),'-i',file(p.id,'source'),'-map','0:V:0','-vf',crop,'-frames:v','1','-update','1','-y',file(p.id,'thumbnail.png')]);
await fs.rename(file(p.id,'sticker.tmp.webp'),file(p.id,'sticker.webp'));p.ready=true;p.renderedAt=Date.now();p.bytes=bytes.length;p.frames=frames;await save(p);return p;}finally{rendering.delete(p.id);}}
let api=null,abortLogin=null,loginPromise=null,generation=0,busy=false,lastSend=0;
let zalo={status:'disconnected',qr:null,message:'Chưa kết nối Zalo',armed:[],events:[]};
function event(message){zalo.events.unshift({time:new Date().toISOString(),message});zalo.events=zalo.events.slice(0,15);}
function disconnect(){generation++;if(abortLogin){try{abortLogin()}catch{}abortLogin=null;}if(api){try{api.listener.stop()}catch{}api=null;}zalo.status='disconnected';zalo.qr=null;zalo.armed=[];zalo.message='Đã ngắt kết nối';}
async function sendProject(p,m){const [png]=await api.uploadAttachment(file(p.id,'thumbnail.png'),m.threadId,m.type);const [webp]=await api.uploadAttachment(file(p.id,'sticker.webp'),m.threadId,m.type);
if(!png?.normalUrl||!webp?.normalUrl)throw new Error('Zalo không trả về URL ảnh');
const response=await fetch(webp.normalUrl,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Không tải lại được ảnh trên Zalo');if(webpFrames(Buffer.from(await response.arrayBuffer()))<2)throw new Error('Zalo không giữ ảnh động sau upload');
await api.sendCustomSticker({staticImgUrl:png.normalUrl,animationImgUrl:webp.normalUrl,width:p.settings.size,height:p.settings.size},m.threadId,m.type);}
function login(){if(loginPromise||api)return;const current=++generation;zalo.status='connecting';zalo.message='Đang tạo mã QR…';zalo.qr=null;
const z=new Zalo({selfListen:true,checkUpdate:false,logging:false,imageMetadataGetter:async p=>{const id=path.basename(path.dirname(p));const project=await get(id);return {width:project.settings.size,height:project.settings.size,size:(await fs.stat(p)).size};}});
loginPromise=z.loginQR({},e=>{if(current!==generation){e.actions?.abort?.();return;}
if(e.type===QR.QRCodeGenerated){abortLogin=e.actions.abort;zalo.status='qr';zalo.qr='data:image/png;base64,'+e.data.image;zalo.message='Quét QR bằng ứng dụng Zalo trên điện thoại';}
if(e.type===QR.QRCodeScanned){zalo.status='confirming';zalo.message='Xác nhận đăng nhập trên điện thoại';zalo.qr=null;}
if(e.type===QR.QRCodeExpired){zalo.status='expired';zalo.qr=null;zalo.message='QR đã hết hạn. Tạo mã mới để tiếp tục.';e.actions.abort();}
if(e.type===QR.QRCodeDeclined){zalo.status='error';zalo.message='Đăng nhập đã bị từ chối';e.actions.abort();}
}).then(connected=>{if(current!==generation){connected.listener.stop();return;}api=connected;abortLogin=null;zalo.status='connected';zalo.qr=null;zalo.message='Đã kết nối · chờ bạn bật lệnh gửi';event('Kết nối Zalo thành công');
api.listener.on('message',async m=>{if(!m.isSelf||typeof m.data.content!=='string'||busy||Date.now()-lastSend<3000)return;const text=m.data.content.trim();const projects=await Promise.all(zalo.armed.map(id=>get(id).catch(()=>null)));const chosen=projects.filter(p=>p?.ready&&p.command===text);if(!chosen.length)return;busy=true;lastSend=Date.now();try{for(const p of chosen){await sendProject(p,m);event(`Đã gửi ${p.name} qua ${p.command}`);}}catch(e){event('Gửi thất bại: '+e.message);}finally{busy=false;}});
api.listener.on('error',()=>{event('Lỗi kết nối Zalo. Nếu không gửi được, hãy kết nối lại.');});api.listener.on('closed',()=>{if(api){zalo.status='disconnected';zalo.message='Phiên nghe đã đóng. Hãy kết nối lại.';api=null;zalo.armed=[];}});api.listener.start();
}).catch(e=>{if(current!==generation)return;if(zalo.status!=='expired'){zalo.status='error';zalo.message='Không đăng nhập được. Hãy thử QR mới.';}zalo.qr=null;}).finally(()=>{loginPromise=null;});}
async function body(req){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>150*1024*1024)throw new Error('Tệp quá lớn (tối đa 100 MB)');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp'};
function json(res,obj,status=200){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj));}
async function stream(req,res,p,type,download){const bytes=await fs.readFile(p);let headers={'Content-Type':type,'Cache-Control':'no-store','Accept-Ranges':'bytes'};if(download)headers['Content-Disposition']=`attachment; filename="${download}"`;const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);if(range){const start=+range[1],end=Math.min(range[2]?+range[2]:bytes.length-1,bytes.length-1);if(start>end){res.writeHead(416);res.end();return;}headers['Content-Range']=`bytes ${start}-${end}/${bytes.length}`;headers['Content-Length']=end-start+1;res.writeHead(206,headers);res.end(bytes.subarray(start,end+1));}else{headers['Content-Length']=bytes.length;res.writeHead(200,headers);res.end(bytes);}}
const server=http.createServer(async(req,res)=>{try{
if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){res.writeHead(403);return res.end();}
const u=new URL(req.url,'http://127.0.0.1:'+port),parts=u.pathname.split('/').filter(Boolean);
if(u.pathname==='/api/health'&&req.method==='GET')return json(res,{version:2,features:['trash','restore']});
if(!['GET','HEAD'].includes(req.method)){if(req.headers['x-studio-token']!==token) return json(res,{error:'Phiên trình duyệt không hợp lệ. Tải lại trang.'},403);if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))return json(res,{error:'Origin không hợp lệ'},403);}
if(u.pathname==='/api/projects'&&req.method==='GET'){const entries=await fs.readdir(data,{withFileTypes:true});const all=await Promise.all(entries.filter(d=>d.isDirectory()&&validId(d.name)).map(d=>get(d.name).catch(()=>null)));return json(res,all.filter(Boolean).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));}
if(u.pathname==='/api/projects'&&req.method==='POST'){const b=await body(req);const source=Buffer.from(b.video||'','base64');if(source.length===0||source.length>100*1024*1024)throw new Error('Video phải từ 1 byte đến 100 MB');return json(res,await create(b.name,source));}
if(u.pathname==='/api/import'&&req.method==='POST'){const b=await body(req);if(b.format!=='custom-sticker-project'||b.version!==1)throw new Error('Đây không phải dự án .zsticker phiên bản 1');const src=Buffer.from(b.source||'','base64');if(!src.length||src.length>100*1024*1024)throw new Error('Video dự án không hợp lệ');const p=await create(b.name,src,b.settings);p.command=command(b.command||'sticker');return json(res,await save(p));}
if(parts[0]==='api'&&parts[1]==='projects'&&parts[2]){
if(!validId(parts[2]))throw new Error('Dự án không hợp lệ');
const sourceDir=path.resolve(data,parts[2]),trashRoot=path.resolve(data,'_trash'),trashDir=path.resolve(trashRoot,parts[2]);
if(path.dirname(sourceDir)!==path.resolve(data)||path.dirname(trashDir)!==trashRoot)throw new Error('Đường dẫn không hợp lệ');
if(parts[3]==='restore'&&req.method==='POST'){await fs.rename(trashDir,sourceDir);return json(res,await get(parts[2]));}
let p=await get(parts[2]);
if(req.method==='DELETE'){if(rendering.has(p.id)||busy)throw new Error('Đang xử lý hoặc gửi sticker. Hãy thử lại sau.');await fs.mkdir(trashRoot,{recursive:true});await fs.rename(sourceDir,trashDir);zalo.armed=zalo.armed.filter(id=>id!==p.id);return json(res,{ok:true,id:p.id});}
if(req.method==='PATCH'){const b=await body(req);if(b.name!==undefined)p.name=String(b.name).trim().slice(0,80)||'Sticker mới';if(b.command!==undefined)p.command=command(b.command);if(b.settings){const next=settings(b.settings,p.media);if(JSON.stringify(next)!==JSON.stringify(p.settings))p.ready=false;p.settings=next;}return json(res,await save(p));}
if(parts[3]==='render'&&req.method==='POST'){const b=await body(req);p.settings=settings(b.settings,p.media);p.ready=false;await save(p);return json(res,await render(p));}
if(parts[3]==='export'){const out={format:'custom-sticker-project',version:1,name:p.name,command:p.command,settings:p.settings,source:(await fs.readFile(file(p.id,'source'))).toString('base64')};res.writeHead(200,{'Content-Type':'application/json','Content-Disposition':'attachment; filename="'+p.command.slice(1)+'.zsticker"'});return res.end(JSON.stringify(out));}}
if(parts[0]==='media'&&validId(parts[1])){const p=await get(parts[1]);const name=parts[2];if(name==='source')return stream(req,res,file(p.id,'preview.mp4'),'video/mp4');if(!p.ready)throw new Error('Hãy xuất sticker trước');if(['sticker.webp','thumbnail.png'].includes(name))return stream(req,res,file(p.id,name),mime[path.extname(name)],u.searchParams.has('download')?p.command.slice(1)+path.extname(name):null);}
if(u.pathname==='/api/zalo/status')return json(res,{...zalo,busy});
if(u.pathname==='/api/zalo/login'&&req.method==='POST'){login();return json(res,{ok:true});}
if(u.pathname==='/api/zalo/disconnect'&&req.method==='POST'){disconnect();return json(res,{ok:true});}
if(u.pathname==='/api/zalo/arm'&&req.method==='POST'){if(!api)throw new Error('Hãy kết nối Zalo trước');const b=await body(req);if(!Array.isArray(b.ids)||b.ids.length>30)throw new Error('Danh sách sticker không hợp lệ');const ids=[...new Set(b.ids)];for(const id of ids){if(!(await get(id)).ready)throw new Error('Sticker chưa được xuất');}zalo.armed=ids;event(ids.length?'Đã bật '+ids.length+' lệnh gửi':'Đã tạm dừng mọi lệnh');return json(res,{ok:true});}
if(req.method==='GET'){const name=u.pathname==='/'?'index.html':u.pathname.slice(1);if(!['index.html','app.js','style.css'].includes(name)){res.writeHead(404);return res.end();}let content=await fs.readFile(path.join(root,'public',name));if(name==='index.html')content=Buffer.from(content.toString().replace('__STUDIO_TOKEN__',token));res.writeHead(200,{'Content-Type':mime[path.extname(name)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(content);}
json(res,{error:'Không tìm thấy API. Hãy khởi động lại server nếu vừa cập nhật ứng dụng.'},404);
}catch(e){if(!res.headersSent)json(res,{error:e.code==='ENOENT'?'Không tìm thấy tệp hoặc dự án':e.message},400);else res.end();}});
server.listen(port,'127.0.0.1',()=>console.log(`Custom Sticker Studio: http://127.0.0.1:${port}`));
process.on('SIGINT',()=>{disconnect();server.close(()=>process.exit(0));});
