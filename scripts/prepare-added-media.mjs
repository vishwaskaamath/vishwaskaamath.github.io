import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
const files=[['Artists.mp4','artists',4],['IconicFinal.mp4','iconic',10],['OCSAR.mp4','oscar',8],['2026-10-30 17-36-39.mp4','induction',2]];
const run=args=>execFileSync(ffmpeg,['-y','-loglevel','error',...args],{windowsHide:true,stdio:'inherit'});
for(const [name,id,ss] of files){
 const input=path.resolve('../Videos',name);
 console.log('Preparing',id);
 run(['-ss',String(ss),'-i',input,'-frames:v','1','-vf','scale=960:-2','-q:v','3',`public/media/${id}.jpg`]);
 run(['-i',input,'-vf','scale=960:960:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=24','-c:v','libx264','-threads','2','-preset','veryfast','-crf','25','-maxrate','1800k','-bufsize','3600k','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',`public/media/${id}.mp4`]);
 if(id==='induction')fs.copyFileSync(input,`public/media/${id}-full.mp4`);
 else run(['-i',input,'-vf','scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2','-c:v','libx264','-threads','2','-preset','veryfast','-crf','18','-maxrate',id==='oscar'?'3600k':'6200k','-bufsize','7200k','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',`public/media/${id}-full.mp4`]);
 const manifestPath='src/data/assetManifest.json',manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 for(const suffix of ['.jpg','.mp4','-full.mp4']){
  const url=`/media/${id}${suffix}`,bytes=fs.statSync('public'+url).size;if(bytes>24*1024*1024)throw Error('Asset over limit: '+url);
  const entry={url,bytes,kind:suffix==='.jpg'?'image':'video'};const i=manifest.findIndex(a=>a.url===url);if(i>=0)manifest[i]=entry;else manifest.push(entry);
 }
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log(id,'ready');
}
