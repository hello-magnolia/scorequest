/* ============================================================
   ScoreQuest: Critter Clash corner arena (clash.html)
   ------------------------------------------------------------
   Pixel critters and their move animations come from Magnolia's
   Critter Clash prototype. Pomelo (the capybara) stays on the left;
   every question sends a new boss critter in on the right.
   API: window.SQArena.{ready, biome(id), enter(key, state), win(), miss()}
   ============================================================ */
(function(){
"use strict";
const SPRITES = {"rabbit": {"w": 21, "h": 17, "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAARCAYAAAAyhueAAAABdElEQVR4nLVUu27CQBCci2x/RrqIWCnSUVAgBHlUVCls0yAKsO4bAIm/QMQS7rCbVOlSIMsFSIjeoEgp8hmAcinIHedH7AgpU+3O6sZzu3smo9EIHLVaDUWYjMcMAGxKSRZf0nVCgiAQBTnOwjaK2Mz3AQAt00RJ10kWf1Fo7Qz8WVR2U8Sf5VS+epK3KSX/cn0lr7iNIsbj5mND8DPfR8s0GY9ll0KUrwNwXAkuJvfKc53YB7P6K2AZBpORzGXMps+/1izDYEEQHNcyKZJ3sAhcODYoz3Vgdbp5bY7h7eFSxK9PtojPnv7XagX/8zTn5svkJGpTSjRVgabGF8Fzndhw1sswll+Uy5huPkSuqYqYfuzt39812G5/SIlbnS7WyxAA8L7Zilq7R0XcHwwJ/yHl7qnsAgAW4RxX1yUAQKVaR38wTL2qlGh/MCSaqrDd/gDPdWDc3KLdo+JwpVpni3BeaCLllAsDQPsnl2uVap0hwSfxDdhVIS/mOy0dAAAAAElFTkSuQmCC"}, "frog": {"w": 14, "h": 14, "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAABYUlEQVR4nHWSP0hCURSHvydaSBQ4iZVC0OISxENok4LQahCHaCtoEGrIxSX/hKXW4qJDQ4Pg6BRO1ZJTIIhIQmuEga4tFUZwG17v9p7PznTO+Z3vnsPlp2SzWUZjcFcXAJ5QRDHmhXxOAKTSGcVuoX6jVHQST9RFqegEYDqYE6/nKt5kGwDbOMgTiijxxCc6BKBDqXRGAbBsrDWqAoAJeHtwyH7z8YP9wBKFfE5YTq01quJifgqA8OEMy8mB6dFO0cPGpZ/tfE5YNt48a1vCQKzkMovvf7oFPI1qwsGLA3DQbw+l1lUdXES/qbQMYK1RFT7VzfHcpBzst4fcnkRlHT67xlvWPsimQ7GSi/Dul2mDERqt7bVGVazEfHSftMasOnr8+PjXAJWtTVPd65h1aYB+e0jzqidzI6BDi+tJaQDFH1wQPtUtB+/LLdaOAmNzHQKw76zuSfOCZmCjmY258dQfsUuLjPkhEA8AAAAASUVORK5CYII="}, "bear": {"w": 34, "h": 29, "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAdCAYAAADPa766AAADh0lEQVR4nK2WX0hUWRzHP3eatiQ2032wlRoYDEVq2xaRArFmURGEehMfF4mGjQhb6CXsz4iGLwspsQjG7mBv0ltCrajrrVgoZNi/IsXExBTjDrSTtWn5UHcf5JzOvffcO9ex78uc8/udc36f+5vf+d1rmKaJn4r5AR7cCVkHj7w3dL5YLFZ0P0Ao0KoiEIO/fMuDOyFrI+dsCERAAGwUZsMZ+VgKl7JpfHZMPvnqfC9b9v7L6vxnPHmf5MksFkDX199oa6YkkJOXumVAcfD47Jh17eZWAOYyZVz8qYlsKk+koYr4cAWN0TcAnDg2Zq0HxvC6FScvddsCjva8oHZ5OwCPtr0iPlwBIO06G8B33w8b6gON9CVdc18QARMfruDn65+szUM7pe/c3B8ADDZ+WdR27eZW5jJl/Dn/KfdHsxyKR9i/9z8ao284cewtI31JwxPkytkeC+Dt4TIbQBClFwty/OOzp3IcaaiiumELudQq2VRe2kf6koa2Rq6c7bG6Y9F1BdzzeaVtLnR8125yS2v226k81Q0Rsqm8/EuEXCDFINKLBW1QdX7v4Us5rql6pz2nrbXFApianjG0IEGCe8EIiOa6ctu8puodt18vcyge4f5oltrl7RzvapJAU9Mz9r/GmQ0R0PnEurlTYp+AYRvkUqsAElRdE9YVqx/AeiXOaaYc8sCu3S4I0zQ/tPjLA/1Wc125Lf2lqLmunHsPXwba3zk0Qe/5CwYEeNeIig+q3FJBpj69WPAESi8WGOxq4vJAv+UJIoLnlgpU76h02dRxqcBO2YpVd5iAqd5RKf3qWLUFkVobADfOHKVzoN8KwVp9dBzYx1+ZF1ooNQt+wLmlgu2MYhCqSvoMCCq1sam9JWlm5Fi0i7DIRjEdrt/jst1dSPvuETfIqe5YlKSZQe1Zgb7QdBBe9lMdjUz+9tgGo2bDS8bm8CZbRlZWnvNFtMIVsHNowrX5xpmjrqwIuB9uzQHQ/lWNze+sE9FLjEQiIe8yQKx2pwvk6uSCfDmpamttsU6313tCdxzYx8rKc5vffPSPbS4aWlidwNoNcoKsR51DExK6rbXFlu1bv/9ti6XK99YE7Q3F1np9CqjSFqtoYEKDXU3y+0HV1PSMcXVywXetCnG6vd5WBr4gvecvGOfGfwU+9AHdFXTKb+3j/Cbbr05GIpHQOpzkumIVcmZLXev0edXI/0EOzg+qtuiRAAAAAElFTkSuQmCC"}, "turtle": {"w": 27, "h": 14, "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAOCAYAAADez2d9AAAB1UlEQVR4nI2UMWgTYRTHf5/GZqlIJiFIaYdwQyBCUyFjNAk4dGr3hi6FLrplMAmeJHHo5uQoF1wy6OQQSMJlcLihKfTA+YpIwbkucfkc9F3urt+1/qe79/3v/d57vPuUbduYVK1WATh+fahN5+/ffFDGD/9pPp9fi2VMxpHr6JHrAHD0LmdMdvxyVcRt4FTYyHW0APxv9xkPlwA8P/gdesbDNTbKD8P3Rr2mJ9PZrcAYLAoSCWQ8XEtN8uzFkxiwUa/FRt/udJWxM+nIpCg4rYhGvaZPTh/HYq2dnm53ukrJgoxcR1eONkJDqXgVg5aKV+FzFCbv+XKWj82vJEEr4Dl3TAeSOAqIJk52lC9ngb/jNHlFqWNMgqTLfDkay4bPl4tlrFuA74ufcLDagQzAoN/T+81tLhfLsNLoCCWelHSUJlm21s457U5XqXuZu3q/uQ2AVXwAgPfjV+yjyqN1Y7KoTzxvW+41n2yjsm2bQb+nAUqVLQB29zZj5i+fLwDwveBGj+8FyPqn3iBCHvR7+tXJ0zC5qGDl+OScMZnOVKNei3mkgIKVo2DlbvzBjdu4u7eJ7wX4XkDBMl9X4plMZ8r3AqMnKZW8iGWkydsgWu3/xExj/ANWCdPUcj1HZAAAAABJRU5ErkJggg=="}, "hedgehog": {"w": 20, "h": 14, "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAOCAYAAAAvxDzwAAABwUlEQVR4nIWUwWsTQRTGf9P0KAR6sUIRSoQtYkGvlpCFpBcRSiKYc0+eShQCJSSpY5OlFyFKTz31nEMrBW9tIXaJRwWF6kLEiyR6WbJ/gIyHOuPOJsF3efO+Gb73vvdmRkgpAXBdF4BOtaIAnr18LTrVitI+iZGwXq8HwHwc7FQratNdttbTsPVCXgGcnp2L9UJenZ6dmwRCSsnHt2+UBjbdZQajkFs3FiwPWGuAWrfPXnmNWrdPvdEUAHN6M+ukDdksO+x9t+K98trEmTmAew+Lwg8iBqOQ4fiK8OLLwCLR+HAc4geRiTWx124pQ+i1WyrrpGdWNhyHfPuVAjAewA8iI11LtobiBxFZZyHh0/hBxP7OhpVka/eEzPXfDMfhVR/bLVVvNMW8126pB3fv/JWQmukBPlx8YjAKeVx22d/Z4MfnrwAsra5Q6/aZqDApKWnJgS2trkycEVJKdJX/s7jsVwfHPH1SsvYzJe/ftYnbdtFhu+hM4Fu7JwBcS920lGjcVAiYsb978chsvr/8adb3by8C02Xq6uqNpjA91M8nV8grTaobHU+UKXlWnHt+BDD92mjiXOytajyJJWP9OfwBi8/mAjlz/kMAAAAASUVORK5CYII="}, "capybara": {"w": 30, "h": 23, "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAXCAYAAAAcP/9qAAACu0lEQVR4nLWWT2gaQRTGv9VUmkuaLVTao1AIDYZGaC6GUiFKwQpFSMmxeCnkUIIQSKQtpiQhCQRs8FhKLoUgtCwUESQJXbB66UEPYjDEaxJD8U8OOYTC9GDeOLuuMSr9LvPmOft+772Z3VFSVRWi9PNu5XK52v42Gw4wsk19UbrQbDjAPv+4jTdbMgBg4H8Dd0LBRpUW4Evciq+vf2F3b1/qu+JsXGHZuMIAYHVlmXncU7ydO6Eg29ocxEf/Lfx8cY9DAYOKs3GFOXx+iWzyk0+/dj0wAQBY3FbY2+ePAAAe9xQjQC39FwAweFjWPKsBR+bn2HpgAovbDSAFpcDtkqjWzrHgH8GGUgQAeMft8LinmHfc3gIkSeIpJrBe1do55OEhIYnfoMSqtXPDwCRKJpHL8zZzcGR+jldIgQgkBpaHh3gSnYCkTOGU26FYmsOll08e8yqNgnUDuQ6qh5uCm1sStU5sJ6lXaCdpDlc/kG+ZArennaPcThXreDpyh9skEx0oEXpWvWwJLPqMfhdhogiqtzWtJlllSwuIfKJfv4fTztG2CehliszPsYDLpqlEHPU+MZlepapq45KwyhbQ2Cng0UmFj6li/dr1ztH7mnkolsa79x8ar9PS0hKycYUt+Ef4grPqJY5OKnj44C4HibaoVLEO6hgVIOpZ+Du3CQpcvcd6qL66TkpmS5q5etjcexEmasDh80sbSrNiavfRSQWhWFqzeG1m0hA6ZpP5PJo8aAvTgI2cVtmCV5/Smm8r0Lh1RHivUODqH0ij6qLhJ07U7t6+FIqlcVxrbkGpbL4JxxhM8FSxjkzhFJnCKdZmJiFe6nod1yoYs8m4uPiDUtmMUtkM77gdqyvLbZ8xBIvS762RoskDAM2DlMjlb8IzBjt8foluD/EKE7W7ty9Fkweake7aRC5/4z3+B9b/g29qADNTAAAAAElFTkSuQmCC"}, "frog_bare": {"w": 14, "h": 14, "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAABK0lEQVR4nGNsaGhgQAcwsYaGBpxsJgxdWAxAZzMwMGDXiM0V6HIYGlfuX/h/5f6F/zXtFf/j08iCrqldhpuBgYGBwSOLj8GwigFF8/k2SYYd0z4xhLY0o2pkYGBg2H6PFaKRgYEhbaIgquRXhDyGxsZAiETmA1YGBgZWhmdnf8LlLhmzMrQH/mGYdxpJ48r9C//LGYszVEqzwxU+O/uTYUddIJzv0bSeQXbSWYbqmlpGJpimtImCDB5xv1BsQNaEzmdZuX/hf4s0OYZLVyECUsbojscOMPwIA/O8vVD4j86jysPj8dnZnwwnZj2Cs5E1wDSpuFYxVNfUMjIwMDAwator/pczFocr3DfpNINTnilWNkwTAwMDA0u4Yzxja0szPKKra2rhfHQ2slMBcwx5/b3aKIUAAAAASUVORK5CYII="}, "crown": {"w": 9, "h": 4, "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAECAYAAABcDxXOAAAAaElEQVR4nGNItzT8n25p+J+BgYEBmc3KwvyflYX5PwNM4sdRq/8w+sdRq/+sLMz/X3SZwRUxwhRO7OFkgIEPR/8wyFadZfj95y8jXBEDAwPDiy6z/zD2iYvfGLbfY2WYd/oSw+8/fxkB8G0wmEAs7E8AAAAASUVORK5CYII="}};

const ROSTER = {
  capybara:{name:"Capybara",hp:44,spd:4,moves:[
    {name:"Tangerine toss",anim:"tangerine",dmg:[5,8]},
    {name:"Body check",anim:"bodycheck",dmg:[5,7]},
    {name:"Stay unbothered",anim:"zen",heal:[6,9]}]},
  bear:{name:"Mossy bear",hp:50,spd:3,moves:[
    {name:"Sprout slam",anim:"sproutslam",dmg:[7,10]},
    {name:"Crystal beam",anim:"beam",dmg:[5,7]},
    {name:"Forest nap",anim:"nap",heal:[6,9]}]},
  rabbit:{name:"Rabbit",hp:30,spd:9,moves:[
    {name:"Double kick",anim:"doublekick",dmg:[3,5]},
    {name:"Burrow",anim:"burrow",dodge:true},
    {name:"Ear flick",anim:"dash",dmg:[4,6]}]},
  turtle:{name:"Turtle",hp:46,spd:2,moves:[
    {name:"Shell spin",anim:"shellspin",dmg:[6,8]},
    {name:"Hide in shell",anim:"shell",guard:true},
    {name:"Slow chomp",anim:"chomp",dmg:[7,9]}]},
  frog:{name:"Frog king",hp:32,spd:7,moves:[
    {name:"Royal tongue",anim:"tongue",dmg:[5,7]},
    {name:"Crown boomerang",anim:"crown",dmg:[5,8]},
    {name:"Lily leap",anim:"lily",dodge:true}]},
  hedgehog:{name:"Hedgehog",hp:36,spd:6,moves:[
    {name:"Quill volley",anim:"quills",dmg:[2,3]},
    {name:"Curl up",anim:"curl",guard:true},
    {name:"Spike roll",anim:"spikeroll",dmg:[6,8]}]}
};

// ---------- setup ----------
const W=128,H=96,GROUND=77,A_X=36,B_X=94;
const cv=document.getElementById("cx-cv"), ctx=cv.getContext("2d");
const low=document.createElement("canvas"); low.width=W; low.height=H;
const lx=low.getContext("2d"); lx.imageSmoothingEnabled=false;
const reduceMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
let S=4, speed=1;

const IMG={}, WHITE={}, TINT={};
function silhouette(img,color){const c=document.createElement("canvas");c.width=img.width;c.height=img.height;
  const x=c.getContext("2d");x.drawImage(img,0,0);x.globalCompositeOperation="source-in";x.fillStyle=color;x.fillRect(0,0,c.width,c.height);return c}
function tinted(k,color){const id=k+color;return TINT[id]||(TINT[id]=silhouette(IMG[k],color))}
function loadAll(){
  return Promise.all(Object.keys(SPRITES).map(k=>new Promise(r=>{
    const im=new Image(); im.onload=()=>{IMG[k]=im;WHITE[k]=silhouette(im,"#fff");r()}; im.src=SPRITES[k].src;
  })));
}
function resize(){
  const w=cv.parentElement.clientWidth*(window.devicePixelRatio||1);
  S=Math.max(2,Math.ceil(w/W)); cv.width=W*S; cv.height=H*S; ctx.imageSmoothingEnabled=false;
}
addEventListener("resize",resize);


// ---------- state ----------
let A,B, parts=[], floats=[], fxs=[], shake=0, running=false, banner=null;

function makeFighter(key,side){
  const r=ROSTER[key], sp=SPRITES[key];
  return {key,side,face:side<0?1:-1,name:r.name,max:r.hp,hp:r.hp,spd:r.spd,moves:r.moves,w:sp.w,h:sp.h,
    cx:side<0?A_X:B_X,ox:0,oy:0,sx:1,sy:1,rot:0,flash:0,alpha:1,upside:false,guard:false,dodge:false,
    tint:null,clip:false,bare:false,busy:false,dizzy:false};
}
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const lerp=(a,b,t)=>a+(b-a)*t;
const sleep=ms=>new Promise(r=>setTimeout(r,ms/speed));
function tween(ms,fn){return new Promise(res=>{const t0=performance.now();const d=ms/speed;
  (function step(now){const t=Math.min(1,Math.max(0,(now-t0)/d));fn(t);t<1?requestAnimationFrame(step):res()})(t0)})}
const easeOut=t=>1-Math.pow(1-t,3), easeIn=t=>t*t*t, easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const back=t=>{const c=1.9;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
const px=(x,y,c,w=1,h=1)=>{lx.fillStyle=c;lx.fillRect(Math.round(x),Math.round(y),w,h)};
const gapTo=(a,b)=>Math.abs(b.cx-a.cx)-(a.w+b.w)/2+2;
const imgKey=f=>f.bare?f.key+"_bare":f.key;

// ---------- fx ----------
function addFx(life,draw,behind=false){const o={age:0,life,draw,behind};fxs.push(o);return o}
function ring(x,y,r1,c,life=22,flat=.32,behind=true){addFx(life,p=>{const r=lerp(4,r1,easeOut(p));lx.globalAlpha=1-p;
  const n=Math.max(12,Math.round(r*2.4));for(let i=0;i<n;i++){const a=i/n*Math.PI*2;px(x+Math.cos(a)*r,y+Math.sin(a)*r*flat,c)}lx.globalAlpha=1},behind)}
function star(x,y,c="#fff",life=14,size=6){addFx(life,p=>{const s=Math.round(lerp(2,size,easeOut(p)));lx.globalAlpha=1-p*p;
  px(x-s,y,c,s*2+1,1);px(x,y-s,c,1,s*2+1);const d=Math.round(s*.5);px(x-d,y-d,c);px(x+d,y-d,c);px(x-d,y+d,c);px(x+d,y+d,c);
  px(x-1,y-1,"#fff",3,3);lx.globalAlpha=1})}
function ghost(f,color){const now=performance.now();if(f._g&&now-f._g<45/speed)return;f._g=now;const snap={img:tinted(imgKey(f),color||"#ffffff"),ox:f.ox,oy:f.oy,rot:f.rot,sx:f.sx,sy:f.sy};
  addFx(10,p=>drawBody(f,snap.img,.35*(1-p),snap),true)}
function speedLines(f,dir){for(let i=0;i<4;i++){const y=GROUND-4-Math.random()*f.h*.9,x=f.cx+f.ox-dir*(f.w/2+2+Math.random()*6),len=6+Math.random()*10;
  addFx(10,p=>{lx.globalAlpha=1-p;px(dir>0?x-len:x,y,"#ffffff",Math.round(len*(1-p*.5)),1);lx.globalAlpha=1},true)}}
function dust(x,dir=0,n=6){for(let i=0;i<n;i++)parts.push({x:x+(Math.random()*4-2),y:GROUND-1,vx:(Math.random()*.8-.4)-dir*.8,vy:-Math.random()*.8,g:.03,life:rnd(14,24),c:Math.random()<.5?"#e0c193":"#c79a62",s:Math.random()<.4?2:1})}
function burst(x,y,c,n=10,spread=1.4,g=.08){for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()*2-1)*spread,vy:-Math.random()*1.8-.3,g,life:rnd(18,32),c:Array.isArray(c)?c[i%c.length]:c,s:Math.random()<.3?2:1})}
function rise(f,c,n=12){for(let i=0;i<n;i++)parts.push({x:f.cx+f.ox-f.w/2+Math.random()*f.w,y:GROUND-Math.random()*f.h,vx:0,vy:-.35-Math.random()*.4,g:0,life:rnd(24,40),c:Array.isArray(c)?c[i%c.length]:c,s:1})}
function float(text,x,y,c="#fff",big=false,small=false){floats.push({text,x,y,c,life:46,big,small})}
function setLog(a,b=""){document.getElementById("log1").textContent=a;document.getElementById("log2").textContent=b}
function hud(){[[A,"A"],[B,"B"]].forEach(([f,k])=>{
  document.getElementById("name"+k).textContent=f.name;
  document.getElementById("hp"+k).textContent=`${Math.max(0,f.hp)}/${f.max}`;
  const bar=document.getElementById("bar"+k),p=Math.max(0,f.hp)/f.max;bar.style.width=(p*100)+"%";bar.classList.toggle("low",p<=.3)})}


