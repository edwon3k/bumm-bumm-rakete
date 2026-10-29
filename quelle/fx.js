// ===== Feuerwerk-Partikelsystem =====
const COLORS = ['#ff4646','#ff8f2a','#ffd54a','#fff67e','#a6ff5c','#3dff94','#4cf2ff','#4f8fff','#a764ff','#ff58dc','#ffa8d8','#ffffff','#cfd9ff','#ff6a2a'];
const C = {red:0,orange:1,gold:2,yellow:3,lime:4,green:5,cyan:6,blue:7,violet:8,magenta:9,pink:10,white:11,silver:12,ember:13};
const SPRITES = COLORS.map(col=>{
  const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
  const gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.18,col); gr.addColorStop(0.45,col+'55'); gr.addColorStop(1,col+'00');
  g.fillStyle=gr; g.fillRect(0,0,64,64); return c;
});
const F_STREAK=1, F_STROBE=2, F_CRACKLE=4, F_CROSS=8, F_EMBER=16, F_TWINKLE=32, F_SHIFT=64, F_WIGGLE=128;
const FX = { parts:[], flashes:[], timers:[], smoke:[], shocks:[], scale:1, maxParts:7000, time:0, light:{v:0,r:255,g:255,b:255} };
const RGB = COLORS.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
const SMOKE = (()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'); const gr=x.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(150,158,190,0.55)'); gr.addColorStop(0.5,'rgba(120,128,165,0.25)'); gr.addColorStop(1,'rgba(100,110,150,0)'); x.fillStyle=gr; x.fillRect(0,0,128,128); return c; })();
function addP(x,y,vx,vy,o){
  if(FX.parts.length>=FX.maxParts) return null;
  const p={x,y,vx,vy,life:o.life||1.4,max:o.life||1.4,c:o.c|0,c2:o.c2===undefined?-1:o.c2,size:o.size||2.2,drag:o.drag===undefined?2.2:o.drag,grav:o.grav===undefined?70*FX.scale:o.grav,fl:o.fl||0,seed:Math.random()*100,wig:o.wig||0};
  p.max=p.life*= (0.85+Math.random()*0.3);
  FX.parts.push(p); return p;
}
function sphereDir(){ const z=Math.random()*2-1, a=Math.random()*Math.PI*2, r=Math.sqrt(1-z*z); return [r*Math.cos(a), r*Math.sin(a)]; }
function pick(arr){ return arr[(Math.random()*arr.length)|0]; }
function flash(x,y,c,r,str=1){
  FX.flashes.push({x,y,c,r,life:0.45,max:0.45,str});
  // Himmel und Stadt werden kurz in der Farbe der Explosion angeleuchtet
  const k=Math.min(1,0.35*str*(r/(250*FX.scale)));
  const rgb=RGB[c]; const L=FX.light;
  const w=L.v+k||1; L.r=(L.r*L.v+rgb[0]*k)/w; L.g=(L.g*L.v+rgb[1]*k)/w; L.b=(L.b*L.v+rgb[2]*k)/w; L.v=Math.min(1.3,L.v+k);
  // Pulverrauch, der noch lange am Himmel hängt
  const gp=typeof GFX!=='undefined'&&GFX.ok; const n=PERF.low?2:(gp?5:4);
  for(let i=0;i<n && FX.smoke.length<(gp?260:140);i++){ const a=Math.random()*Math.PI*2, d=Math.random()*r*0.35;
    FX.smoke.push({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,vx:(Math.random()-0.5)*8,vy:-4-Math.random()*6,r:r*0.18,gr:r*0.07,life:7+Math.random()*4,max:11,c,lit:1}); }
}
function later(dt,fn){ FX.timers.push({t:FX.time+dt,fn}); }

