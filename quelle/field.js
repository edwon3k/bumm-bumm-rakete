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
function neonTextCached(txt,x,y,font,col,glow){
  const k='t|'+txt+'|'+font+'|'+col+'|'+glow+'|'+DPR;
  const c=glowSprite(k,1,1,()=>{});
  if(c.width===1){ // erstmals: messen und zeichnen
    const m=document.createElement('canvas').getContext('2d'); m.font=font; const tw=m.measureText(txt).width;
    const fs=parseFloat((font.match(/(\d+(?:\.\d+)?)px/)||[0,20])[1]); const pad=glow*2+4;
    c.width=Math.ceil((tw+pad*2)*DPR); c.height=Math.ceil((fs*1.4+pad*2)*DPR); c._w=tw+pad*2; c._h=fs*1.4+pad*2;
    const x2=c.getContext('2d'); x2.scale(DPR,DPR); x2.font=font; x2.textAlign='center'; x2.textBaseline='middle';
    x2.shadowColor=col; x2.shadowBlur=glow*DPR; x2.fillStyle=col; x2.fillText(txt,c._w/2,c._h/2); x2.shadowBlur=0; x2.fillStyle='rgba(255,255,255,0.85)'; x2.fillText(txt,c._w/2,c._h/2);
  }
  g.drawImage(c,x-c._w/2,y-c._h/2,c._w,c._h);
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
  else { g.fillStyle=col; g.font='700 '+Math.round(r*1.25)+'px "Rubik", system-ui, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(LANE_BTN[lane],x,y+r*0.05); }
  g.globalAlpha=1;
}
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
  g.globalAlpha=fade; g.beginPath(); g.moveTo(lx0,hy); g.lineTo(lx1,hy); neonStroke(lc, ready||p.bloomOn?6:4, 22);
  if(ready||p.bloomOn){ g.globalCompositeOperation='lighter'; for(let k=0;k<8;k++){ const x=lx0+Math.random()*(lx1-lx0); g.drawImage(SPRITES[ready?C.gold:pick([C.magenta,C.cyan,C.white])],x-9,hy-9,18,18);} g.globalCompositeOperation='source-over'; }
  // Ziele auf der Linie
  for(let l=0;l<4;l++){
    const x=laneX(p,l), f=p.flash[l];
    if(f>0){ g.globalCompositeOperation='lighter'; const s=rr*(1.5+2.5*f); g.globalAlpha=fade*f; g.drawImage(SPRITES[LANE_COL[l]],x-s,hy-s,s*2,s*2); g.globalCompositeOperation='source-over'; }
    laneBadge(x,hy,rr*0.9,l,fade*(0.35+0.65*f),f>0);
  }
  g.globalAlpha=fade;
  // Raketen mit Schubflamme und leuchtendem Abgasstrahl
  for(let i=p.head;i<p.notes.length;i++){
    const n=p.notes[i]; if(n.t>t+G.approach) break; if(n.st) continue;
    const y=hy+(n.t-t)/G.approach*(sy-hy); const x=laneX(p,n.lane)+(n.sp?Math.sin(t*12)*8:0);
    const col=n.sp?COLORS[pick([C.magenta,C.cyan,C.gold,C.lime])]:LANE_HEX[n.lane];
    const L=Math.min(H*0.24, sy-y+60)*(0.92+Math.random()*0.16);
    g.globalCompositeOperation='lighter';
    const tg=g.createLinearGradient(0,y,0,y+L); tg.addColorStop(0,col); tg.addColorStop(0.35,col+'99'); tg.addColorStop(1,col+'00');
    g.strokeStyle=tg; g.lineWidth=rr*0.75; g.lineCap='round'; g.beginPath(); g.moveTo(x,y+rr*0.6); g.lineTo(x,y+L); g.stroke();
    const cg=g.createLinearGradient(0,y,0,y+L*0.5); cg.addColorStop(0,'rgba(255,255,255,0.95)'); cg.addColorStop(1,'rgba(255,255,255,0)');
    g.strokeStyle=cg; g.lineWidth=rr*0.22; g.beginPath(); g.moveTo(x,y+rr*0.6); g.lineTo(x,y+L*0.5); g.stroke();
    const fs=rr*(1.2+Math.random()*0.6); g.drawImage(SPRITES[C.white],x-fs,y+rr*0.8-fs,fs*2,fs*2);
    g.drawImage(SPRITES[n.sp?C.magenta:LANE_COL[n.lane]],x-rr*2.2,y-rr*2.2,rr*4.4,rr*4.4);
    g.globalCompositeOperation='source-over'; g.lineCap='butt';
    laneBadge(x,y,rr,n.lane,fade,true);
    if(n.sp){ g.strokeStyle='#fff'; g.lineWidth=2; g.beginPath(); g.arc(x,y,rr+4+Math.sin(t*20)*2,0,Math.PI*2); g.stroke(); }
  }
  // Urteile
  g.textAlign='center'; g.textBaseline='middle';
  for(const j of p.judg){ const a=1-j.t/0.7; g.globalAlpha=a*fade; neonTextCached(j.txt,j.x,hy+rr*2.6+j.t*24,'400 '+Math.round(15+Math.min(lw*0.14,9))+'px "Bungee", "Arial Black", sans-serif',j.col,12); }
  g.globalAlpha=1;
  // Lunte & Bloom als Neon-Röhren
  const mh=H*0.38, my=hy+28, mw=8;
  const meter=(x,val,c0,c1,label,glow)=>{
    g.fillStyle='rgba(4,6,18,0.7)'; g.fillRect(x,my,mw,mh);
    g.beginPath(); g.rect(x-1.5,my-1.5,mw+3,mh+3); neonStroke(NEON_CYAN,1.5,8);
    const hh=mh*Math.max(0,Math.min(1,val)); const gr=g.createLinearGradient(0,my+mh,0,my); gr.addColorStop(0,c0); gr.addColorStop(1,c1);
    g.shadowColor=c1; g.shadowBlur=12; g.fillStyle=gr; g.fillRect(x,my+mh-hh,mw,hh); g.shadowBlur=0;
    if(glow){ g.globalCompositeOperation='lighter'; g.drawImage(SPRITES[C.gold],x-14,my+mh-hh-20,mw+28,40); g.globalCompositeOperation='source-over'; }
    g.fillStyle='rgba(200,245,255,0.85)'; g.font='600 10px "Rubik", system-ui, sans-serif'; g.fillText(label,x+mw/2,my+mh+14);
  };
  g.globalAlpha=fade;
  meter(p.fx-28,p.health,p.health<0.25?'#ff2030':'#ff7a1a',p.health<0.25?'#ff8a2a':'#ffe066','LUNTE',p.health<0.25&&Math.sin(t*16)>0);
  meter(p.fx+p.fw+20,p.bloom,p.bloomOn?'#ff2fb3':'#8a3cff',p.bloomOn?'#3ff4ff':'#ff2fb3','BLOOM',ready);
  g.globalAlpha=1;
  if(G.players.length>1) drawPanels(p,p.fx,p.fw,t,true);
  if(ready){ g.font='600 13px "Rubik", system-ui, sans-serif'; g.fillStyle=Math.sin(t*8)>0?'#ffe066':'#ffffff'; g.fillText(G.players.length>1?(p.i===0?'BLOOM: LEERTASTE':'BLOOM: ENTER'):'BLOOM BEREIT · LEERTASTE / TRIGGER',p.fx+p.fw/2,hy-18); }
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
  neonText('x'+m, lx+lw-ph*0.45, top+ph/2+1, '700 '+Math.round(ph*0.62)+'px "Rubik", system-ui, sans-serif', p.bloomOn?'#ffe066':'#ff7ad9', 14);
  // rechts
  panelPath(rx,top,rw,ph,ph*0.5); g.fillStyle='rgba(4,10,24,0.55)'; g.fill(); neonStroke(pc,2,14);
  neonText(Math.round(p.scoreShown).toLocaleString('de-DE'), rx+rw-ph*0.6, top+ph/2+1, '700 '+Math.round(ph*0.6)+'px "Rubik", system-ui, sans-serif', '#ff7ad9', 14);
  if(compact){ g.textAlign='left'; g.font='600 11px "Rubik", system-ui, sans-serif'; g.fillStyle='rgba(200,245,255,0.8)'; g.fillText('SPIELER '+(p.i+1)+(p.failed?' · AUS':'')+(p.combo>=5?' · '+p.combo+' Kombo':''),lx+4,top-10); }
  return {top,ph};
}
function drawHud(t){
  const s=G.song;
  let y0=16;
  if(G.players.length===1){ const r=drawPanels(G.players[0],0,W,t,false); y0=r.top+r.ph+16; }
  g.textAlign='left'; g.textBaseline='top';
  const x=16;
  g.font='400 13px "Bungee", "Arial Black", sans-serif'; g.fillStyle='rgba(225,250,255,0.9)'; g.fillText(s.title, x, G.players.length>1?16:y0);
  g.font='500 12px "Rubik", system-ui, sans-serif'; g.fillStyle='rgba(190,225,255,0.7)';
  let info=s.composer+' · '+DIFF_NAMES[G.diff];
  if(G.mode==='endless') info+=' · Runde '+G.lap+' · '+Math.round(G.bpm)+' BPM';
  if(G.mode==='practice') info+=' · Training '+Math.round(G.tempo*100)+'%';
  const iy=(G.players.length>1?16:y0)+19; g.fillText(info,x,iy);
  if(G.players.length===1 && G.players[0].combo>=5){ g.fillStyle='#ff7ad9'; g.fillText(G.players[0].combo+' Kombo',x,iy+17); }
  if(G.dur<Infinity){ const u=Math.max(0,Math.min(1,t/(G.dur-1.5))); const py=iy+(G.players.length===1?38:20); g.fillStyle='rgba(120,200,255,0.2)'; g.fillRect(x,py,150,3); g.fillStyle=NEON_CYAN; g.shadowColor=NEON_CYAN; g.shadowBlur=8; g.fillRect(x,py,150*u,3); g.shadowBlur=0; }
}