// ---------- drawing ----------
function drawBody(f,img,alpha,o=f){
  if(alpha<=0)return;
  const sy=o.sy,cx=f.cx+o.ox,cy=GROUND+o.oy-f.h*Math.abs(sy)/2;
  lx.save();lx.globalAlpha=alpha;
  if(f.clip){lx.beginPath();lx.rect(0,0,W,GROUND+1);lx.clip()}
  lx.translate(Math.round(cx),Math.round(cy));
  if(o.rot)lx.rotate(o.rot*f.face);
  lx.scale(f.face*o.sx,(f.upside?-1:1)*sy);
  lx.drawImage(img,-Math.round(f.w/2),-Math.round(f.h/2));
  lx.restore();
}
function drawFighter(f,t){
  if(f.alpha<=0)return;
  const idle=!f.busy&&!f.upside&&f.oy===0;
  const bob=0; /* calm while reading: no idle bobbing */
  const lift=Math.max(0,-f.oy);
  if(!f.clip||f.oy<f.h*.6){lx.globalAlpha=.25*f.alpha;const sw=Math.max(2,Math.round(f.w*.8*Math.max(.4,1-lift/40)));px(f.cx+f.ox-sw/2,GROUND,"#3a2a18",sw,2);lx.globalAlpha=1}
  const o={ox:f.ox,oy:f.oy+bob,rot:f.rot,sx:f.sx,sy:f.sy*(idle&&bob?1:1)};
  const k=imgKey(f);
  drawBody(f,f.flash>0?WHITE[k]:IMG[k],f.alpha,o);
  if(f.tint)drawBody(f,tinted(k,f.tint),.45*f.alpha,o);
  if(f.guard){const cx=f.cx+f.ox,cy=GROUND-f.h/2,rx=f.w/2+4,ry=f.h/2+4,n=40,sh=t/90;
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2;if((i+Math.floor(sh))%3===0)continue;lx.globalAlpha=.75;px(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,"#bfe6ff")}lx.globalAlpha=1}
  if(f.dodge&&!f.busy){const s=Math.floor(t/200)%2;px(f.cx+f.ox-f.w/2-2-s,GROUND-f.h-1,"#fff",2,1);px(f.cx+f.ox+f.w/2+s,GROUND-f.h+1,"#fff",2,1)}
  if(f.dizzy){for(let i=0;i<3;i++){const a=t/180+i*2.1;px(f.cx+f.ox+Math.cos(a)*7,GROUND+f.oy-f.h-3+Math.sin(a)*2,"#ffd36a",2,2)}}
}
function render(t){
  lx.clearRect(0,0,W,H); lx.drawImage(bg,0,0);
  fxs.filter(e=>e.behind).forEach(e=>e.draw(e.age/e.life));
  if(A&&B){const order=[A,B].sort((p,q)=>(p.busy?1:0)-(q.busy?1:0));order.forEach(f=>drawFighter(f,t))}
  fxs.filter(e=>!e.behind).forEach(e=>e.draw(e.age/e.life));
  parts.forEach(p=>{lx.globalAlpha=Math.min(1,p.life/10);px(p.x,p.y,p.c,p.s,p.s)});lx.globalAlpha=1;
  let sx=0,sy=0; if(shake>0&&!reduceMotion){sx=(Math.random()*2-1)*shake*S;sy=(Math.random()*2-1)*shake*S}
  ctx.fillStyle="#000";ctx.fillRect(0,0,cv.width,cv.height);
  ctx.drawImage(low,0,0,W,H,Math.round(sx),Math.round(sy),W*S,H*S);
  ctx.textAlign="center";ctx.textBaseline="middle";
  floats.forEach(f=>{ctx.globalAlpha=Math.min(1,f.life/18);
    ctx.font=`700 ${Math.round((f.big?9:f.small?5:7)*S)}px "Pixelify Sans",monospace`;
    ctx.lineWidth=Math.max(2,S*1.1);ctx.strokeStyle="#2b2118";ctx.strokeText(f.text,f.x*S,f.y*S);ctx.fillStyle=f.c;ctx.fillText(f.text,f.x*S,f.y*S)});
  ctx.globalAlpha=1;
  if(banner){ctx.globalAlpha=Math.min(1,banner.t);const y=H*S*.42;ctx.fillStyle="rgba(43,33,24,.82)";ctx.fillRect(0,y-11*S,cv.width,22*S);
    ctx.font=`700 ${Math.round(12*S)}px "Pixelify Sans",monospace`;ctx.fillStyle="#ffd36a";ctx.fillText(banner.text,cv.width/2,y+S*.5);ctx.globalAlpha=1}
}
let last=performance.now();
function loop(t){
  const dt=Math.min(3,(t-last)/16.67)*speed; last=t;
  parts.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;p.life-=dt;if(p.g&&p.y>GROUND+6){p.y=GROUND+6;p.vy*=-.3;p.vx*=.6}});parts=parts.filter(p=>p.life>0);
  floats.forEach(f=>{f.y-=(f.vy||.25)*dt;if(f.vx)f.x+=f.vx*dt;f.life-=dt});floats=floats.filter(f=>f.life>0);
  fxs.forEach(e=>e.age+=dt);fxs=fxs.filter(e=>e.age<e.life);
  [A,B].forEach(f=>{if(f&&f.flash>0)f.flash-=dt});
  if(shake>0)shake=Math.max(0,shake-.12*dt);
  if(banner&&banner.t<1)banner.t+=.05*dt;
  render(t);requestAnimationFrame(loop);
}


