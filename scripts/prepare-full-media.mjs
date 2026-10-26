import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
const files=[['Iphone SaaS.mp4','pocket'],['Cyberpunk 2077 (name it proffesionally).mp4','nightcity'],['Dolce&Gabbana.mp4','dolce'],['The Art That Is Music.mp4','music'],['In Moe.mp4','inmoe']];
for(const [name,id] of files){
 const input=path.resolve('../Videos',name),output=path.resolve('public/media',`${id}-full.mp4`);
 let metadata='';try{execFileSync(ffmpeg,['-hide_banner','-i',input],{windowsHide:true,stdio:['ignore','ignore','pipe']});}catch(e){metadata=e.stderr.toString();}
 const m=metadata.match(/Duration: (\d+):(\d+):([\d.]+)/);if(!m)throw Error('No duration');
 const seconds=+m[1]*3600 + +m[2]*60 + +m[3],rate=Math.min(4500,Math.floor(20*1024*8/seconds)-160);
 console.log(`Encoding ${id} full film, ${seconds}s, ${rate}kbps cap`);
 await new Promise((resolve,reject)=>{const p=spawn(ffmpeg,['-y','-loglevel','error','-i',input,'-vf','scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2','-c:v','libx264','-threads','2','-preset','veryfast','-crf','21','-maxrate',`${rate}k`,'-bufsize',`${rate*2}k`,'-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',output],{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';p.stderr.on('data',d=>error+=d);p.on('error',reject);p.on('exit',code=>code?reject(Error(error)):resolve());});
 if(fs.statSync(output).size>24*1024*1024)throw Error('Asset exceeds 24MB');
 console.log(`${id} ready`);
}