// Grund-Explosionen
const SHAPES = {
  peony(x,y,c,c2,s){ const R=195*FX.scale*s, k=2.4, n=Math.round((PERF.low?80:125)*s);
    for(let i=0;i<n;i++){ const [dx,dy]=sphereDir(); const v=R*k*(0.95+Math.random()*0.1); addP(x,y,dx*v,dy*v,{c,c2,life:1.5,size:2.6,drag:k,fl:c2>=0?F_SHIFT:0}); } flash(x,y,c,R*1.5); },
  chrysanthemum(x,y,c,c2,s){ const R=205*FX.scale*s, k=2.2, n=Math.round((PERF.low?65:100)*s);
    for(let i=0;i<n;i++){ const [dx,dy]=sphereDir(); const v=R*k; addP(x,y,dx*v,dy*v,{c,c2,life:1.8,size:2.0,drag:k,fl:F_STREAK|F_EMBER|(c2>=0?F_SHIFT:0)}); } flash(x,y,c,R*1.5); },
  ring(x,y,c,c2,s){ const R=170*FX.scale*s, k=2.4, n=Math.round(64*s); const tilt=0.3+Math.random()*0.7, rot=Math.random()*Math.PI;
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; let dx=Math.cos(a), dy=Math.sin(a)*tilt; const rx=dx*Math.cos(rot)-dy*Math.sin(rot), ry=dx*Math.sin(rot)+dy*Math.cos(rot); const v=R*k; addP(x,y,rx*v,ry*v,{c,life:1.5,size:2.8,drag:k}); }
    if(c2>=0) for(let i=0;i<30;i++){ const [dx,dy]=sphereDir(); addP(x,y,dx*R,dy*R,{c:c2,life:1.0,size:2,drag:k}); }
    flash(x,y,c,R*1.3); },
  willow(x,y,c,c2,s){ const R=150*FX.scale*s, k=3.0, n=Math.round(75*s);
    for(let i=0;i<n;i++){ const [dx,dy]=sphereDir(); const v=R*k; addP(x,y,dx*v,dy*v,{c:c===undefined?C.gold:c,life:3.4,size:2.0,drag:k,grav:55*FX.scale,fl:F_EMBER|F_TWINKLE}); } flash(x,y,C.gold,R*1.4); },
  palm(x,y,c,c2,s){ const R=190*FX.scale*s, k=1.9, n=Math.round(10*s)+2;
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+Math.random()*0.2; const v=R*k*(0.9+Math.random()*0.2); addP(x,y,Math.cos(a)*v,Math.sin(a)*v,{c,life:2.2,size:4.2,drag:k,grav:80*FX.scale,fl:F_EMBER|F_STREAK}); }
    for(let i=0;i<20;i++){ const [dx,dy]=sphereDir(); addP(x,y,dx*R*0.6,dy*R*0.6,{c:c2>=0?c2:C.white,life:0.8,size:2,drag:3}); }
    flash(x,y,c,R*1.6); },
  crossette(x,y,c,c2,s){ const R=150*FX.scale*s, k=2.2, n=Math.round(14*s);
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; const v=R*k; addP(x,y,Math.cos(a)*v,Math.sin(a)*v,{c,c2,life:1.6,size:3.2,drag:k,fl:F_CROSS|F_STREAK}); } flash(x,y,c,R*1.2); },
  strobe(x,y,c,c2,s){ const R=170*FX.scale*s, k=2.4, n=Math.round(80*s);
    for(let i=0;i<n;i++){ const [dx,dy]=sphereDir(); const v=R*k; addP(x,y,dx*v,dy*v,{c:Math.random()<0.5?C.white:(c2>=0?c2:C.silver),life:2.2,size:2.6,drag:k,grav:40*FX.scale,fl:F_STROBE}); }
    SHAPES.peony(x,y,c,-1,s*0.5); },
  crackle(x,y,c,c2,s){ const R=165*FX.scale*s, k=2.4, n=Math.round(80*s);
    for(let i=0;i<n;i++){ const [dx,dy]=sphereDir(); const v=R*k; addP(x,y,dx*v,dy*v,{c:c===undefined?C.gold:c,life:1.2,size:2.2,drag:k,fl:F_CRACKLE}); }
    flash(x,y,C.gold,R*1.3); SFX.crackle(A.ctx?A.ctx.currentTime:0, 12); },
  // ---- Freischaltbare Formen ----
  heart(x,y,c,c2,s){ const R=10*FX.scale*s, k=2.4, n=70;
    for(let i=0;i<n;i++){ const t=i/n*Math.PI*2; const hx=16*Math.pow(Math.sin(t),3), hy=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)); addP(x,y,hx*R*k,hy*R*k,{c,life:1.7,size:2.8,drag:k,grav:25*FX.scale}); }
    if(c2>=0) SHAPES.peony(x,y,c2,-1,0.3); flash(x,y,c,180*FX.scale*s); },
  star(x,y,c,c2,s){ const R=170*FX.scale*s, k=2.4; const pts=[]; const rot=-Math.PI/2+Math.random()*0.4-0.2;
    for(let i=0;i<10;i++){ const a=rot+i/10*Math.PI*2, r=i%2?0.42:1; pts.push([Math.cos(a)*r,Math.sin(a)*r]); }
    for(let i=0;i<10;i++){ const a=pts[i], b=pts[(i+1)%10]; for(let j=0;j<8;j++){ const u=j/8; const dx=a[0]+(b[0]-a[0])*u, dy=a[1]+(b[1]-a[1])*u; addP(x,y,dx*R*k,dy*R*k,{c,life:1.7,size:2.8,drag:k,grav:25*FX.scale}); } }
    if(c2>=0) SHAPES.ring(x,y,c2,-1,0.4); flash(x,y,c,R*1.3); },
  spiral(x,y,c,c2,s){ const R=170*FX.scale*s, k=2.2, arms=4, n=18;
    for(let a=0;a<arms;a++) for(let i=0;i<n;i++){ const r=(i+1)/n, ang=a/arms*Math.PI*2 + r*2.6; addP(x,y,Math.cos(ang)*r*R*k,Math.sin(ang)*r*R*k,{c:(a%2&&c2>=0)?c2:c,life:1.8,size:2.6,drag:k,fl:F_STREAK}); }
    flash(x,y,c,R*1.3); },
  saturn(x,y,c,c2,s){ SHAPES.peony(x,y,c,-1,s*0.55); const R=200*FX.scale*s, k=2.4, n=70, tilt=0.25, rot=(Math.random()-0.5)*0.8;
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; const dx=Math.cos(a), dy=Math.sin(a)*tilt; addP(x,y,(dx*Math.cos(rot)-dy*Math.sin(rot))*R*k,(dx*Math.sin(rot)+dy*Math.cos(rot))*R*k,{c:c2>=0?c2:C.white,life:1.8,size:2.6,drag:k,grav:20*FX.scale}); } },
  smiley(x,y,c,c2,s){ const R=170*FX.scale*s, k=2.4, g=20*FX.scale;
    for(let i=0;i<48;i++){ const a=i/48*Math.PI*2; addP(x,y,Math.cos(a)*R*k,Math.sin(a)*R*k,{c,life:1.8,size:2.6,drag:k,grav:g}); }
    for(let i=0;i<16;i++){ const a=0.5+i/15*(Math.PI-1); addP(x,y,Math.cos(a)*R*k*0.6,Math.sin(a)*R*k*0.6,{c:c2>=0?c2:c,life:1.8,size:2.6,drag:k,grav:g}); }
    [[-0.35,-0.3],[0.35,-0.3]].forEach(([ex,ey])=>{ for(let i=0;i<5;i++) addP(x,y,(ex+(Math.random()-0.5)*0.05)*R*k,(ey+(Math.random()-0.5)*0.05)*R*k,{c:c2>=0?c2:c,life:1.8,size:3.2,drag:k,grav:g}); });
    flash(x,y,c,R*1.3); },
  kamuro(x,y,c,c2,s){ const R=160*FX.scale*s, k=2.8, n=Math.round(140*s);
    for(let i=0;i<n;i++){ const [dx,dy]=sphereDir(); const v=R*k; addP(x,y,dx*v,dy*v,{c:c===undefined?C.gold:c,life:3.6,size:1.8,drag:k,grav:45*FX.scale,fl:F_TWINKLE|F_EMBER}); } flash(x,y,C.gold,R*1.5,1.3); },
  horsetail(x,y,c,c2,s){ const R=120*FX.scale*s, k=2.0, n=50;
    for(let i=0;i<n;i++){ const a=-Math.PI/2+(Math.random()-0.5)*2.2; const v=R*k*(0.5+Math.random()*0.6); addP(x,y,Math.cos(a)*v,Math.sin(a)*v,{c,life:3.0,size:2.2,drag:k,grav:150*FX.scale,fl:F_EMBER|F_STREAK}); } flash(x,y,c,R*1.6); },
  butterfly(x,y,c,c2,s){ const R=55*FX.scale*s, k=2.4, n=90;
    for(let i=0;i<n;i++){ const t=i/n*Math.PI*2; const r=Math.exp(Math.sin(t))-2*Math.cos(4*t)+Math.pow(Math.sin((2*t-Math.PI)/24),5); const bx=Math.sin(t)*r, by=-Math.cos(t)*r; addP(x,y,bx*R*k,by*R*k,{c:(i%3===0&&c2>=0)?c2:c,life:1.8,size:2.4,drag:k,grav:20*FX.scale}); }
    flash(x,y,c,190*FX.scale*s); },
  multibreak(x,y,c,c2,s){ SHAPES.peony(x,y,c,-1,s*0.6); for(let i=0;i<5;i++){ const dx=(Math.random()-0.5)*260*FX.scale*s, dy=(Math.random()-0.5)*200*FX.scale*s; later(0.35+i*0.12,()=>{ SHAPES.peony(x+dx,y+dy,i%2&&c2>=0?c2:c,-1,s*0.35); SFX.boom(A.ctx?A.ctx.currentTime:0,0.35); }); } },
  fish(x,y,c,c2,s){ const R=160*FX.scale*s, k=2.0, n=36;
    for(let i=0;i<n;i++){ const [dx,dy]=sphereDir(); const v=R*k; addP(x,y,dx*v,dy*v,{c,life:2.4,size:2.4,drag:k,grav:30*FX.scale,fl:F_WIGGLE|F_EMBER,wig:6+Math.random()*4}); } flash(x,y,c,R*1.2); },
  pistil(x,y,c,c2,s){ SHAPES.peony(x,y,c,-1,s); SHAPES.peony(x,y,c2>=0?c2:C.white,-1,s*0.45); },
  doublering(x,y,c,c2,s){ SHAPES.ring(x,y,c,-1,s); SHAPES.ring(x,y,c2>=0?c2:C.white,-1,s*0.6); },
  cube(x,y,c,c2,s){ const R=150*FX.scale*s, k=2.4; const a=Math.random()*Math.PI, b=0.5; const V=[];
    for(const X of[-1,1])for(const Y of[-1,1])for(const Z of[-1,1])V.push([X,Y,Z]);
    const E=[]; for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){ let d=0; for(let q=0;q<3;q++) d+=Math.abs(V[i][q]-V[j][q]); if(d===2) E.push([V[i],V[j]]); }
    const pr=p=>{ let [X,Y,Z]=p; let x1=X*Math.cos(a)-Z*Math.sin(a), z1=X*Math.sin(a)+Z*Math.cos(a); let y1=Y*Math.cos(b)-z1*Math.sin(b); return [x1*0.6,y1*0.6]; };
    for(const [p,q] of E){ const P1=pr(p),P2=pr(q); for(let i=0;i<=6;i++){ const u=i/6; addP(x,y,(P1[0]+(P2[0]-P1[0])*u)*R*k,(P1[1]+(P2[1]-P1[1])*u)*R*k,{c:(c2>=0&&i%2)?c2:c,life:1.7,size:2.4,drag:k,grav:20*FX.scale}); } }
    flash(x,y,c,R*1.3); },
};
// ---- Himmelsschrift: Funken fliegen zu Buchstaben auseinander ----
const TXT_CACHE={};
function textPoints(str,step){ const key=str+'|'+step; if(TXT_CACHE[key]) return TXT_CACHE[key];
  const h=56, pad=8, c=document.createElement('canvas'), x=c.getContext('2d'); const font='italic 600 '+h+'px "Playfair Display",Georgia,serif';
  x.font=font; const w=Math.ceil(x.measureText(str).width)+pad*2, hh=h+pad*2; c.width=w; c.height=hh;
  x.font=font; x.fillStyle='#fff'; x.textBaseline='middle'; x.textAlign='center'; x.fillText(str,w/2,hh/2+2);
  const d=x.getImageData(0,0,w,hh).data, pts=[];
  for(let yy=0;yy<hh;yy+=step) for(let xx=(yy/step)%2?step/2:0;xx<w;xx+=step){ const xi=Math.round(xx); if(d[(yy*w+xi)*4+3]>110) pts.push([xi-w/2,yy-hh/2]); }
  return TXT_CACHE[key]={pts,w};
}
function skyText(x,y,str,c,c2,width){
  const tp=textPoints(str,PERF.low?4:3); const sc=Math.min(width/tp.w, 3.2), k=2.6;
  for(let i=0;i<tp.pts.length;i++){ const [px,py]=tp.pts[i]; const j=0.03;
    addP(x,y,px*sc*k*(1+(Math.random()-0.5)*j),py*sc*k*(1+(Math.random()-0.5)*j),{c:(c2>=0&&Math.random()<0.3)?c2:c,life:3.0,size:2.5,drag:k,grav:7*FX.scale,fl:F_TWINKLE}); }
  for(let i=0;i<40;i++){ const [dx,dy]=sphereDir(); addP(x,y,dx*width*1.4,dy*width*0.7,{c:C.white,life:0.7,size:2,drag:3}); }
  flash(x,y,c,width*1.2,1.2);
}
const BASE_TYPES=['peony','chrysanthemum','ring','willow','palm','crossette','strobe','crackle'];
// 45 freischaltbare Feuerwerke: 15 Songs × 3 Schwierigkeitsgrade
const UNLOCK_SHAPES=[['heart','Herz'],['star','Stern'],['spiral','Spirale'],['saturn','Saturn'],['smiley','Smiley'],['kamuro','Kamuro'],['horsetail','Pferdeschweif'],['butterfly','Schmetterling'],['multibreak','Kettenknall'],['fish','Fischschwarm'],['pistil','Kernblüte'],['doublering','Doppelring'],['cube','Würfel'],['palm','Palme'],['crossette','Kreuzfeuer']];
const PALETTES=[['Eis',C.cyan,C.white],['Feuer',C.orange,C.red],['Neon',C.magenta,C.lime],['Gold',C.gold,C.white],['Galaxie',C.violet,C.cyan],['Kirsch',C.pink,C.white],['Gift',C.lime,C.violet],['Ozean',C.blue,C.cyan],['Lava',C.red,C.gold],['Polar',C.silver,C.blue],['Sonnen',C.yellow,C.orange],['Mitternacht',C.blue,C.violet],['Bonbon',C.pink,C.cyan],['Smaragd',C.green,C.gold],['Rubin',C.red,C.pink]];
const UNLOCKS=[];
(function(){ let i=0; for(let s=0;s<15;s++) for(let d=0;d<3;d++){ const sh=UNLOCK_SHAPES[(s+d*5)%15], pal=PALETTES[(s*2+d*7)%15]; UNLOCKS.push({id:s*3+d, shape:sh[0], name:pal[0]+'-'+sh[1], c:pal[1], c2:pal[2]}); i++; } })();