// ---------- move animations ----------
const ANIM={};

// Capybara
ANIM.tangerine=async(a,d,m)=>{
  const dir=a.face;
  await squash(a,1.15,.82,200);
  const p={x:a.cx+dir*a.w*.35,y:GROUND-a.h+2,ang:0};
  a.sx=.9;a.sy=1.15;
  const o=addFx(999,()=>{lx.save();lx.translate(Math.round(p.x),Math.round(p.y));lx.rotate(Math.round(p.ang/(Math.PI/4))*(Math.PI/4));
    px(-3,-2,"#2b2118",7,5);px(-2,-3,"#2b2118",5,7);px(-2,-2,"#f07a22",5,5);px(-1,-3,"#f07a22",3,1);px(-1,-2,"#ffb15c",2,1);px(0,-4,"#7fd03a",2,1);lx.restore()});
  squash(a,1,1,200);
  const x0=p.x,y0=p.y,x1=d.cx-dir*d.w*.25,y1=GROUND-d.h*.55;
  await tween(460,t=>{p.x=lerp(x0,x1,t);p.y=lerp(y0,y1,t)-Math.sin(t*Math.PI)*26;p.ang=t*Math.PI*4;
    if(Math.random()<.4)parts.push({x:p.x,y:p.y,vx:0,vy:.1,g:0,life:10,c:"#ffb15c",s:1})});
  o.life=0;
  for(let i=0;i<10;i++)parts.push({x:x1,y:y1,vx:(Math.random()*2-1)*1.6,vy:-Math.random()*2.2,g:.12,life:rnd(26,40),c:i%3?"#f07a22":"#ffd36a",s:2});
  ring(x1,y1,10,"#ffb15c",16,1,false);
  await strike(a,d,m,{colors:["#f07a22","#ffd36a","#ffffff"]});
};
ANIM.bodycheck=async(a,d,m)=>{
  const dir=a.face,gap=gapTo(a,d);
  await tween(240,t=>{const e=easeOut(t);a.ox=Math.round(-6*dir*e);a.sx=1+.25*e;a.sy=1-.2*e;if(Math.random()<.3)dust(a.cx+a.ox-dir*a.w/2,dir,1)});
  await tween(130,t=>{a.ox=Math.round(lerp(-6,gap,easeIn(t))*dir);a.sx=lerp(1.25,1.2,t);a.sy=lerp(.8,.88,t);ghost(a);speedLines(a,dir);if(t>.3)dust(a.cx+a.ox,dir,1)});
  a.sx=.8;a.sy=1.15; shake=1.5;
  await strike(a,d,m,{knock:10,shakeAmt:1.4,colors:["#c68556","#ffffff"]});
  await tween(140,t=>{a.sx=lerp(.8,1,t);a.sy=lerp(1.15,1,t)});
  await returnHome(a,320);
};
ANIM.zen=async(a,d,m)=>{
  await squash(a,1.08,.9,260);
  a.tint="#bfffd0";
  for(let i=0;i<3;i++){ring(a.cx,GROUND,26,"#9be0ff",38,.3,true);
    floats.push({text:"~",x:a.cx+(Math.random()*16-8),y:GROUND-a.h-2,c:"#d6fff0",life:40,small:true,vy:.3,vx:(Math.random()-.5)*.2});
    rise(a,["#d6fff0","#ffffff","#b8ff9a"],5);await sleep(260)}
  a.tint=null; await heal(a,m.heal); await squash(a,1,1,200);
};

