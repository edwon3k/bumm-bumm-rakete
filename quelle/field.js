// ===== Spielfeld & HUD in Neon-Optik =====
const NEON_CYAN='#3ff4ff', NEON_PINK='#ff2fb3';
function neonStroke(col,w,glow){ g.shadowColor=col; g.shadowBlur=glow; g.strokeStyle=col; g.lineWidth=w; g.stroke(); g.shadowBlur=0; g.strokeStyle='rgba(255,255,255,0.9)'; g.lineWidth=Math.max(1,w*0.3); g.stroke(); }
function neonText(txt,x,y,font,col,glow){ g.font=font; g.shadowColor=col; g.shadowBlur=glow; g.fillStyle=col; g.fillText(txt,x,y); g.shadowBlur=0; g.fillStyle='rgba(255,255,255,0.85)'; g.fillText(txt,x,y); }
// Leuchteffekte einmal vorzeichnen und als Bild wiederverwenden: Weichzeichnen (shadowBlur) pro Bild ist teuer,
// besonders in Firefox, und ließ das Spiel bei jedem Treffer ruckeln.
const GLOW={cache:new Map()};
function glowSprite(key,w,h,draw){
  let c=GLOW.cache.get(key); if(c) return c;
  if(GLOW.cache.size>300) GLOW.cache.clear();
  c=document.createElement('canvas'); c.width=Math.max(1,Math.ceil(w)); c.height=Math.max(1,Math.ceil(h));
  draw(c.getContext('2d'),c.width,c.height); GLOW.cache.set(key,c); return c;
}
// Text mit Leuchten, mittig an (x,y) (textAlign center, textBaseline middle)
function neonTextCached(txt,x,y,font,col,glow,sc){
  const k='t|'+txt+'|'+font+'|'+col+'|'+glow+'|'+DPR;
  const c=glowSprite(k,1,1,()=>{});
  if(c.width===1){ // erstmals: messen und zeichnen
    const m=document.createElement('canvas').getContext('2d'); m.font=font; const tw=m.measureText(txt).width;
    const fs=parseFloat((font.match(/(\d+(?:\.\d+)?)px/)||[0,20])[1]); const pad=glow*2+4;
    c.width=Math.ceil((tw+pad*2)*DPR); c.height=Math.ceil((fs*1.4+pad*2)*DPR); c._w=tw+pad*2; c._h=fs*1.4+pad*2;
    const x2=c.getContext('2d'); x2.scale(DPR,DPR); x2.font=font; x2.textAlign='center'; x2.textBaseline='middle';
    x2.shadowColor=col; x2.shadowBlur=glow*DPR; x2.fillStyle=col; x2.fillText(txt,c._w/2,c._h/2); x2.shadowBlur=0; x2.fillStyle='rgba(255,255,255,0.85)'; x2.fillText(txt,c._w/2,c._h/2);
  }
  const k2=sc||1; g.drawImage(c,x-c._w*k2/2,y-c._h*k2/2,c._w*k2,c._h*k2);
}
// Schriften fertig geladen: Vorzeichnungen neu machen
try{ document.fonts.addEventListener('loadingdone',()=>GLOW.cache.clear()); }catch(e){}
// Firefox: übrige Weichzeichner im Hauptbild abschalten
const IS_FF=/firefox/i.test(navigator.userAgent);
if(IS_FF){ try{ Object.defineProperty(g,'shadowBlur',{get(){ return 0; }, set(v){}, configurable:true}); }catch(e){} }
function panelPath(x,y,w,h,sl){ g.beginPath(); g.moveTo(x+sl,y); g.lineTo(x+w,y); g.lineTo(x+w-sl,y+h); g.lineTo(x,y+h); g.closePath(); }
function laneBadge(x,y,r,lane,alpha,bright){
  const col=LANE_HEX[lane];
  g.globalAlpha=alpha;
  const rb=Math.round(r*2)/2, gl=bright?14:6, pad=gl*2+4, sz=(rb+pad)*2;
  const spr=glowSprite('b|'+lane+'|'+rb+'|'+gl+'|'+DPR, sz*DPR, sz*DPR, (x2,w)=>{ x2.scale(DPR,DPR); const c0=sz/2;
    x2.fillStyle='rgba(5,6,16,0.85)'; x2.beginPath(); x2.arc(c0,c0,rb,0,Math.PI*2); x2.fill();
    x2.lineWidth=2; x2.strokeStyle=col; x2.shadowColor=col; x2.shadowBlur=gl*DPR; x2.stroke(); });
  g.drawImage(spr,x-sz/2,y-sz/2,sz,sz);
  if(SETTINGS.glyphStyle==='arrows') drawGlyph(x,y,r*0.85,lane,col);
  else { g.fillStyle=col; g.font='700 '+Math.round(r*1.25)+'px "Josefin Sans", system-ui, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(LANE_BTN[lane],x,y+r*0.05); }
  g.globalAlpha=1;
}
// Leuchtende Bahn je Spur (einmal vorgezeichnet, dann nur gestreckt)
function laneSpr(l){ return glowSprite('lane|'+l,32,256,(x2,w,h)=>{
  const v=x2.createLinearGradient(0,0,0,h); v.addColorStop(0,LANE_HEX[l]); v.addColorStop(0.5,LANE_HEX[l]+'66'); v.addColorStop(1,LANE_HEX[l]+'00'); x2.fillStyle=v; x2.fillRect(0,0,w,h);
  x2.globalCompositeOperation='destination-in'; const hg=x2.createLinearGradient(0,0,w,0); hg.addColorStop(0,'rgba(0,0,0,0)'); hg.addColorStop(0.5,'rgba(0,0,0,1)'); hg.addColorStop(1,'rgba(0,0,0,0)'); x2.fillStyle=hg; x2.fillRect(0,0,w,h); }); }
// Rand-Leuchten (rot bei Fehlern, cyan im Bloom)
const VIG={miss:0};
function vigSpr(col){ return glowSprite('vig|'+col,256,160,(x2,w,h)=>{ x2.scale(1,h/w); const r=x2.createRadialGradient(w/2,w/2,w*0.28,w/2,w/2,w*0.72); r.addColorStop(0,col+'00'); r.addColorStop(0.6,col+'55'); r.addColorStop(1,col+'dd'); x2.fillStyle=r; x2.fillRect(0,0,w,w); }); }
function drawVignette(t){
  let a=VIG.miss*0.5;
  if(G.mode!=='practice' && G.players.some(p=>!p.failed&&p.health<0.25)) a=Math.max(a,0.2+0.16*Math.sin(t*7));
  if(a>0.01){ g.globalAlpha=Math.min(1,a); g.drawImage(vigSpr('#ff2030'),0,0,W,H); }
  if(G.players.some(p=>p.bloomOn)){ g.globalCompositeOperation='lighter'; g.globalAlpha=0.22+0.08*Math.sin(t*5); g.drawImage(vigSpr('#3ff4ff'),0,0,W,H); g.globalCompositeOperation='source-over'; }
  g.globalAlpha=1;
}
// Countdown vor der ersten Rakete
function drawCountdown(t){
  if(G.resumeAt){ const left=G.resumeAt-performance.now(); if(left>0){ const n=Math.ceil(left/400), u=1-(left%400)/400;
      g.globalAlpha=1; g.textAlign='center'; g.textBaseline='middle'; neonTextCached(String(n),W/2,H*0.15,'400 72px "Playfair Display", "Arial Black", sans-serif',NEON_CYAN,22,1.35-0.35*Math.min(1,u*4)); } return; }
  if(!G.cd||G.demo) return;
  const cd=G.cd, T1=G.cdT1; let txt=null, u=0;
  for(let i=0;i<cd.length;i++){ const a=cd[i], b=i+1<cd.length?cd[i+1]:T1; if(t>=a&&t<b){ txt=String(cd.length-i); u=(t-a)/(b-a); } }
  if(!txt && t>=T1 && t<T1+0.55){ txt='LOS!'; u=(t-T1)/0.55; }
  if(!txt) return;
  const sc=1.35-0.35*Math.min(1,u*4); g.globalAlpha=Math.max(0,1-Math.max(0,u-0.55)/0.45);
  g.textAlign='center'; g.textBaseline='middle';
  neonTextCached(txt,W/2,H*0.15,'400 72px "Playfair Display", "Arial Black", sans-serif',txt==='LOS!'?'#ffe066':NEON_CYAN,22,sc);
  g.globalAlpha=1;
}
// Raketenkörper mit Streifen und Flossen (einmal gezeichnet, als Bild wiederverwendet)
// Lichtschleier-Sprite: einmal pro Farbe/Variante vorgerechnet, dann gestreckt
const VEIL={};
function veilSpr(hex,v){ const key=hex+v; if(VEIL[key]) return VEIL[key];
  const W2=48, H2=320, c=document.createElement('canvas'); c.width=W2; c.height=H2; const x2=c.getContext('2d'), im=x2.createImageData(W2,H2), d=im.data;
  const R=parseInt(hex.slice(1,3),16), G2=parseInt(hex.slice(3,5),16), B=parseInt(hex.slice(5,7),16);
  let r=(v+1)*9301; const rnd=()=>{ r=(r*16807)%2147483647; return r/2147483647; };
  const ph=[0,0,0,0,0,0].map(()=>rnd()*6.28), fr=[3+rnd()*3,7+rnd()*5,13+rnd()*9];
  for(let yy=0;yy<H2;yy++){ const u=yy/(H2-1);
    const u0=Math.min(1,u/0.07), fade=Math.pow(1-u,1.15)*u0*u0*(3-2*u0);
    const wob=Math.sin(u*fr[0]+ph[0])*0.06*u+Math.sin(u*fr[1]+ph[1])*0.03*u;
    const sig=0.09+0.15*Math.pow(u,0.7);
    for(let xx=0;xx<W2;xx++){ const dx=(xx/(W2-1)-0.5)*2-wob;
      const prof=0.72*Math.exp(-(dx*dx)/(2*sig*sig))+0.3*Math.exp(-(dx*dx)/(2*(sig*2.1)*(sig*2.1)));
      const tex=0.86+0.09*Math.sin(u*fr[2]*2+dx*3+ph[2])+0.05*Math.sin(u*fr[1]*3-dx*5+ph[3]);
      const core=Math.exp(-(dx*dx)/(2*0.13*0.13))*Math.pow(1-u,3)*0.35;
      const a=Math.min(1,fade*prof*tex*1.15+core*0.6); const wm=Math.min(0.75,core*1.1+prof*Math.pow(1-u,6)*0.25);
      const i=(yy*W2+xx)*4; d[i]=R+(255-R)*wm; d[i+1]=G2+(255-G2)*wm; d[i+2]=B+(255-B)*wm; d[i+3]=a*255; } }
  x2.putImageData(im,0,0); return VEIL[key]=c; }
// Kopf: nur der leuchtende Buchstabe (bzw. Pfeil), kein Raketenkörper
function veilHead(x,y,r,lane,hex){
  const k='vh|'+lane+'|'+hex+'|'+Math.round(r)+'|'+SETTINGS.glyphStyle+'|'+DPR, sz=r*4;
  const spr=glowSprite(k,sz*DPR,sz*DPR,(x2,w)=>{ x2.scale(DPR,DPR); const c0=sz/2;
    if(SETTINGS.glyphStyle==='arrows'){ return; }
    x2.font='800 '+Math.round(r*1.7)+'px "Josefin Sans", system-ui, sans-serif'; x2.textAlign='center'; x2.textBaseline='middle';
    const ty=c0+r*0.06, L2=LANE_BTN[lane];
    x2.shadowColor='rgba(0,0,0,0.95)'; x2.shadowBlur=r*0.45*DPR; x2.fillStyle='rgba(0,0,0,0.85)'; x2.fillText(L2,c0,ty); x2.fillText(L2,c0,ty);
    x2.shadowColor=hex; x2.shadowBlur=r*0.7*DPR; x2.lineWidth=Math.max(2,r*0.22); x2.lineJoin='round'; x2.strokeStyle=hex; x2.strokeText(L2,c0,ty);
    x2.shadowBlur=0; x2.fillStyle='#ffffff'; x2.fillText(L2,c0,ty); });
  if(SETTINGS.glyphStyle==='arrows'){ drawGlyph(x,y,r*1.05,lane,'rgba(0,0,0,0.85)'); drawGlyph(x,y,r*0.95,lane,'#ffffff'); } else g.drawImage(spr,x-sz/2,y-sz/2,sz,sz);
}
function rocketSpr(lane,rr){ const r=Math.round(rr); return glowSprite('rk|'+lane+'|'+r+'|'+DPR,r*2.6*DPR,r*3.4*DPR,(x2,w,h)=>{
  x2.scale(DPR,DPR); const W2=r*2.6, cx=W2/2, bw=r*0.95, top=r*0.2, bot=r*2.75, col=LANE_HEX[lane];
  // Flossen
  x2.fillStyle=col; x2.globalAlpha=0.9;
  x2.beginPath(); x2.moveTo(cx-bw/2,bot-r*0.9); x2.lineTo(cx-bw/2-r*0.55,bot+r*0.35); x2.lineTo(cx-bw/2,bot); x2.closePath(); x2.fill();
  x2.beginPath(); x2.moveTo(cx+bw/2,bot-r*0.9); x2.lineTo(cx+bw/2+r*0.55,bot+r*0.35); x2.lineTo(cx+bw/2,bot); x2.closePath(); x2.fill();
  x2.globalAlpha=1;
  // Rumpf: dunkles Metall mit Glanzkante
  const gr=x2.createLinearGradient(cx-bw/2,0,cx+bw/2,0); gr.addColorStop(0,'#1a1f3a'); gr.addColorStop(0.35,'#59607f'); gr.addColorStop(0.55,'#2a3050'); gr.addColorStop(1,'#0c0f22');
  x2.fillStyle=gr; x2.fillRect(cx-bw/2,top,bw,bot-top);
  x2.fillStyle=col; x2.fillRect(cx-bw/2,top+r*1.15,bw,r*0.22); x2.fillRect(cx-bw/2,top+r*1.6,bw,r*0.12);
  x2.fillStyle='#0a0c18'; x2.fillRect(cx-bw*0.38,bot-r*0.05,bw*0.76,r*0.22); }); }
function hitLineSpan(p){ return G.players.length>1 ? [p.fx-24,p.fx+p.fw+24] : [Math.max(8,W*0.06),Math.min(W-8,W*0.94)]; }
function drawField(p,t){
  const hy=hitY(), sy=spawnY(), lw=p.fw/4, rr=Math.max(11,Math.min(lw*0.2,19));
  const sh=p.shake? (Math.random()-0.5)*p.shake*6:0;
  g.save(); g.translate(sh,0);
  const fade=p.failed?0.35:1;
  // Zündlinie: grelle Neonlinie
  const ready=p.bloom>=1&&!p.bloomOn;
  const [lx0,lx1]=hitLineSpan(p);
  const lc = p.bloomOn? 'hsl('+((t*240)%360)+',100%,62%)' : ready? (Math.sin(t*20)>0?'#ffffff':'#ffd54a') : NEON_PINK;
  g.globalAlpha=fade; g.beginPath(); g.moveTo(lx0,hy); g.lineTo(lx1,hy); neonStroke(lc, (ready||p.bloomOn?6:4)+BEAT.p*2.5, 22);
  if(ready||p.bloomOn){ g.globalCompositeOperation='lighter'; for(let k=0;k<(p.bloomOn?16:8);k++){ const x=lx0+Math.random()*(lx1-lx0); g.drawImage(SPRITES[ready?C.gold:pick([C.magenta,C.cyan,C.white])],x-9,hy-9,18,18);} g.globalCompositeOperation='source-over'; }
  // Kombo groß in der Mitte, hinter den Raketen
  const cx=p.fx+p.fw/2, cy=hy+(sy-hy)*0.42;
  g.textAlign='center'; g.textBaseline='middle';
  if(p.combo>=10){ const pu=p.cPulse, fs=Math.round(Math.min(lw*0.62,74)*(1+0.16*pu));
    g.font='400 '+fs+'px "Playfair Display", "Arial Black", sans-serif';
    g.globalAlpha=fade*(0.22+0.3*pu); g.fillStyle=p.bloomOn?'#ffe066':'#ff7ad9'; g.fillText(p.combo,cx,cy);
    g.globalAlpha=fade*(0.5+0.4*pu); g.lineWidth=1.5; g.strokeStyle=NEON_CYAN; g.strokeText(p.combo,cx,cy);
    if('letterSpacing' in g) g.letterSpacing='0.3em';
    g.globalAlpha=fade*0.6; g.font='600 12px "Josefin Sans", system-ui, sans-serif'; g.fillStyle='#c8f5ff'; g.fillText('KOMBO',cx,cy+fs*0.62);
    if('letterSpacing' in g) g.letterSpacing='0px'; }
  if(p.lost && p.lost.t<0.8){ const u=p.lost.t/0.8, fs=Math.round(Math.min(lw*0.62,74));
    g.font='400 '+fs+'px "Playfair Display", "Arial Black", sans-serif'; g.globalAlpha=fade*(1-u)*0.55; g.fillStyle='#ff3040'; g.fillText(p.lost.n,cx,cy+u*50); }
  g.globalAlpha=fade;
  // Trefferringe
  for(const r of p.rings){ const u=r.t/0.4, x=r.x!==undefined?r.x:laneX(p,r.l);
    g.globalAlpha=fade*(1-u); g.lineWidth=3*(1-u)+1;
    g.strokeStyle=r.q===100?'#ffffff':LANE_HEX[r.l]; g.beginPath(); g.arc(x,hy,rr*(1+u*1.6),0,Math.PI*2); g.stroke();
    if(r.q===100){ g.strokeStyle=LANE_HEX[r.l]; g.beginPath(); g.arc(x,hy,rr*(1.2+u*2.8),0,Math.PI*2); g.stroke(); } }
  g.globalAlpha=1;
  // Ziele auf der Linie
  g.globalAlpha=fade;
  // Raketen mit Schubflamme und leuchtendem Abgasstrahl
  for(let i=p.head;i<p.notes.length;i++){
    const n=p.notes[i]; if(n.t>t+G.approach) break; if(n.st) continue;
    const uu=(n.t-t)/G.approach; let ra=1;
    const y=hy+uu*(sy-hy); const x=noteX(p,n,uu)+(n.sp?Math.sin(t*12)*8:0);
    const shx=Math.max(-1.6,Math.min(1.6,(noteX(p,n,uu+0.05)-noteX(p,n,uu))/(0.05*(sy-hy))));
    if(G.mods.hidden) ra=Math.max(0,Math.min(1,(uu-0.18)/0.24)); if(G.mods.sudden) ra=Math.min(ra,Math.max(0,Math.min(1,(0.62-uu)/0.1)));
    if(ra<=0.01) continue; g.globalAlpha=fade*ra;
    const hex=n.sp?'#ff58dc':LANE_HEX[n.lane], seed=(n.t*7.13)%1;
    // Lichtschleier: langer, weicher, rauchiger Leuchtstreifen unter dem Buchstaben
    const L=Math.min(H*0.62, sy-y+H*0.12), vw=rr*(5.2+0.2*Math.sin(t*1.5+seed*6));
    g.globalCompositeOperation='lighter';
    g.save(); g.translate(x,y-rr*0.6); g.transform(1,0,shx+Math.sin(t*1.1+seed*9)*0.02,1,0,0);
    g.drawImage(veilSpr(hex,(seed*3)|0),-vw,0,vw*2,L);
    g.restore();
    { const gs=rr*(1.9+Math.sin(t*5+seed*20)*0.06); g.drawImage(SPRITES[n.sp?C.magenta:LANE_COL[n.lane]],x-gs,y-gs,gs*2,gs*2); }
    if(n.gold&&!n.sp){ for(let q=0;q<8;q++){ const a=t*2.4+q*Math.PI/4, s2=rr*(q%2?0.45:0.75)*(0.8+0.3*Math.sin(t*12+q)); g.drawImage(SPRITES[q%2?C.white:C.gold],x+Math.cos(a)*rr*1.9-s2,y+Math.sin(a)*rr*1.9-s2,s2*2,s2*2); } }
    g.globalCompositeOperation='source-over';
    veilHead(x,y,rr,n.lane,hex); g.globalAlpha=fade*ra;
    if(n.gold&&!n.sp){ // Goldrakete: Farbe bleibt die der Taste, dazu ein funkelnder Goldkranz
      g.save(); g.lineWidth=2.4; g.strokeStyle='#fff3c4'; g.shadowColor='#ffcf40'; g.shadowBlur=10; g.setLineDash([rr*0.5,rr*0.32]); g.lineDashOffset=-t*30;
      g.beginPath(); g.arc(x,y,rr*1.55,0,Math.PI*2); g.stroke(); g.restore(); }
    if(n.sp){ g.strokeStyle='#fff'; g.lineWidth=2; g.beginPath(); g.arc(x,y,rr+4+Math.sin(t*20)*2,0,Math.PI*2); g.stroke(); }
  }
  // Urteile
  g.textAlign='center'; g.textBaseline='middle';
  for(const j of p.judg){ const a=1-j.t/0.7, jy=hy+rr*2.6+j.t*24+(Math.round((j.x-p.fx)/lw-0.5)%2?24:0), pop=j.t<0.09?1.4-j.t/0.09*0.4:1; g.globalAlpha=a*fade;
    neonTextCached(j.txt,j.x,jy,'400 '+Math.round(Math.max(11,Math.min(13+Math.min(lw*0.1,7),lw*0.2)))+'px "Playfair Display", "Arial Black", sans-serif',j.col,12,pop);
    if(j.sub){ g.font='700 11px "Josefin Sans", system-ui, sans-serif'; g.fillStyle=j.sub==='FRÜH'?'#8cc4ff':'#ffb07a'; g.fillText(j.sub,j.x,jy+17); } }
  // Tasten-Hinweise am Liedanfang
  const hintEnd=(G.cdT1||0)+2.5;
  if(t<hintEnd && !G.demo){ const ha=Math.min(1,(hintEnd-t)/1)*fade;
    const keys=isTouch?['tippen','tippen','tippen','tippen']:G.players.length>1?(p.i===0?['A','S','W','D']:['←','↓','↑','→']):['← / A','↓ / S','↑ / W','→ / D'];
    g.font='700 12px "Josefin Sans", system-ui, sans-serif'; g.textAlign='center'; g.textBaseline='middle';
    for(let l=0;l<4;l++){ const x=laneX(p,l); g.globalAlpha=ha*0.85; g.fillStyle='rgba(4,8,24,0.75)'; const tw=g.measureText(keys[l]).width+12; g.fillRect(x-tw/2,hy-rr*2.2-9,tw,18); g.globalAlpha=ha; g.fillStyle=LANE_HEX[l]; g.fillText(keys[l],x,hy-rr*2.2); } }
  // Timing-Anzeige: Striche zeigen, wie früh (links) oder spät (rechts) die letzten Treffer waren
  if(p.errs.length){ const mw2=Math.min(p.fw*0.5,220), mx=p.fx+p.fw/2, my2=hy+rr*2.6+66;
    g.globalAlpha=fade*0.55; g.fillStyle='rgba(4,8,24,0.6)'; g.fillRect(mx-mw2/2,my2-7,mw2,14);
    g.fillStyle='rgba(255,224,102,0.18)'; g.fillRect(mx-mw2/2*W_PERF/WIN,my2-7,mw2*W_PERF/WIN,14);
    g.fillStyle='rgba(255,255,255,0.6)'; g.fillRect(mx-0.5,my2-9,1,18);
    let sum=0;
    for(const e of p.errs){ sum+=e.d; const ex=mx+Math.max(-1,Math.min(1,e.d/WIN))*mw2/2; g.globalAlpha=fade*Math.max(0,1-e.age/4);
      g.fillStyle=e.q===100?'#ffe066':e.q===70?'#6ff3ff':'#8dff9e'; g.fillRect(ex-1,my2-6,2,12); }
    const av=sum/p.errs.length, ax=mx+Math.max(-1,Math.min(1,av/WIN))*mw2/2;
    g.globalAlpha=fade*0.9; g.fillStyle='#ffffff'; g.beginPath(); g.moveTo(ax,my2-8); g.lineTo(ax-5,my2-14); g.lineTo(ax+5,my2-14); g.closePath(); g.fill();
    g.globalAlpha=fade*0.5; g.font='600 9px "Josefin Sans", system-ui, sans-serif'; g.fillStyle='#c8f5ff'; g.textAlign='left'; g.fillText('FRÜH',mx-mw2/2,my2+15); g.textAlign='right'; g.fillText('SPÄT',mx+mw2/2,my2+15); g.textAlign='center'; }
  g.globalAlpha=1;
  // Lunte & Bloom als Neon-Röhren
  const mh=H*0.38, my=hy+28, mw=8;
  const meter=(x,val,c0,c1,label,glow)=>{
    g.fillStyle='rgba(4,6,18,0.7)'; g.fillRect(x,my,mw,mh);
    g.beginPath(); g.rect(x-1.5,my-1.5,mw+3,mh+3); neonStroke(NEON_CYAN,1.5,8);
    const hh=mh*Math.max(0,Math.min(1,val)); const gr=g.createLinearGradient(0,my+mh,0,my); gr.addColorStop(0,c0); gr.addColorStop(1,c1);
    g.shadowColor=c1; g.shadowBlur=12; g.fillStyle=gr; g.fillRect(x,my+mh-hh,mw,hh); g.shadowBlur=0;
    if(glow){ g.globalCompositeOperation='lighter'; g.drawImage(SPRITES[C.gold],x-14,my+mh-hh-20,mw+28,40); g.globalCompositeOperation='source-over'; }
    g.fillStyle='rgba(200,245,255,0.85)'; g.font='600 10px "Josefin Sans", system-ui, sans-serif'; g.fillText(label,x+mw/2,my+mh+14);
  };
  g.globalAlpha=fade;
  const mL=(G.players.length===1&&W>620)?Math.max(6,lx0-36):p.fx-28, mR=(G.players.length===1&&W>620)?Math.min(W-14,lx1+28):p.fx+p.fw+20;
  meter(mL,p.health,p.health<0.25?'#ff2030':'#ff7a1a',p.health<0.25?'#ff8a2a':'#ffe066','LUNTE',p.health<0.25&&Math.sin(t*16)>0);
  meter(mR,p.bloom,p.bloomOn?'#ff2fb3':'#8a3cff',p.bloomOn?'#3ff4ff':'#ff2fb3','BLOOM',ready);
  g.globalAlpha=1;
  if(G.players.length>1) drawPanels(p,p.fx,p.fw,t,true);
  if(ready){ g.font='600 13px "Josefin Sans", system-ui, sans-serif'; g.fillStyle=Math.sin(t*8)>0?'#ffe066':'#ffffff'; g.fillText(G.players.length>1?(p.i===0?'BLOOM: LEERTASTE':'BLOOM: ENTER'):'BLOOM BEREIT · LEERTASTE / TRIGGER',p.fx+p.fw/2,hy-18); }
  g.restore();
}
// Neon-Tafeln: links Multiplikator mit Kombo-Balken, rechts Punktestand
function drawPanels(p,x0,wid,t,compact){
  const m=multOf(p), segs=4;
  const prog = m/(p.bloomOn?2:1)>=4 ? 1 : (p.combo%10)/10;
  const ph=compact?34:44, top=compact?hitY()-H*0.24:16;
  const lw=compact?wid*0.55:Math.min(360,W*0.42), rw=compact?wid*0.42:Math.min(380,W*0.42);
  const lx=compact?x0:16, rx=compact?x0+wid-rw:W-16-rw;
  const pc = p.bloomOn?'hsl('+((t*240)%360)+',100%,62%)':NEON_CYAN;
  // links
  panelPath(lx,top,lw,ph,ph*0.5); g.fillStyle='rgba(4,10,24,0.55)'; g.fill(); neonStroke(pc,2,14);
  const bx=lx+ph*0.55, bw=lw-ph*0.55-(compact?50:70), bh=ph*0.34, by=top+(ph-bh)/2;
  for(let s=0;s<segs;s++){
    const sx=bx+s*(bw/segs)+2, sw=bw/segs-4; const fill=Math.max(0,Math.min(1,prog*segs-s));
    g.fillStyle='rgba(120,140,200,0.18)'; g.fillRect(sx,by,sw,bh);
    if(fill>0){ const gr=g.createLinearGradient(sx,0,sx+sw,0); gr.addColorStop(0,'#c7f6ff'); gr.addColorStop(1,'#ff7ad9'); g.fillStyle=gr; g.shadowColor='#ff7ad9'; g.shadowBlur=10; g.fillRect(sx,by,sw*fill,bh); g.shadowBlur=0; }
  }
  g.textAlign='right'; g.textBaseline='middle';
  { const mp=1+0.45*p.mPulse; g.save(); g.translate(lx+lw-ph*0.45, top+ph/2+1); g.scale(mp,mp);
    neonText('x'+m, 0, 0, '800 '+Math.round(ph*0.62)+'px "Playfair Display", Georgia, serif', p.mPulse>0.3?'#ffffff':(p.bloomOn?'#ffe066':'#ff7ad9'), 14); g.restore(); }
  // rechts
  panelPath(rx,top,rw,ph,ph*0.5); g.fillStyle='rgba(4,10,24,0.55)'; g.fill(); neonStroke(pc,2,14);
  neonText(Math.round(p.scoreShown).toLocaleString('de-DE'), rx+rw-ph*0.6, top+ph/2+1, '800 '+Math.round(ph*0.6)+'px "Playfair Display", Georgia, serif', '#ff7ad9', 14);
  if(compact){ g.textAlign='left'; g.font='600 11px "Josefin Sans", system-ui, sans-serif'; g.fillStyle='rgba(200,245,255,0.8)'; g.fillText('SPIELER '+(p.i+1)+(p.failed?' · AUS':'')+(p.combo>=5?' · '+p.combo+' Kombo':''),lx+4,top-10); }
  return {top,ph};
}
function drawHud(t){
  const s=G.song;
  let y0=16;
  if(G.players.length===1){ const r=drawPanels(G.players[0],0,W,t,false); y0=r.top+r.ph+16; }
  g.textAlign='left'; g.textBaseline='top';
  const x=16;
  g.font='400 13px "Playfair Display", "Arial Black", sans-serif'; g.fillStyle='rgba(225,250,255,0.9)'; g.fillText(s.title, x, G.players.length>1?16:y0);
  g.font='500 12px "Josefin Sans", system-ui, sans-serif'; g.fillStyle='rgba(190,225,255,0.7)';
  let info=s.composer+' · '+DIFF_NAMES[G.diff];
  if(G.mode==='endless') info+=' · Runde '+G.lap+' · '+Math.round(G.bpm)+' BPM';
  if(G.mode==='practice') info+=' · Training '+Math.round(G.tempo*100)+'%';
  if(G.mods && modsLabel(G.mods)) info+=' · '+modsLabel(G.mods);
  const iy=(G.players.length>1?16:y0)+19; g.fillText(info,x,iy);
  if(G.dur<Infinity){ const u=Math.max(0,Math.min(1,t/(G.dur-1.5))); const py=iy+20; g.fillStyle='rgba(120,200,255,0.2)'; g.fillRect(x,py,150,3); g.fillStyle=NEON_CYAN; g.shadowColor=NEON_CYAN; g.shadowBlur=8; g.fillRect(x,py,150*u,3); g.shadowBlur=0; }
}