function launchBurst(x,y,type,c,c2,s){ (SHAPES[type]||SHAPES.peony)(x,y,c,c2===undefined?-1:c2,s||1); }

function fxUpdate(dt){
  FX.time+=dt;
  for(let i=FX.timers.length-1;i>=0;i--){ if(FX.timers[i].t<=FX.time){ const f=FX.timers[i].fn; FX.timers.splice(i,1); f(); } }
  const ps=FX.parts; const spawn=[];
  for(let i=ps.length-1;i>=0;i--){
    const p=ps[i]; const dr=Math.exp(-p.drag*dt);
    p.vx*=dr; p.vy=p.vy*dr+p.grav*dt;
    if(p.fl&F_WIGGLE){ const a=Math.sin(FX.time*p.wig+p.seed)*2.5*dt; const cx=p.vx*Math.cos(a)-p.vy*Math.sin(a); p.vy=p.vx*Math.sin(a)+p.vy*Math.cos(a); p.vx=cx; }
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
    if((p.fl&F_EMBER) && Math.random()<dt*(PERF.low?8:16) && ps.length+spawn.length<FX.maxParts){ spawn.push([p.x,p.y,(Math.random()-0.5)*12,(Math.random()-0.2)*12,{c:p.c===C.gold?C.gold:(Math.random()<0.5?C.ember:p.c),life:0.55,size:1.3,drag:3,grav:40*FX.scale}]); }
    if((p.fl&F_CROSS) && p.life<p.max*0.55){
      p.fl&=~F_CROSS; const sp=Math.hypot(p.vx,p.vy)*1.6+40*FX.scale; const a=Math.atan2(p.vy,p.vx);
      for(let j=0;j<4;j++){ const b=a+Math.PI/4+j*Math.PI/2; spawn.push([p.x,p.y,Math.cos(b)*sp,Math.sin(b)*sp,{c:p.c2>=0?p.c2:p.c,life:0.7,size:2.2,drag:2.5,fl:F_STREAK}]); }
      p.life=0;
    }
    if(p.life<=0){
      if(p.fl&F_CRACKLE){ for(let j=0;j<2;j++) spawn.push([p.x,p.y,(Math.random()-0.5)*90*FX.scale,(Math.random()-0.5)*90*FX.scale,{c:C.white,life:0.18,size:1.8,drag:4,grav:0}]); }
      ps[i]=ps[ps.length-1]; ps.pop();
    }
  }
  for(const s of spawn) addP(...s);
  for(let i=FX.flashes.length-1;i>=0;i--){ const f=FX.flashes[i]; f.life-=dt; if(f.life<=0) FX.flashes.splice(i,1); }
  for(let i=FX.smoke.length-1;i>=0;i--){ const m=FX.smoke[i]; m.x+=(m.vx+7*FX.scale)*dt; m.y+=m.vy*dt; m.r+=m.gr*dt; m.gr*=Math.exp(-dt*0.4); m.life-=dt; m.lit*=Math.exp(-dt*3); if(m.life<=0){ FX.smoke[i]=FX.smoke[FX.smoke.length-1]; FX.smoke.pop(); } }
  FX.light.v*=Math.exp(-dt*4.5);
  for(let i=FX.shocks.length-1;i>=0;i--){ FX.shocks[i].life-=dt; if(FX.shocks[i].life<=0) FX.shocks.splice(i,1); }
}
function shock(x,y,c,s){ FX.shocks.push({x,y,c,s,life:0.35,max:0.35}); }
function smokeDraw(g){
  const L=FX.light;
  for(const m of FX.smoke){
    const a=Math.min(1,m.life/m.max*1.4)*Math.min(1,(m.max-m.life)*2);
    g.globalAlpha=a*(0.16+0.25*Math.min(1,L.v)); g.drawImage(SMOKE,m.x-m.r,m.y-m.r,m.r*2,m.r*2);
  }
  g.globalCompositeOperation='lighter';
  for(const m of FX.smoke){ const lv=m.lit+(m.tint||0)*(m.life/m.max); if(lv<0.03) continue; g.globalAlpha=Math.min(1,lv)*0.35; g.drawImage(SPRITES[m.c],m.x-m.r*1.2,m.y-m.r*1.2,m.r*2.4,m.r*2.4); }
  g.globalAlpha=1; g.globalCompositeOperation='source-over';
}
function fxDraw(g, waterY){
  g.globalCompositeOperation='lighter';
  for(const f of FX.flashes){
    const a=(f.life/f.max)*0.32*f.str; const gr=g.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);
    gr.addColorStop(0,COLORS[f.c]+hex2(a)); gr.addColorStop(1,COLORS[f.c]+'00'); g.fillStyle=gr; g.fillRect(f.x-f.r,f.y-f.r,f.r*2,f.r*2);
    // Spiegelung auf dem Wasser
  }
  for(const k of FX.shocks){ const u=1-k.life/k.max; const r=(16+u*150*FX.scale)*k.s; g.globalAlpha=(1-u)*0.6; g.strokeStyle=COLORS[k.c]; g.lineWidth=(1-u)*4+0.5; g.beginPath(); g.arc(k.x,k.y,r,0,Math.PI*2); g.stroke(); g.strokeStyle='#ffffff'; g.lineWidth=(1-u)*2; g.stroke();
    if(u<0.3){ const fs=(1-u/0.3)*90*k.s; g.globalAlpha=1-u/0.3; g.drawImage(SPRITES[C.white],k.x-fs,k.y-fs,fs*2,fs*2); } }
  g.globalAlpha=1;
  const t=FX.time;
  for(const p of FX.parts){
    let a=Math.min(1,(p.life/p.max)*1.7);
    if(p.fl&F_STROBE) a*= (Math.sin(t*38+p.seed*7)>0.2)?1:0.05;
    if(p.fl&F_TWINKLE) a*= 0.55+0.45*Math.sin(t*25+p.seed*9);
    if(a<=0.02) continue;
    const lf=p.life/p.max;
    let c=(p.fl&F_SHIFT && lf<0.5 && p.c2>=0)?p.c2:p.c;
    if(lf>0.9 && !(p.fl&F_STROBE)) c=C.white;            // weißglühender Kern direkt nach der Zündung
    else if(lf<0.22 && !(p.fl&(F_STROBE|F_SHIFT))){ a*=0.55+0.45*Math.random(); if(lf<0.12 && c!==C.white && c!==C.silver) c=C.ember; } // verglühen
    g.globalAlpha=a;
    if(p.fl&F_STREAK){
      g.strokeStyle=COLORS[c]; g.lineWidth=p.size*0.7; g.beginPath(); g.moveTo(p.x,p.y); g.lineTo(p.x-p.vx*0.045,p.y-p.vy*0.045); g.stroke();
    }
    const s=p.size*3.2*(0.65+0.35*lf); g.drawImage(SPRITES[c],p.x-s,p.y-s,s*2,s*2);
  }
  g.globalAlpha=1; g.globalCompositeOperation='source-over';
}
function hex2(a){ const v=Math.max(0,Math.min(255,Math.round(a*255))); return (v<16?'0':'')+v.toString(16); }