// Bear
ANIM.sproutslam=async(a,d,m)=>{
  const dir=a.face,gap=gapTo(a,d)+6;
  await squash(a,1.18,.78,230);
  await tween(380,t=>{a.ox=Math.round(gap*dir*t);a.oy=-Math.round(Math.sin(t*Math.PI*.5)*30);a.sx=lerp(.88,1,t);a.sy=lerp(1.18,1,t);a.rot=-.15*t;if(t<.3)dust(a.cx,dir,1)});
  await sleep(60);
  await tween(110,t=>{a.oy=Math.round(-30*(1-easeIn(t)));a.rot=lerp(-.15,.12,t);a.sy=1.12;a.sx=.92;ghost(a,"#eaffc0")});
  a.oy=0;a.rot=0;a.sx=1.3;a.sy=.7;shake=3;
  const lx0=a.cx+a.ox; ring(lx0,GROUND+1,34,"#fff2c9",24); ring(lx0,GROUND+1,22,"#a8d42a",20);
  dust(lx0-10,0,8);dust(lx0+10,0,8);
  // vines erupt under defender
  [-8,0,8].forEach((o,i)=>{const vx=d.cx+o,h=10+rnd(4,10);addFx(48,p=>{const g=p<.35?easeOut(p/.35):p>.75?1-(p-.75)/.25:1,hh=Math.round(h*g);
    px(vx,GROUND-hh,"#2b2118",3,hh+1);px(vx+1,GROUND-hh,"#5aa52c",1,hh);if(hh>3){px(vx-2,GROUND-hh+2,"#a8d42a",2,1);px(vx+3,GROUND-hh+4,"#a8d42a",2,1);px(vx+1,GROUND-hh-1,"#c4f129",1,1)}})});
  burst(d.cx,GROUND-6,["#c4f129","#8fd032","#a8d42a"],14,1.6);
  await strike(a,d,m,{knock:6,shakeAmt:1.6,colors:["#c4f129","#8fd032","#ffffff"]});
  await squash(a,1,1,160);
  await returnHome(a,380);
};
ANIM.beam=async(a,d,m)=>{
  const cx=a.cx,cy=GROUND-a.h+2,tx=d.cx,ty=GROUND-d.h*.55;
  a.busy=true;
  const charge=addFx(999,p=>{const s=2+Math.floor((performance.now()/60)%3);lx.globalAlpha=.9;px(cx-s,cy,"#ffffff",s*2+1,1);px(cx,cy-s,"#ffffff",1,s*2+1);px(cx-1,cy-1,"#d0ffea",3,3);lx.globalAlpha=1});
  for(let i=0;i<16;i++){const ang=Math.random()*Math.PI*2,r=14+Math.random()*8;parts.push({x:cx+Math.cos(ang)*r,y:cy+Math.sin(ang)*r,vx:-Math.cos(ang)*r/22,vy:-Math.sin(ang)*r/22,g:0,life:22,c:i%2?"#d0ffea":"#c9d4fd",s:1})}
  await tween(520,t=>{a.sy=1+.05*Math.sin(t*Math.PI*6);a.oy=-Math.round(t*2)});
  charge.life=0;
  const cols=["#ff8fb0","#ffd36a","#d0ffea","#9fd8ff","#c9b0ff"];
  const beam=addFx(26,p=>{const n=Math.ceil(Math.hypot(tx-cx,ty-cy)),w=p<.2?p/.2:1-(p-.2)/.8;
    for(let i=0;i<n;i++){const t=i/n,x=lerp(cx,tx,t),y=lerp(cy,ty,t);
      const c=cols[(i+Math.floor(performance.now()/40))%cols.length];
      px(x,y-1,c,1,1);px(x,y+1,c,1,1);if(w>.3)px(x,y,"#ffffff",1,1);if(w>.6){px(x,y-2,c);px(x,y+2,c)}}});
  ring(tx,ty,12,"#ffffff",14,1,false);
  burst(tx,ty,cols,14,1.4,.02);
  await strike(a,d,m,{colors:cols});
  await sleep(140); a.oy=0;a.sy=1;a.busy=false;
};
ANIM.nap=async(a,d,m)=>{
  await squash(a,1.06,.88,300);
  a.tint="#c9d4fd";
  const shrooms=[-a.w/2-3,a.w/2+1].map(o=>a.cx+o);
  shrooms.forEach((sx,i)=>addFx(80,p=>{const g=p<.2?easeOut(p/.2):p>.85?1-(p-.85)/.15:1,h=Math.round(5*g);if(h<1)return;
    px(sx,GROUND-h+1,"#f6ecd6",1,h);px(sx-2,GROUND-h-1,"#2b2118",5,3);px(sx-1,GROUND-h-1,"#e0463a",3,2);px(sx,GROUND-h-1,"#ffffff",1,1)},true));
  for(let i=0;i<3;i++){floats.push({text:i===2?"Z":"z",x:a.cx+a.face*6+i*3*a.face,y:GROUND-a.h-2,c:"#e8f0ff",life:44,small:i<2,vy:.35,vx:a.face*.12});await sleep(320)}
  a.tint=null; rise(a,["#b8ff9a","#ffffff"],10); await heal(a,m.heal); await squash(a,1,1,200);
};

// Rabbit
ANIM.doublekick=async(a,d,m)=>{
  const dir=a.face,gap=gapTo(a,d);
  await squash(a,1.15,.8,140);
  await tween(150,t=>{a.ox=Math.round(gap*dir*easeOut(t));a.sx=1.2;a.sy=.9;ghost(a);speedLines(a,dir)});
  a.sx=1.25;a.sy=.95;
  const hit1=await strike(a,d,m,{knock:5,colors:["#ffffff","#f2b6c0"]});
  if(d.hp>0){
    a.sx=1;a.sy=1;
    await tween(330,t=>{a.oy=-Math.round(Math.sin(t*Math.PI)*16);a.rot=-Math.PI*2*easeIO(t);a.ox=Math.round((gap-4*Math.sin(t*Math.PI))*dir);if(Math.random()<.6)ghost(a,"#f2b6c0")});
    a.rot=0;a.oy=0;a.sx=1.25;
    await strike(a,d,m,{knock:7,colors:["#ffffff","#f2b6c0","#ffd36a"]});
  }
  a.sx=1;
  await returnHome(a,300);
};
ANIM.burrow=async(a,d,m)=>{
  a.busy=true;a.clip=true;
  await tween(260,t=>{a.ox=(Math.floor(t*12)%2)?1:-1;if(Math.random()<.7)parts.push({x:a.cx+(Math.random()*8-4),y:GROUND-1,vx:(Math.random()*2-1)*1.2,vy:-1-Math.random()*1.2,g:.1,life:24,c:Math.random()<.5?"#8a5a33":"#c79a62",s:Math.random()<.5?2:1})});
  a.ox=0;
  await tween(240,t=>{a.oy=Math.round(a.h*easeIn(t))});
  const mound=addFx(999,()=>{px(a.cx-5,GROUND-1,"#2b2118",11,2);px(a.cx-4,GROUND-2,"#8a5a33",9,2);px(a.cx-2,GROUND-3,"#8a5a33",5,1)});
  for(let i=0;i<3;i++){await sleep(160);mound.draw=()=>{const j=i%2;px(a.cx-5+j,GROUND-1,"#2b2118",11,2);px(a.cx-4+j,GROUND-2,"#8a5a33",9,2)}}
  mound.life=0;
  burst(a.cx,GROUND-1,["#8a5a33","#c79a62","#e0c193"],16,1.5,.12);
  await tween(260,t=>{a.oy=Math.round(lerp(a.h,-12,easeOut(t)));a.sy=1.15});
  a.clip=false;
  await tween(180,t=>{a.oy=Math.round(-12*(1-easeIn(t)));a.sy=lerp(1.15,1,t)});
  a.oy=0;await squash(a,1.15,.85,80);await squash(a,1,1,120);
  a.busy=false;a.dodge=true;
};
ANIM.dash=async(a,d,m)=>{
  const dir=a.face,gap=gapTo(a,d);
  await squash(a,1.2,.78,180);
  await tween(80,t=>{a.ox=Math.round(gap*dir*t);a.sx=1.4;a.sy=.8;ghost(a,"#f2b6c0");ghost(a);speedLines(a,dir)});
  a.sx=1;a.sy=1;
  await tween(140,t=>{a.rot=Math.sin(t*Math.PI*2)*.25});a.rot=0;
  await strike(a,d,m,{colors:["#f2b6c0","#ffffff"]});
  await tween(90,t=>{a.ox=Math.round(gap*dir*(1-t));a.sx=1.3;ghost(a,"#f2b6c0")});
  a.ox=0;a.sx=1;
};

// Turtle
ANIM.shellspin=async(a,d,m)=>{
  const dir=a.face,gap=gapTo(a,d)+2;
  await squash(a,1.05,.75,200);
  let spin=0;
  await tween(320,t=>{spin+=.5+t;a.sx=Math.cos(spin)*.9||.1;a.ox=Math.round(-2*dir*Math.sin(t*Math.PI));if(Math.random()<.5)dust(a.cx+a.ox,dir,1)});
  await tween(220,t=>{spin+=.9;a.sx=Math.cos(spin)*.9;a.ox=Math.round(gap*dir*easeIn(t));
    parts.push({x:a.cx+a.ox-dir*a.w/3,y:GROUND-1,vx:-dir*(.5+Math.random()),vy:-Math.random()*1.2,g:.08,life:12,c:Math.random()<.5?"#ffd36a":"#ffffff",s:1});speedLines(a,dir)});
  await strike(a,d,m,{knock:12,shakeAmt:1.3,colors:["#8fd44a","#ffd36a","#ffffff"]});
  await tween(380,t=>{spin+=.7*(1-t);a.sx=Math.cos(spin)*.9;a.ox=Math.round(gap*dir*(1-easeOut(t)));a.oy=-Math.round(Math.sin(t*Math.PI)*6)});
  a.ox=0;a.oy=0;a.sx=1; await squash(a,1,1,150);
};
ANIM.shell=async(a,d,m)=>{
  await squash(a,1.08,.72,180);
  a.tint="#bfe6ff";
  for(let i=0;i<3;i++)ring(a.cx,GROUND-a.h/2,a.w/2+8,"#bfe6ff",22,.7,false);
  await sleep(320);a.guard=true;a.tint=null;await squash(a,1,1,200);
};
ANIM.chomp=async(a,d,m)=>{
  const dir=a.face,gap=gapTo(a,d)+2;
  for(let s=0;s<4;s++){const from=gap*s/4,to=gap*(s+1)/4;
    await tween(200,t=>{a.ox=Math.round(lerp(from,to,t)*dir);a.oy=-Math.round(Math.sin(t*Math.PI)*1.5)});dust(a.cx+a.ox,dir,1)}
  a.oy=0;
  const jx=d.cx,jy=GROUND-d.h*.55,jw=Math.max(18,d.w+6);
  let open=1;
  const jaws=addFx(999,()=>{const gapH=Math.round(open*(d.h*.6+6))+1,x0=Math.round(jx-jw/2),top=jy-gapH,bot=jy+gapH-4;
    px(x0,top-5,"#2b2118",jw,6);px(x0+1,top-4,"#6db33a",jw-2,4);px(x0,bot,"#2b2118",jw,6);px(x0+1,bot+1,"#6db33a",jw-2,4);
    for(let i=1;i<jw-2;i+=3){px(x0+i,top+1,"#ffffff",2,2);px(x0+i+1,top+3,"#ffffff",1,1);px(x0+i,bot-2,"#ffffff",2,2);px(x0+i+1,bot-3,"#ffffff",1,1)}},false);
  await tween(380,t=>{open=1+.15*Math.sin(t*Math.PI)});
  await tween(90,t=>{open=1-easeIn(t)});
  shake=2;float("CHOMP",jx,jy-d.h*.5-6,"#ffd36a",false,true);
  await strike(a,d,m,{knock:3,shakeAmt:1.5,colors:["#ffffff","#8fd44a"]});
  await tween(160,t=>{open=t*.8});jaws.life=0;
  await returnHome(a,420);
};

// Frog
ANIM.tongue=async(a,d,m)=>{
  const dir=a.face,y=GROUND-Math.round(a.h*.42),x1=a.cx+dir*a.w*.35,target=d.cx-dir*d.w*.15,ty=GROUND-d.h*.5;
  await squash(a,.88,1.1,160);
  let reach=0,wob=1,yank=0;
  const tongue=addFx(999,()=>{const n=Math.round(Math.abs(target+yank*dir*-1-x1)*reach);let lastY=y;
    for(let i=0;i<=n;i++){const t=n?i/n:0,x=x1+dir*i,yy=lerp(y,ty,t)+Math.sin(t*Math.PI*3+performance.now()/40)*2*wob*(1-t);px(x,yy-1,"#2b2118",1,3);lastY=yy}
    for(let i=0;i<=n;i++){const t=n?i/n:0,x=x1+dir*i,yy=lerp(y,ty,t)+Math.sin(t*Math.PI*3+performance.now()/40)*2*wob*(1-t);px(x,yy,"#e86a8a")}
    const tx=x1+dir*n;px(tx-2,lastY-2,"#2b2118",5,5);px(tx-1,lastY-1,"#ff9ab4",3,3)});
  await tween(170,t=>{reach=easeOut(t);a.sx=lerp(.88,1.12,t);a.sy=lerp(1.1,.92,t)});
  wob=0;
  const hit=await strike(a,d,m,{knock:0,colors:["#e86a8a","#ffffff"]});
  if(hit&&d.hp>0){d.busy=true;await tween(170,t=>{d.ox=-Math.round(dir*12*Math.sin(t*Math.PI*.5))});
    await tween(200,t=>{d.ox=Math.round(-dir*12*(1-back(t)))});d.ox=0;d.busy=false}
  await tween(140,t=>{reach=1-t});tongue.life=0;
  await squash(a,1,1,120);
};
ANIM.crown=async(a,d,m)=>{
  const dir=a.face,cr=SPRITES.crown;
  const sx0=a.cx+dir*(9.5-7),sy0=GROUND-a.h+2,x1=d.cx,y1=GROUND-d.h*.6;
  await squash(a,1.1,.88,140);
  a.bare=true; const p={x:sx0,y:sy0,spin:0};
  const fx=addFx(999,()=>{lx.save();lx.translate(Math.round(p.x),Math.round(p.y));lx.scale(Math.cos(p.spin)||.15,1);lx.drawImage(IMG.crown,-Math.round(cr.w/2),-Math.round(cr.h/2));lx.restore()});
  squash(a,1,1,160);
  await tween(380,t=>{p.x=lerp(sx0,x1,t);p.y=lerp(sy0,y1,t)-Math.sin(t*Math.PI)*16;p.spin+=.7;if(Math.random()<.5)parts.push({x:p.x,y:p.y,vx:0,vy:0,g:0,life:10,c:"#ffd36a",s:1})});
  const hit=await strike(a,d,m,{knock:4,colors:["#f8c53a","#e88a36","#ffffff"]});
  if(hit&&d.hp>0){d.dizzy=true;setTimeout(()=>d.dizzy=false,900/speed)}
  await tween(420,t=>{p.x=lerp(x1,sx0,easeIO(t));p.y=lerp(y1,sy0,t)+Math.sin(t*Math.PI)*10;p.spin+=.7});
  fx.life=0;a.bare=false;star(sx0,sy0,"#ffd36a",12,4);
  await squash(a,1.1,.85,80);await squash(a,1,1,140);
};
ANIM.lily=async(a,d,m)=>{
  const x=a.cx;
  const pad=addFx(110,p=>{const g=p<.15?easeOut(p/.15):p>.8?1-(p-.8)/.2:1,w=Math.round(16*g);if(w<2)return;
    px(x-w/2-1,GROUND-1,"#2b2118",w+2,4);px(x-w/2,GROUND,"#5aa52c",w,2);px(x-w/2+1,GROUND-1,"#8fd032",w-2,1);px(x+w/4,GROUND-1,"#2b2118",2,1)},true);
  await sleep(160);
  await squash(a,1.2,.75,160);
  await tween(420,t=>{a.oy=-Math.round(Math.sin(t*Math.PI)*30);a.sx=t<.5?.85:1;a.sy=t<.5?1.2:1;a.rot=Math.sin(t*Math.PI*2)*.2;if(t<.5)ghost(a,"#c4f129")});
  a.oy=0;a.rot=0;
  ring(x,GROUND+1,18,"#9be0ff",22);ring(x,GROUND+1,11,"#ffffff",18);
  burst(x,GROUND-1,["#9be0ff","#ffffff"],10,1.2,.1);
  await squash(a,1.2,.8,80);await squash(a,1,1,140);
  a.dodge=true;
};

// Hedgehog
ANIM.quills=async(a,d,m)=>{
  const dir=a.face;
  await tween(320,t=>{a.sx=1+.15*t;a.sy=1+.12*t;a.ox=(Math.floor(t*14)%2)?1:-1});
  a.ox=0;
  const arcs=[14,6,-2];
  for(let i=0;i<3;i++){
    const q={x:a.cx+dir*a.w*.1,y:GROUND-a.h+3,ang:0};
    const fx=addFx(999,()=>{const dx=Math.cos(q.ang),dy=Math.sin(q.ang);for(let k=0;k<6;k++)px(q.x-dx*k*dir,q.y-dy*k,"#5a3a1e");px(q.x+dir,q.y,"#f6e7c4")});
    burst(q.x,q.y,"#a8703c",3,.6);
    a.sx=.95;a.sy=.95;
    const x0=q.x,y0=q.y,x1=d.cx-dir*d.w*.2,y1=GROUND-d.h*(.35+i*.15);let px0=x0,py0=y0;
    await tween(230,t=>{q.x=lerp(x0,x1,t);q.y=lerp(y0,y1,t)-Math.sin(t*Math.PI)*arcs[i];q.ang=Math.atan2((q.y-py0),Math.abs(q.x-px0)||1);px0=q.x;py0=q.y;a.sx=lerp(.95,1.1,t);a.sy=lerp(.95,1.08,t)});
    fx.life=0;
    // stuck quill
    const sx=q.x,sy=q.y,ang=q.ang;addFx(40,p=>{lx.globalAlpha=1-p;for(let k=0;k<4;k++)px(sx-Math.cos(ang)*k*dir,sy-Math.sin(ang)*k,"#5a3a1e");lx.globalAlpha=1});
    await strike(a,d,m,{knock:2,colors:["#a8703c","#ffffff"]});
    if(d.hp<=0)break;
  }
  await squash(a,1,1,160);
};
ANIM.curl=async(a,d,m)=>{
  await squash(a,.9,.85,140);
  await tween(420,t=>{a.rot=Math.PI*4*easeIO(t);a.oy=-Math.round(Math.sin(t*Math.PI)*8)});
  a.rot=0;a.oy=0;
  for(let i=0;i<10;i++){const ang=-Math.PI*(i/9);parts.push({x:a.cx,y:GROUND-a.h/2,vx:Math.cos(ang)*1.2,vy:Math.sin(ang)*1.2,g:0,life:14,c:"#a8703c",s:1})}
  await squash(a,1,1,150);a.guard=true;
};
ANIM.spikeroll=async(a,d,m)=>{
  const dir=a.face,gap=gapTo(a,d)+2,r=a.h/2;
  await squash(a,.92,.92,120);
  let rot=0;
  await tween(420,t=>{rot+=.35+t*.5;a.rot=rot;a.ox=(Math.floor(t*16)%2)?1:-1;if(Math.random()<.7)parts.push({x:a.cx-dir*(a.w/2),y:GROUND-1,vx:-dir*(1+Math.random()*1.5),vy:-Math.random()*1.4,g:.1,life:18,c:Math.random()<.5?"#e0c193":"#c79a62",s:Math.random()<.5?2:1})});
  await tween(200,t=>{const x=gap*easeIn(t);a.ox=Math.round(x*dir);a.rot=rot+x/r;ghost(a,"#e8c79a");speedLines(a,dir)});
  rot=a.rot;
  await strike(a,d,m,{knock:9,shakeAmt:1.3,colors:["#a8703c","#ffd36a","#ffffff"]});
  await tween(420,t=>{const x=gap*(1-easeOut(t));a.ox=Math.round(x*dir);a.oy=-Math.round(Math.sin(t*Math.PI)*12);a.rot=rot-(gap-x)/r});
  a.ox=0;a.oy=0;
  await tween(160,t=>{a.rot=lerp(a.rot,Math.round(a.rot/(Math.PI*2))*Math.PI*2,t)});
  a.rot=0;await squash(a,1.15,.85,70);await squash(a,1,1,130);
};


// ---------- ScoreQuest glue: the corner arena ----------
// Pomelo (the capybara) holds the left side for the whole session. Each
// question sends in its own boss critter on the right. A right answer lets
// Pomelo dispel the boss; a miss lets the boss show off its move while
// Pomelo stays unbothered. No numbers, no player health: low-anxiety rules.

/* biome backdrops: sky bands, far hills, near hills, grass, path */
const BIOME_BG = {
  lorewood:      { sky:["#3a2a4f","#553657","#7a4660","#a2566a","#c8707a"], far:"#4a2f45", near:"#2f2236", grass:"#5c3b3f", tuft:"#7a4a4a", path:"#8a6a58", dot:"#e25b4a" },
  storyforge:    { sky:["#2b2230","#4a2f30","#74402f","#a8582f","#d9803a"], far:"#3d2b2a", near:"#2a1f1f", grass:"#4b3a2c", tuft:"#6a5038", path:"#6e5a4a", dot:"#ffb04a" },
  inkreef:       { sky:["#7cc4e4","#8ccde8","#9ed6ec","#b2e0ef","#c8eaf2"], far:"#5aa7b5", near:"#3f8f9e", grass:"#e6d39a", tuft:"#d4bd7f", path:"#f0e2b4", dot:"#ff8fa8" },
  syntaxcitadel: { sky:["#8fa6c8","#a3b6d2","#b8c6dc","#cdd6e6","#e0e6ef"], far:"#8d94a3", near:"#6e7585", grass:"#9aa39a", tuft:"#7f887f", path:"#c7c1b2", dot:"#f2d36a" },
  mirrormines:   { sky:["#1d1830","#2a2142","#382b56","#47366a","#574380"], far:"#2c2440", near:"#211b33", grass:"#3b3150", tuft:"#584a78", path:"#5b5070", dot:"#b892ff" },
  infinityisles: { sky:["#f6c9d9","#f1d3e6","#e8dcf0","#dde4f5","#d4ecf6"], far:"#b9a3d8", near:"#9b86c4", grass:"#bfe3b0", tuft:"#9fcf8e", path:"#f2e9d0", dot:"#c69bff" },
  datadocks:     { sky:["#36506b","#466480","#587a95","#6d90aa","#86a8bf"], far:"#3a5266", near:"#2c4152", grass:"#7a6a55", tuft:"#665846", path:"#a08a6a", dot:"#ffd36a" },
  prismpeaks:    { sky:["#18233f","#22305a","#2d3f73","#3c538c","#5470a6"], far:"#c8d6ee", near:"#9fb2d6", grass:"#e8eef7", tuft:"#c9d4e8", path:"#d7deea", dot:"#8fe3ff" }
};
const bg=document.createElement("canvas"); bg.width=W; bg.height=H;
function paintBg(id){
  /* squarer battle screen: big sky, layered hills, grass, an oval platform under each fighter */
  const p=BIOME_BG[id]||BIOME_BG.inkreef, b=bg.getContext("2d");
  b.clearRect(0,0,W,H);
  const skyH=Math.round(H*.55), band=Math.ceil(skyH/p.sky.length);
  p.sky.forEach((c,i)=>{b.fillStyle=c;b.fillRect(0,i*band,W,band+1)});
  b.fillStyle="rgba(255,255,255,.5)";
  [[12,14,18],[70,9,24],[130,22,14],[40,34,12],[150,40,12]].forEach(([x,y,w])=>{b.fillRect(x,y,w,2);b.fillRect(x+3,y-1,w-7,1)});
  b.fillStyle="#fff6d8"; for(let i=0;i<14;i++){const x=(i*37)%W,y=(i*23)%Math.round(H*.35);if(i%3===0)b.fillRect(x,y,1,1)}
  const hy=Math.round(H*.48);
  b.fillStyle=p.far; for(let x=0;x<W;x++){const h=Math.round(hy+Math.sin(x/13)*5+Math.sin(x/5)*1.3);b.fillRect(x,h,1,H-h)}
  b.fillStyle=p.near; for(let x=0;x<W;x++){const h=Math.round(hy+10+Math.sin(x/4.5)*2+Math.sin(x/2.1)*1);b.fillRect(x,h,1,H-h)}
  const gy=Math.round(H*.66);
  b.fillStyle=p.grass; b.fillRect(0,gy,W,H-gy);
  b.fillStyle=p.tuft; for(let y=gy+3;y<H;y+=4)for(let x=(y%8);x<W;x+=8)b.fillRect(x,y,1,1);
  /* the two battle platforms */
  [[A_X,GROUND+2,22],[B_X,GROUND+2,20]].forEach(([cx,cy,rx])=>{
    const ry=Math.round(rx*.28);
    for(let y=-ry;y<=ry;y++){const w=Math.round(rx*Math.sqrt(1-(y*y)/(ry*ry)));b.fillStyle=y<0?p.path:"rgba(0,0,0,.18)";b.fillRect(cx-w,cy+y,w*2,1)}
    b.fillStyle="rgba(255,255,255,.18)";b.fillRect(cx-Math.round(rx*.6),cy-ry+1,Math.round(rx*1.2),1);
  });
  [[8,H-14],[W-10,H-20],[20,H-6],[W-24,H-5],[W/2,H-10]].forEach(([x,y])=>{b.fillStyle=p.dot;b.fillRect(x,y,1,1);b.fillRect(x-1,y+1,3,1);b.fillRect(x,y+2,1,1)});
}

async function returnHome(f,ms=260){const ox=f.ox,oy=f.oy,rot=f.rot;await tween(ms,t=>{const e=easeOut(t);f.ox=Math.round(ox*(1-e));f.oy=Math.round(oy*(1-e)-Math.sin(t*Math.PI)*4);f.rot=rot*(1-e)});Object.assign(f,{ox:0,oy:0,rot:0,sx:1,sy:1})}
async function squash(f,sx,sy,ms=150){const a=f.sx,b=f.sy;await tween(ms,t=>{const e=easeOut(t);f.sx=lerp(a,sx,e);f.sy=lerp(b,sy,e)})}
/* no numbers: a hit is a flash, a burst and a knock. Pomelo (soft) just shrugs it off */
async function strike(att,def,move,{knock=4,shakeAmt=1,colors=["#fff"],hx}={}){
  hx=hx??def.cx+def.ox; const hy=GROUND-def.h*.55;
  def.dodge=false; def.guard=false;
  def.flash=def.soft?3:6; shake=def.soft?.6:shakeAmt;
  const ix=hx-def.side*def.w*.2;
  star(ix,hy,"#ffffff",14,def.soft?4:6); burst(ix,hy,colors,def.soft?6:12);
  if(def.soft&&!def._said){def._said=true;float("oof",def.cx,GROUND-def.h-5,"#fff2c9",false,true)}
  await sleep(65);
  const ox0=def.ox; def.busy=true;
  const k=def.soft?Math.min(3,knock):knock;
  await tween(170,t=>{def.ox=ox0+Math.round(Math.sin(t*Math.PI)*k*def.side);def.sx=1-.12*Math.sin(t*Math.PI)});
  def.ox=ox0;def.sx=1;def.busy=false;
  return true;
}
function setLog(a,b=""){const l=document.getElementById("cx-log");if(l)l.textContent=a}

async function doMove(att,def,move){
  att.busy=true;
  try{await ANIM[move.anim](att,def,move)}finally{
    Object.assign(att,{busy:false,clip:false,bare:false,tint:null});
    Object.assign(def,{ox:0,busy:false});
  }
}
async function zenShrug(f){
  f.busy=true;await squash(f,1.08,.9,200);f.tint="#bfffd0";
  for(let i=0;i<2;i++){ring(f.cx,GROUND,20,"#9be0ff",34,.3,true);rise(f,["#d6fff0","#ffffff","#b8ff9a"],4);await sleep(220)}
  f.tint=null;await squash(f,1,1,180);f.busy=false;f._said=false;
}
async function victoryHop(f,n=2){
  for(let i=0;i<n;i++){f.busy=true;await squash(f,1.15,.85,70);
    await tween(240,t=>{f.oy=-Math.round(Math.sin(t*Math.PI)*8);f.sy=t<.5?1.1:1;f.sx=t<.5?.92:1});f.oy=0;
    burst(f.cx,GROUND-f.h-2,["#ffd36a","#ffffff","#ff8fb0"],5,1.1,.05)}
  await squash(f,1,1,100);f.busy=false;
}
async function knockOver(f){
  f.busy=true;f.dizzy=false;
  await tween(400,t=>{f.oy=-Math.round(Math.sin(t*Math.PI)*12);f.rot=-Math.PI*easeIO(t);f.ox=Math.round(f.side*8*t)});
  f.rot=0;f.upside=true;f.oy=0;shake=1.6;ring(f.cx+f.ox,GROUND+1,16,"#fff2c9",20);dust(f.cx+f.ox,0,8);
  await squash(f,1.15,.85,90);await squash(f,1,1,120);f.dizzy=true;
}

/* one boss per biome. Its ward (health) drops by one pip per correct answer;
   at zero it is dispelled. Pomelo has no health at all. */
const POMELO_MOVES=ROSTER.capybara.moves.filter(m=>m.dmg);
let chain=Promise.resolve(), started=false, winCount=0, ward={hp:0,max:0}, motion="full";
function queue(fn){chain=chain.then(fn).catch(e=>{console.error(e)});return chain}
function freshPomelo(){A=makeFighter("capybara",-1);A.name="Pomelo";A.soft=true}
function pips(){
  const el=document.getElementById("cx-ward"); if(!el)return;
  let h="";for(let i=0;i<ward.max;i++)h+='<i class="'+(i<ward.hp?"on":"")+'"></i>';
  el.innerHTML=h; el.setAttribute("aria-label",B?B.name+" ward: "+ward.hp+" of "+ward.max+" left":"");
}
function hud(){const n=document.getElementById("cx-boss");if(n)n.textContent=B?B.name:"";pips()}

window.SQArena={
  bossName:k=>ROSTER[k]?ROSTER[k].name:k,
  sprite:k=>SPRITES[k],
  ready:loadAll().then(()=>{resize();freshPomelo();if(!started){started=true;requestAnimationFrame(loop)}
    if("ResizeObserver" in window)new ResizeObserver(resize).observe(cv.parentElement)}),
  /* the biome's boss walks in with hp of max ward pips left */
  enter(biomeId,key,name,hp,max){return queue(async()=>{
    paintBg(biomeId);
    banner=null;fxs=[];parts=[];floats=[];
    freshPomelo();
    ward={hp,max};
    B=makeFighter(key,1);B.name=name;hud();
    if(hp<=0){B.upside=true;B.dizzy=true;B.ox=8;banner={text:"Dispelled!",t:1};setLog(`${name} is dispelled. ${biomeName(biomeId)} is clear.`);return}
    if(motion==="off"){setLog(hp<max?`${name} is back, ${hp} of ${max} ward pips left.`:`${name} guards ${biomeName(biomeId)}.`);return}
    B.ox=90;B.busy=true;
    setLog(hp<max?`${name} is back, ${hp} of ${max} ward pips left.`:`${name} guards ${biomeName(biomeId)}.`);
    await tween(520,t=>{B.ox=Math.round(90*(1-easeOut(t)));if(t<.8&&Math.random()<.4)dust(B.cx+B.ox,-1,1)});
    B.ox=0;B.busy=false;await squash(B,1.12,.86,90);await squash(B,1,1,120);
  })},
  /* a correct answer: one hit, one pip */
  hit(){return queue(async()=>{
    if(!B)return;
    const m=POMELO_MOVES[winCount++%POMELO_MOVES.length];
    if(B.upside){setLog(`Already dispelled. Pomelo does a happy hop anyway.`);if(motion==="full")await victoryHop(A,1);return}
    setLog(`Pomelo used ${m.name}!`);
    if(motion==="full")await doMove(A,B,m);
    else if(motion==="calm")await strike(A,B,m,{knock:3,shakeAmt:0});
    ward.hp=Math.max(0,ward.hp-1);pips();
    if(ward.hp>0){
      float(ward.hp===1?"one pip left":"ward cracks",B.cx,GROUND-B.h-6,"#ffd36a",false,true);
      setLog(ward.hp===1?`${B.name} is wobbling. One more correct answer!`:`${B.name}'s ward cracks. ${ward.hp} of ${ward.max} pips left.`);
      return;
    }
    if(motion==="off"){B.upside=true;B.dizzy=true;B.ox=8}
    else{await sleep(120);await knockOver(B)}
    banner={text:"Dispelled!",t:motion==="off"?1:0};
    setLog(`${B.name} is dispelled! The biome is clear.`);
    if(motion==="full")await victoryHop(A,3);
  })},
  /* a miss: the boss shows off, Pomelo stays unbothered, the ward stays where it was */
  miss(){return queue(async()=>{
    if(!B||B.upside)return;
    const atk=ROSTER[B.key].moves.filter(m=>m.dmg);
    const m=atk[Math.floor(Math.random()*atk.length)];
    setLog(`${B.name} used ${m.name}!`);
    if(motion==="full"){await doMove(B,A,m);await zenShrug(A)}
    else if(motion==="calm"){await strike(B,A,m,{knock:2,shakeAmt:0});A._said=false}
    setLog(`Pomelo shakes it off.`);
    if(motion==="full")await victoryHop(B,1);
  })},
  idle(){return chain},
  setMotion(m){motion=m==="calm"||m==="off"?m:"full";if(motion!=="full"){shake=0}},
  get motion(){return motion},
  get ward(){return {hp:ward.hp,max:ward.max}}
};
const BIOME_NAMES={lorewood:"Lorewood",storyforge:"Story Forge",inkreef:"Ink Reef",syntaxcitadel:"Syntax Citadel",mirrormines:"Mirror Mines",infinityisles:"Infinity Isles",datadocks:"Data Docks",prismpeaks:"Prism Peaks"};
function biomeName(id){return BIOME_NAMES[id]||id}

})();
