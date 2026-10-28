// ===== Spiel =====
const LANE_COL=[C.blue,C.green,C.yellow,C.red];
const LANE_HEX=['#4f8fff','#3dff94','#ffd54a','#ff4646'];
const LANE_BTN=['X','A','Y','B'];
const LANE_ANG=[Math.PI, Math.PI/2, -Math.PI/2, 0];
const WIN=0.15, W_PERF=0.05, W_GREAT=0.095;
const BLOOM_DUR=10;

// ---------- Speicher ----------
const PERF={low:false,slow:0};
const SETTINGS={music:0.8,sfx:0.8,speed:1,offset:0,glyphStyle:'buttons',quality:'high',musicStyle:'elektro'};
let SAVE={unlocked:[],best:{},endless:{}};
function loadSave(){ try{ const s=JSON.parse(localStorage.getItem('bumm-save')||'null'); if(s){ SAVE=Object.assign(SAVE,s); Object.assign(SETTINGS,s.settings||{}); } }catch(e){} }
function storeSave(){ try{ SAVE.settings=SETTINGS; localStorage.setItem('bumm-save',JSON.stringify(SAVE)); }catch(e){} }
loadSave();

// ---------- Canvas ----------
const cv=document.getElementById('cv'); let g=cv.getContext('2d');
// Hintergrund-Ebene unter dem Grafikkarten-Feuerwerk
const cvb=document.getElementById('cvb'), gb=cvb.getContext('2d');
// Feuerwerk-Ebene (für Glühen und Spiegelung im Wasser)
const fxc=document.createElement('canvas'), fg=fxc.getContext('2d');
const b1=document.createElement('canvas'), b1g=b1.getContext('2d');
const b2=document.createElement('canvas'), b2g=b2.getContext('2d');
const CAM={shake:0,punch:0,z:1,sx:0,sy:0};
const BEAT={p:0,last:-1};
function camCompute(){ CAM.z=1+CAM.punch*0.035; CAM.sx=(Math.random()-0.5)*CAM.shake*12; CAM.sy=(Math.random()-0.5)*CAM.shake*12; }
function camApply(ctx){ const z=CAM.z; ctx.setTransform(DPR*z,0,0,DPR*z,DPR*(W/2*(1-z)+CAM.sx),DPR*(H/2*(1-z)+CAM.sy)); }
let W=0,H=0,DPR=1;
function resize(){
  PERF.low = PERF.low || SETTINGS.quality!=='high';
  DPR=Math.min(window.devicePixelRatio||1, PERF.low?1:2);
  W=window.innerWidth; H=window.innerHeight; cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR);
  cv.style.width=W+'px'; cv.style.height=H+'px'; g.setTransform(DPR,0,0,DPR,0,0);
  cvb.width=cv.width; cvb.height=cv.height; cvb.style.width=W+'px'; cvb.style.height=H+'px';
  fxc.width=cv.width; fxc.height=cv.height; b1.width=Math.ceil(W/4); b1.height=Math.ceil(H/4); b2.width=Math.ceil(W/12); b2.height=Math.ceil(H/12);
  FX.scale=Math.max(0.5,Math.min(1.35,Math.min(W,H*1.3)/800));
  FX.maxParts = PERF.low?2200:4500;
  buildSkyline();
  if(typeof cityResize==='function') cityResize();
  if(typeof gfxResize==='function') gfxResize();
}
window.addEventListener('resize',resize);

// ---------- Hintergrund: Hafenstadt bei Nacht ----------
let SKY={stars:[],far:null,near:null,tw:1600};
function buildSkyline(){
  const tw=1600, hN=Math.round(Math.max(160,H*0.3)), hF=Math.round(hN*0.8);
  SKY.tw=tw;
  SKY.stars=[]; for(let i=0;i<160;i++) SKY.stars.push({x:Math.random(),y:Math.random()*0.75,s:Math.random()*1.4+0.3,p:Math.random()*6});
  const mk=(h,dark,lit,seed,big)=>{
    const c=document.createElement('canvas'); c.width=tw; c.height=h; const x=c.getContext('2d');
    let r=seed; const rnd=()=>{ r=(r*16807)%2147483647; return r/2147483647; };
    x.fillStyle=dark;
    let px=0;
    while(px<tw){
      const bw=24+rnd()*70, bh=h*(0.18+rnd()*0.55)*(big?1:0.85);
      x.fillRect(px,h-bh,bw,bh);
      if(rnd()<0.25){ x.fillRect(px+bw*0.45,h-bh-14-rnd()*20,2,20); }
      if(lit){ for(let wy=h-bh+6; wy<h-6; wy+=8) for(let wx=px+4; wx<px+bw-4; wx+=7) if(rnd()<0.22){ x.fillStyle=rnd()<0.8?'rgba(255,214,140,0.75)':'rgba(170,210,255,0.7)'; x.fillRect(wx,wy,3,4); x.fillStyle=dark; } }
      px+=bw+rnd()*6;
    }
    if(big){
      // Fernsehturm
      const tx=tw*0.3; x.fillStyle=dark; x.fillRect(tx-4,h*0.05,8,h); x.beginPath(); x.ellipse(tx,h*0.2,18,9,0,0,Math.PI*2); x.fill(); x.fillRect(tx-1,0,2,h*0.08);
      x.fillStyle='rgba(255,60,60,0.9)'; x.fillRect(tx-1.5,0,3,3);
      // Konzerthaus mit Wellendach
      x.fillStyle=dark; const ex=tw*0.68, ew=190; x.fillRect(ex,h*0.55,ew,h*0.45);
      x.beginPath(); x.moveTo(ex,h*0.55); for(let i=0;i<=ew;i+=4){ x.lineTo(ex+i,h*0.42-Math.abs(Math.sin(i/ew*Math.PI*2.5))*h*0.1); } x.lineTo(ex+ew,h*0.55); x.fill();
      for(let wy=h*0.47; wy<h*0.6; wy+=6) for(let wx=ex+6; wx<ex+ew-6; wx+=9){ if(rnd()<0.5){ x.fillStyle='rgba(190,220,255,0.5)'; x.fillRect(wx,wy,5,3); } }
      // Hafenkräne
      x.strokeStyle=dark; x.lineWidth=3;
      [tw*0.08,tw*0.88].forEach(cx=>{ x.beginPath(); x.moveTo(cx,h); x.lineTo(cx,h*0.25); x.lineTo(cx+110,h*0.25); x.moveTo(cx-30,h*0.25); x.lineTo(cx,h*0.25); x.moveTo(cx,h*0.15); x.lineTo(cx+110,h*0.25); x.moveTo(cx,h*0.15); x.lineTo(cx-30,h*0.25); x.stroke(); x.fillStyle='rgba(255,60,60,0.9)'; x.fillRect(cx-1,h*0.15-3,3,3); });
    }
    return c;
  };
  SKY.far=mk(hF,'#141a3c',true,7,false);
  SKY.near=mk(hN,'#080b1c',true,13,true);
}
let camT=0;
function drawBackground(t, bloomLvl){
  const wy=H*0.8;
  const sky=g.createLinearGradient(0,0,0,wy);
  sky.addColorStop(0,'#03040f'); sky.addColorStop(0.55,'#0b0f2e'); sky.addColorStop(1,'#25184a');
  g.fillStyle=sky; g.fillRect(0,0,W,wy);
  // Sterne
  for(const s of SKY.stars){ const a=0.35+0.35*Math.sin(t*1.3+s.p); g.fillStyle='rgba(220,230,255,'+a.toFixed(3)+')'; g.fillRect(s.x*W,s.y*wy,s.s,s.s); }
  // Mond
  g.globalCompositeOperation='lighter';
  g.globalAlpha=0.5; g.drawImage(SPRITES[C.silver],W*0.82-70,H*0.1-70,140,140); g.globalAlpha=1;
  g.globalCompositeOperation='source-over';
  g.fillStyle='#e8ecff'; g.beginPath(); g.arc(W*0.82,H*0.1,16,0,Math.PI*2); g.fill();
  g.fillStyle='#0b0f2e'; g.beginPath(); g.arc(W*0.82+7,H*0.1-4,14,0,Math.PI*2); g.fill();
  // Bloom-Polarlicht
  if(bloomLvl>0.01){
    g.globalCompositeOperation='lighter';
    for(let k=0;k<3;k++){
      g.beginPath(); const y0=H*(0.12+k*0.07);
      g.moveTo(0,y0);
      for(let x=0;x<=W;x+=20){ g.lineTo(x, y0+Math.sin(x*0.006+t*(0.8+k*0.3)+k)*H*0.04); }
      g.lineTo(W,y0+H*0.12); g.lineTo(0,y0+H*0.12); g.closePath();
      const gr=g.createLinearGradient(0,y0-20,0,y0+H*0.12); const col=['#3dff94','#a764ff','#4cf2ff'][k];
      gr.addColorStop(0,col+'00'); gr.addColorStop(0.3,col+hex2(0.18*bloomLvl)); gr.addColorStop(1,col+'00'); g.fillStyle=gr; g.fill();
    }
    g.globalCompositeOperation='source-over';
  }
  // Skyline (Kamera fährt langsam an der Hafenkante entlang)
  const tw=SKY.tw;
  const drawLayer=(img,speed,y)=>{ let off=-((t*speed)%tw); for(let x=off;x<W;x+=tw) g.drawImage(img,x,y); };
  drawLayer(SKY.far,6,wy-SKY.far.height+4);
  drawLayer(SKY.near,14,wy-SKY.near.height+2);
  // Wasser
  const wg=g.createLinearGradient(0,wy,0,H); wg.addColorStop(0,'#0c0f2c'); wg.addColorStop(1,'#020309');
  g.fillStyle=wg; g.fillRect(0,wy,W,H-wy);
  // Spiegelung
  const nh=SKY.near.height, refH=Math.min(H-wy, nh*0.8);
  g.globalAlpha=0.28;
  let off=-((t*14)%tw);
  for(let y=0;y<refH;y+=3){
    const srcY=nh-1-y/0.8; if(srcY<0) break;
    const dx=Math.sin(t*1.7+y*0.18)*(2+y*0.04);
    for(let x=off;x<W;x+=tw) g.drawImage(SKY.near,0,srcY,tw,2,x+dx,wy+y,tw,3);
  }
  g.globalAlpha=1;
  // Kaikante
  g.fillStyle='#05060f'; g.fillRect(0,wy-2,W,4);
}

function drawAurora(t,bloomLvl){
  g.globalCompositeOperation='lighter';
  for(let k=0;k<3;k++){
    g.beginPath(); const y0=H*(0.04+k*0.06);
    g.moveTo(0,y0); for(let x=0;x<=W;x+=20){ g.lineTo(x, y0+Math.sin(x*0.006+t*(0.8+k*0.3)+k)*H*0.04); }
    g.lineTo(W,y0+H*0.12); g.lineTo(0,y0+H*0.12); g.closePath();
    const gr=g.createLinearGradient(0,y0-20,0,y0+H*0.12); const col=['#3dff94','#ff2fb3','#4cf2ff'][k];
    gr.addColorStop(0,col+'00'); gr.addColorStop(0.3,col+hex2(0.16*bloomLvl)); gr.addColorStop(1,col+'00'); g.fillStyle=gr; g.fill();
  }
  g.globalCompositeOperation='source-over';
}
// ---------- Glyphen ----------
function drawGlyph(x,y,r,lane,col){
  if(SETTINGS.glyph==='buttons'){
    g.fillStyle=col; g.font='700 '+Math.round(r*1.15)+'px "Bungee", "Arial Black", sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(LANE_BTN[lane],x,y+r*0.06); return;
  }
  g.save(); g.translate(x,y); g.rotate(LANE_ANG[lane]); g.scale(r,r);
  g.beginPath(); g.moveTo(-0.5,-0.17); g.lineTo(0.02,-0.17); g.lineTo(0.02,-0.45); g.lineTo(0.55,0); g.lineTo(0.02,0.45); g.lineTo(0.02,0.17); g.lineTo(-0.5,0.17); g.closePath();
  g.fillStyle=col; g.fill(); g.restore();
}

// ---------- Spielzustand ----------
let G=null; let paused=false;
const freeRockets=[];
function newMusicBus(){
  if(!A.ctx) return;
  const old=[A.music,A.lead,A.drums,A.duck].filter(Boolean); const t=A.ctx.currentTime;
  old.forEach(n=>{ n.gain.cancelScheduledValues(t); n.gain.setTargetAtTime(0,t,0.05); });
  setTimeout(()=>old.forEach(n=>{ try{n.disconnect();}catch(e){} }),600);
  if(A.mf){ const om=A.mf; setTimeout(()=>{ try{om.disconnect();}catch(e){} },600); }
  A.mf=A.ctx.createBiquadFilter(); A.mf.type='lowpass'; A.mf.frequency.value=20000; A.mf.Q.value=0.9; A.mf.connect(A.dc||A.shelf); A.mfOn=false;
  A.music=A.ctx.createGain(); A.music.connect(A.mf);
  A.lead=A.ctx.createGain(); A.lead.connect(A.music);
  A.drums=A.ctx.createGain(); A.drums.connect(A.music);
  A.duck=A.ctx.createGain(); A.duck.connect(A.music);
  sendTo(A.music,0.12); sendTo(A.lead,0.22); sendTo(A.drums,0.13);
  setBloomAudio(false);
}
function audioNow(perf){
  const ctx=A.ctx; let t=ctx.currentTime;
  if(ctx.getOutputTimestamp){ const ts=ctx.getOutputTimestamp(); if(ts && ts.contextTime>0 && ts.performanceTime>0){ const est=ts.contextTime+((perf===undefined?performance.now():perf)-ts.performanceTime)/1000; if(est<=t && est>t-0.5) return est; } }
  return t-(ctx.outputLatency||ctx.baseLatency||0);
}
function songTime(perf){ return audioNow(perf)-G.startAt-SETTINGS.offset/1000; }

function approachTime(diff){ return [2.1,1.7,1.38][diff]/SETTINGS.speed; }

function newPlayer(i, chart){
  const goldOn=G.mode!=='demo'; const notes=chart.map((n,k)=>({t:n.t,lane:n.lane,st:0,sp:false,gold:goldOn&&k%29===14})); placeNotes(notes,0); return {i, notes, goldTotal:goldOn?chart.filter((n,k)=>k%29===14).length:0, goldHit:0, head:0, score:0, combo:0, maxCombo:0, health:0.6, bloom:0, bloomOn:false,
    hits:0, perfect:0, great:0, good:0, miss:0, misfire:0, flash:[0,0,0,0], judg:[], failed:false, specialDone:false, unlock:null, scoreShown:0, shake:0,
    rings:[], hitPulse:[0,0,0,0], cPulse:0, mPulse:0, lastM:1, lost:null, errs:[], errAll:[]};
}
function startGame(opts){
  // opts: {mode, songIdx, diff, tempo}
  audioInit(); newMusicBus(); setLeadOk(true);
  const song=SONGS[opts.songIdx]; const tempo=opts.tempo||1;
  A.music.gain.value=({toccata:1.55,nachtmusik:1.3,freude:1.1,blumen:1.1})[song.id]||1;
  const mode=opts.mode;
  let ev, cands, dur, marks=[];
  G={mode, song, songIdx:opts.songIdx, diff:opts.diff, tempo, approach:approachTime(opts.diff)*((opts.mods&&opts.mods.turbo)?0.72:1), mods:Object.assign({},opts.mods||{}), daily:!!opts.daily, evIdx:0, ended:false, lap:0, players:[], demo:mode==='demo', online:!!opts.online};
  let chart=null;
  if(song.custom){
    ev=[]; dur=song.buffer.duration/tempo+1.5;
    chart=song.charts[opts.diff].map(n=>({t:n.t/tempo,lane:n.lane})).filter(n=>n.t>=Math.max(0.3,G.approach-3.0));
    G.finaleT=Math.max(5,song.buffer.duration/tempo-4); G.custom=true;
  } else if(mode==='endless'){
    const s0=makeSection(song,'intro',0,song.bpm); const s1=makeSection(song,'lap',s0.end,song.bpm); const s2=makeSection(song,'fill',s1.end,song.bpm);
    ev=[...s0.ev,...s1.ev,...s2.ev]; cands=[...s0.cands,...s1.cands,...s2.cands]; dur=Infinity; G.nextLapT=s2.end; G.lap=1; G.bpm=song.bpm;
  } else {
    const b=buildArcade(song,tempo); ev=b.ev; cands=b.cands; dur=b.dur; marks=b.marks;
  }
  G.ev=ev; G.dur=dur; G.marks=marks;
  if(!chart) chart=makeChart(cands, opts.diff, G.approach+0.2);
  if(G.mods.mirror) chart=chart.map(n=>Object.assign({},n,{lane:3-n.lane}));
  G.total=chart.length;
  const n = mode==='versus'?2:(mode==='demo'?0:1);
  for(let i=0;i<n;i++) G.players.push(newPlayer(i,chart));
  if(mode==='demo') G.demoNotes=chart.map(c=>({t:c.t,lane:c.lane,done:false}));
  G.specialAt = Math.floor(chart.length*0.45);
  G.startAt=A.ctx.currentTime+(mode==='demo'?0.35:3.2);
  G.beatLen=60/(song.bpm*tempo); G.lastBeat=-1;
  // Vorschau in der Liedauswahl: mitten im Lied einsteigen, leise einblenden, nach ~22 s ausblenden
  let pOff=0;
  if(opts.preview){
    G.preview=true; const mA=marks.find(m=>m.kind==='A');
    pOff = song.custom ? song.buffer.duration*0.3 : (mA?mA.t:0);
    G.startAt=A.ctx.currentTime+0.12-pOff; G.dur=pOff+23;
    for(const d of G.demoNotes) if(d.t<pOff+0.6) d.done=true;
    const mg=A.music.gain, v=mg.value, now=A.ctx.currentTime; mg.setValueAtTime(0,now); mg.linearRampToValueAtTime(v,now+1.2);
    G.ev.push({t:pOff+20.5,f:w=>{ mg.cancelScheduledValues(w); mg.setTargetAtTime(0,w,0.7); }}); G.ev.sort((a,b)=>a.t-b.t);
  }
  // Countdown auf den Schlag vor der ersten Rakete
  if(n>0 && chart.length && mode!=='demo'){
    const T1=chart[0].t, b=G.beatLen*(G.beatLen<0.42?2:1);
    G.cd=[3,2,1].map(k=>T1-k*b).filter(x=>x>-2.6); G.cdT1=T1;
    for(const ct of G.cd) G.ev.push({t:ct+SETTINGS.offset/1000,f:w=>SFX.tick(w,false)});
    G.ev.push({t:T1+SETTINGS.offset/1000,f:w=>SFX.tick(w,true)}); G.ev.sort((a,b)=>a.t-b.t);
  }
  if(song.custom){ const src=A.ctx.createBufferSource(); src.buffer=song.buffer; src.playbackRate.value=tempo; src.connect(A.music); if(opts.preview) src.start(A.ctx.currentTime+0.12,pOff*tempo); else src.start(G.startAt); G.src=src; }
  const fin=marks.find(m=>m.kind==='outro'); if(fin && mode!=='demo'){ G.finaleT=fin.t; G.dur+=3.5; }
  paused=false;
  if(!opts.preview) showScreen(mode==='demo'?'vis':null);
  layoutFields();
}
function layoutFields(){
  if(!G) return;
  const ps=G.players;
  if(ps.length===1){ const fw=Math.min(W-96,520); ps[0].fx=(W-fw)/2; ps[0].fw=fw; }
  else if(ps.length===2){ for(let i=0;i<2;i++){ const fw=Math.min(W/2-80,430); ps[i].fx=W/4*(1+2*i)-fw/2; ps[i].fw=fw; } }
}
window.addEventListener('resize',layoutFields);
function scheduleAudio(){
  if(!G||!A.ctx) return;
  const lim=A.ctx.currentTime+0.18;
  while(G.evIdx<G.ev.length && G.startAt+G.ev[G.evIdx].t<lim){
    const e=G.ev[G.evIdx++]; const when=G.startAt+e.t;
    if(when>=A.ctx.currentTime-0.03){ try{ e.f(Math.max(when,A.ctx.currentTime)); }catch(err){ console.error(err); } }
  }
}
setInterval(()=>{ if(G&&!paused&&!G.ended) scheduleAudio(); },25);

function endlessExtend(t){
  if(G.mode!=='endless'||G.ended) return;
  if(t<G.nextLapT-6) return;
  G.bpm=G.song.bpm*(1+0.06*G.lap); G.lap++; G.beatLen=60/G.bpm;
  const s1=makeSection(G.song,'lap',G.nextLapT,G.bpm); const s2=makeSection(G.song,'fill',s1.end,G.bpm);
  const evs=[...s1.ev,...s2.ev]; G.ev=G.ev.slice(G.evIdx).concat(evs); G.evIdx=0; G.ev.sort((a,b)=>a.t-b.t);
  const chart=makeChart([...s1.cands,...s2.cands], G.diff, 0);
  for(const p of G.players){ const from=p.notes.length; for(const n of chart){ const gold=p.notes.length%29===14; if(gold) p.goldTotal++; p.notes.push({t:n.t,lane:G.mods.mirror?3-n.lane:n.lane,st:0,sp:false,gold}); } placeNotes(p.notes,from); }
  G.total+=chart.length; G.nextLapT=s2.end;
  toast('Runde '+G.lap+' · '+Math.round(G.bpm)+' BPM');
}

function setDanger(on){ if(!A.mf||A.mfOn===on) return; A.mfOn=on; const t=A.ctx.currentTime; A.mf.frequency.cancelScheduledValues(t); A.mf.frequency.setTargetAtTime(on?900:20000,t,on?0.25:0.12); }
function multOf(p){ return (1+Math.min(3,Math.floor(p.combo/10)))*(p.bloomOn?2:1); }
function laneX(p,l){ return p.fx+p.fw*(l+0.5)/4; }
// Flugbahnen: jede Rakete zündet an einer eigenen Stelle der Linie und kommt oft schräg angeflogen (für alle Spieler gleich)
function placeNotes(notes,from){
  // Lockere Stellen: freie Streuung. Dichte Stellen: Raketen folgen einem ruhigen, langsam wandernden Bogen,
  // jede Taste hat dort ihren festen kleinen Versatz, damit es geordnet bleibt.
  for(let k=from;k<notes.length;k++){ const n=notes[k]; let h=((Math.imul(k+1,2654435761)^Math.imul(Math.round(n.t*1000),40503))>>>0)|1;
    const rnd=()=>{ h^=h<<13; h>>>=0; h^=h>>>17; h^=h<<5; h>>>=0; return h/4294967296; };
    let dens=0; for(let j=Math.max(0,k-12);j<Math.min(notes.length,k+13);j++) if(Math.abs(notes[j].t-n.t)<0.6) dens++;
    const calm=Math.max(0,Math.min(1,(dens-3)/4));
    const flow=0.5+0.12*Math.sin(n.t*0.7+1.3)+0.04*Math.sin(n.t*1.9), lane=((n.lane||0)-1.5)*0.035;
    let tx=0.5;
    const prev=k>0?notes[k-1]:null;
    if(prev && Math.abs(prev.t-n.t)<0.03 && prev.tx!=null){ tx=prev.tx+(prev.tx<0.5?0.09:-0.09); }   // gleichzeitige Raketen nebeneinander
    else if(calm>=0.99){ tx=flow+lane+(rnd()-0.5)*0.02; }
    else { for(let tries=0;tries<8;tries++){ const r0=0.5+(rnd()+rnd()-1)*0.22; tx=r0+(flow+lane-r0)*calm; let ok=true;
        for(let j=k-1;j>=0&&j>=k-6;j--){ const m=notes[j]; if(n.t-m.t>0.6) break; if(Math.abs(m.tx-tx)<0.07*(1-calm)){ ok=false; break; } } if(ok) break; } }
    const r=rnd(); let off; if(r<0.75) off=(rnd()-0.5)*0.03; else if(r<0.9) off=-(0.04+rnd()*0.04); else off=0.04+rnd()*0.04;
    off*=1-calm*0.8;
    n.tx=Math.max(0.2,Math.min(0.8,tx)); n.sx=Math.max(-0.2,Math.min(1.2,n.tx+off)); }
}
function noteX(p,n,u){ const sp=hitLineSpan(p); const f=n.tx+(n.sx-n.tx)*Math.pow(Math.max(0,u),1.7); return sp[0]+(sp[1]-sp[0])*f; }
function hitY(){ return H*0.3; }
function spawnY(){ return H*0.97; }
function pickFirework(){
  const un=SAVE.unlocked;
  if(un.length && Math.random()<0.33){ const u=UNLOCKS[pick(un)]; return {type:u.shape,c:u.c,c2:u.c2}; }
  return {type:pick(BASE_TYPES)};
}
function breakCombo(p){ if(p.combo>=10) p.lost={n:p.combo,t:0}; p.combo=0; }
function judgeText(p,txt,col,x,sub){ p.judg=p.judg.filter(j=>Math.abs(j.x-x)>2); p.judg.push({txt,col,x,t:0,sub}); if(p.judg.length>4) p.judg.shift(); }
function pressLane(pi,lane,perf){
  if(!G||paused||G.ended) return;
  const p=G.players[pi]; if(!p||p.failed) return;
  p.flash[lane]=1;
  const t=songTime(perf);
  if(t<-0.3) return;
  let best=null, bd=1;
  for(let i=p.head;i<p.notes.length;i++){
    const n=p.notes[i]; if(n.t>t+WIN) break;
    if(n.st||n.lane!==lane) continue;
    const d=Math.abs(n.t-t); if(d<=WIN && d<bd){ bd=d; best=n; }
  }
  let x=laneX(p,lane);
  if(!best){
    p.misfire++; breakCombo(p); p.health=Math.max(0,p.health-0.02); SFX.misfire(A.ctx.currentTime);
    for(let i=0;i<10;i++) addP(x,hitY(),(Math.random()-0.5)*80,(Math.random()-0.8)*80,{c:C.silver,life:0.4,size:1.5,drag:3});
    checkFail(p); return;
  }
  best.st=1; x=noteX(p,best,Math.max(0,(best.t-t)/G.approach));
  let base, txt, col, sc;
  if(bd<=W_PERF){ base=100; txt='PERFEKT'; col='#ffe066'; sc=1.05; p.perfect++; }
  else if(bd<=W_GREAT){ base=70; txt='SUPER'; col='#6ff3ff'; sc=0.9; p.great++; }
  else { base=40; txt='GUT'; col='#8dff9e'; sc=0.75; p.good++; }
  p.hits++; p.combo++; p.maxCombo=Math.max(p.maxCombo,p.combo);
  if(p.combo===25||p.combo%50===0) salvo(p.combo);
  if(!G.demo && G.mode!=='practice'){ if(p.combo===50) award('c50'); else if(p.combo===100) award('c100'); else if(p.combo===200) award('c200'); }
  p.score+=base*multOf(p);
  p.health=Math.min(1,p.health+(base===100?0.022:0.015));
  if(!p.bloomOn) p.bloom=Math.min(1,p.bloom+(base===100?0.045:0.032));
  judgeText(p,txt,col,x,base<100?(best.t>t?'FRÜH':'SPÄT'):null);
  { const d=t-best.t; p.errs.push({d,age:0,q:base}); if(p.errs.length>24) p.errs.shift(); p.errAll.push([best.t,d]); }
  p.rings.push({l:lane,t:0,q:base,x}); p.hitPulse[lane]=1; p.cPulse=1;
  // Feuerwerk!
  const y=hitY()-10-Math.random()*H*0.06;
  const fw=pickFirework(); const tier=Math.min(4,1+Math.floor(p.combo/10)); const s=sc*(0.82+0.11*tier)*(p.bloomOn?1.3:1)*(G.players.length>1?0.75:1);
  const c=fw.c!==undefined?fw.c:LANE_COL[lane]; const c2=fw.c2!==undefined?fw.c2:(p.bloomOn?pick([C.white,C.magenta,C.cyan,C.gold]):(Math.random()<0.4?pick([C.white,C.gold,C.silver,C.pink]):-1));
  launchBurst(x,y,fw.type,c,c2,s);
  if(p.bloomOn) SHAPES.ring(x,y,pick([C.white,C.gold,C.cyan,C.magenta]),-1,s*0.7);
  SFX.boom(A.ctx.currentTime, 0.75+sc*0.45, (x/W)*2-1);
  shock(x,y,LANE_COL[lane],sc*(p.bloomOn?1.4:1)); CAM.punch=Math.max(CAM.punch,0.22*sc); CAM.shake=Math.max(CAM.shake,0.12*sc);
  setLeadOk(true);
  if(best.gold && !best.sp){
    p.goldHit++; p.score+=base*2*multOf(p); p.health=Math.min(1,p.health+0.05); if(!p.bloomOn) p.bloom=Math.min(1,p.bloom+0.08);
    judgeText(p,'GOLD!','#ffd54a',x,base<100?(best.t>t?'FRÜH':'SPÄT'):null);
    launchBurst(x,y-H*0.05,'kamuro',C.gold,C.white,s*1.25); SHAPES.ring(x,y-H*0.05,C.gold,-1,s*1.1);
    flash(x,y,C.gold,H*0.5,1.3); SFX.gold(A.ctx.currentTime); CAM.punch=Math.max(CAM.punch,0.6); CAM.shake=Math.max(CAM.shake,0.3);
  }
  if(best.sp){
    p.unlock = G.songIdx*3+G.diff;
    SHAPES.multibreak(x,y,C.magenta,C.cyan,1.1); SFX.unlock(A.ctx.currentTime);
    const u=UNLOCKS[p.unlock]; toast(SAVE.unlocked.includes(p.unlock)?'Wunderkerze getroffen!':'Neues Feuerwerk: '+u.name+' (wird nach dem Lied freigeschaltet)');
  }
}
function pressBloom(pi){
  if(!G||paused||G.ended) return;
  const p=G.players[pi]; if(!p||p.failed) return;
  if(p.bloom>=1 && !p.bloomOn){
    p.bloomOn=true; SFX.bloom(A.ctx.currentTime); setBloomAudio(true);
    progInit(); SAVE.stats.blooms++; if(SAVE.stats.blooms>=10) award('bloom10');
    flash(W/2,H*0.3,C.white,Math.max(W,H),1.4);
    for(let k=0;k<3;k++) later(k*0.12,()=>launchBurst(p.fx+p.fw*(0.2+0.3*k),H*0.22,'chrysanthemum',pick([C.gold,C.magenta,C.cyan]),C.white,0.9));
    for(let k=0;k<7;k++) freeLaunch(W*(0.06+0.88*k/6),H*(0.1+0.04*Math.abs(3-k)),{type:'kamuro'},0.45+Math.abs(3-k)*0.06,{s:0.9});
    CAM.punch=1; CAM.shake=0.5;
    toastBig('BLOOM!');
  }
}
function checkFail(p){
  if(p.health>0||p.failed) return;
  if(G.mode==='practice'){ p.health=0.05; return; }
  p.failed=true; p.bloomOn=false; CAM.shake=0.4;
  if(G.players.every(q=>q.failed)) finishGame(true);
}
function updatePlayers(t,dt){
  for(const p of G.players){
    // verpasste Raketen
    while(p.head<p.notes.length && p.notes[p.head].st && p.notes[p.head].t<t) p.head++;
    for(let i=p.head;i<p.notes.length;i++){
      const n=p.notes[i]; if(n.t>t-WIN) break;
      if(n.st===0 && !p.failed){
        n.st=2; p.miss++; breakCombo(p); VIG.miss=1; const pen=[0.05,0.07,0.085][G.diff];
        p.health=Math.max(0,p.health-pen); if(!p.bloomOn) p.bloom=Math.max(0,p.bloom-0.05);
        judgeText(p,'DANEBEN','#ff6b6b',noteX(p,n,0)); setLeadOk(false); SFX.dud(A.ctx.currentTime); p.shake=1;
        const x=noteX(p,n,0), y=hitY()-30; for(let k=0;k<14;k++) addP(x,y,(Math.random()-0.5)*60,(Math.random()-0.5)*60,{c:C.silver,life:0.6,size:1.4,drag:2,grav:120*FX.scale});
        checkFail(p);
      } else if(n.st===0) n.st=2;
    }
    // Wunderkerzen-Rakete (Freischaltung)
    if((G.mode==='arcade') && !G.custom && !p.specialDone && p.hits>=G.specialAt){
      for(let i=p.head;i<p.notes.length;i++){ const n=p.notes[i]; if(n.t>t+G.approach+0.2 && n.st===0 && !n.gold){ n.sp=true; SFX.whistle(A.ctx.currentTime+0.2,1.2); break; } }
      p.specialDone=true;
    }
    if(p.bloomOn){ for(let k=0;k<4;k++) addP(p.fx+Math.random()*p.fw,hitY(),(Math.random()-0.5)*10,20+Math.random()*30,{c:Math.random()<0.7?C.gold:C.white,life:1.6,size:1.5,drag:1.2,grav:160*FX.scale,fl:F_TWINKLE}); }
    if(p.bloomOn){ p.bloom-=dt/BLOOM_DUR; if(p.bloom<=0){ p.bloom=0; p.bloomOn=false; if(!G.players.some(q=>q.bloomOn)) setBloomAudio(false); } }
    for(let l=0;l<4;l++) p.flash[l]=Math.max(0,p.flash[l]-dt*5);
    for(const j of p.judg) j.t+=dt;
    p.judg=p.judg.filter(j=>j.t<0.7);
    p.scoreShown+= (p.score-p.scoreShown)*Math.min(1,dt*12);
    p.shake=Math.max(0,p.shake-dt*4);
    p.cPulse=Math.max(0,p.cPulse-dt*6); p.mPulse=Math.max(0,p.mPulse-dt*2.5);
    for(let l=0;l<4;l++) p.hitPulse[l]=Math.max(0,p.hitPulse[l]-dt*7);
    for(const e of p.errs) e.age+=dt; if(p.errs.length && p.errs[0].age>4) p.errs.shift();
    for(const r of p.rings) r.t+=dt; if(p.rings.length) p.rings=p.rings.filter(r=>r.t<0.4);
    if(p.lost){ p.lost.t+=dt; if(p.lost.t>0.8) p.lost=null; }
    { const m=multOf(p); if(m>p.lastM && !p.failed){ p.mPulse=1; SFX.multUp(A.ctx.currentTime,m); if(m>=8 && G.mode!=='practice') award('x8'); } p.lastM=m; }
    // Funkenschweif der aufsteigenden Raketen
    const hy=hitY(), sy=spawnY(), rr2=Math.max(11,Math.min(p.fw/4*0.2,19));
    for(let i=p.head;i<p.notes.length;i++){
      const n=p.notes[i]; if(n.t>t+G.approach) break; if(n.st) continue;
      const y=hy+(n.t-t)/G.approach*(sy-hy); const x=noteX(p,n,(n.t-t)/G.approach)+(n.sp?Math.sin(t*12)*8:0);
      if(!n.launched){ n.launched=true; if(n.t-t>G.approach*0.6) SFX.launch(A.ctx.currentTime,(x/W)*2-1); }
      { const u=(n.t-t)/G.approach; if((G.mods.hidden&&u<0.42)||(G.mods.sudden&&u>0.6)) continue; }
      if(Math.random()<(PERF.low?0.25:0.55) && FX.smoke.length<220) FX.smoke.push({x:x+(Math.random()-0.5)*10,y:y+30+Math.random()*40,vx:(Math.random()-0.5)*6,vy:12+Math.random()*10,r:5,gr:9+Math.random()*6,life:1.6+Math.random(),max:2.6,c:n.sp?C.magenta:LANE_COL[n.lane],lit:0,tint:0.5});
      if(Math.random()<0.3) addP(x+(Math.random()-0.5)*rr2,y+rr2*0.6,(Math.random()-0.5)*14,20+Math.random()*25,{c:n.sp?pick([C.magenta,C.cyan,C.gold,C.lime]):(Math.random()<0.75?LANE_COL[n.lane]:C.white),life:0.7,size:1.2,drag:2,grav:15,fl:F_TWINKLE});
      if(n.gold && !n.sp && Math.random()<0.7) addP(x+(Math.random()-0.5)*26,y+(Math.random()-0.5)*26,(Math.random()-0.5)*30,(Math.random()-0.5)*30,{c:Math.random()<0.6?C.gold:C.white,life:0.5,size:1.6,drag:2,grav:20,fl:F_TWINKLE});
    }
  }
}
function finishGame(failed){
  if(G.ended) return;
  if(G.demo){ G.ended=true; const wasPrev=G.preview, me=G; setTimeout(()=>{ if(G===me) stopGame(); },2500);
    if(!wasPrev){ const st=document.getElementById('vis-status'); if(st) st.textContent='Fertig'; } return; }
  G.ended=true; G.failed=!!failed;
  const t=A.ctx.currentTime;
  if(failed){ A.music.gain.setTargetAtTime(0,t,0.3); A.lead.gain.setTargetAtTime(0,t,0.2); SFX.dud(t); }
  setBloomAudio(false); setDanger(false);
  let fc=false;
  if(!failed) for(const p of G.players){ if(p.hits>0 && p.miss===0 && p.maxCombo===p.hits){ p.fc=p.great+p.good===0?'ALLES PERFEKT':'FULL COMBO'; fc=true; } }
  if(fc){ const fp=G.players.find(p=>p.fc); toastBig(fp.fc+'!'); salvo(fp.maxCombo,true); SFX.unlock(t); later(1.7,()=>skyText(W/2,H*0.2,fp.fc==='ALLES PERFEKT'?'PERFEKT':'FULL COMBO',C.cyan,C.white,Math.min(W*0.6,640)));
    for(let i=0;i<12;i++) later(0.3+i*0.08,()=>freeLaunch(W*(0.05+Math.random()*0.9),H*(0.08+Math.random()*0.25),pickFirework(),0.6,{s:1})); }
  setTimeout(()=>showResults(),failed?1400:(fc?3800:600));
}
function gradeOf(p){
  const tot=p.perfect+p.great+p.good+p.miss; if(!tot) return {g:'–',acc:0,pct:0};
  const acc=(p.perfect+p.great*0.8+p.good*0.5)/tot; const pct=(p.perfect+p.great+p.good)/tot;
  const gr=acc>=0.97?'S':acc>=0.92?'A':acc>=0.84?'B':acc>=0.72?'C':acc>=0.6?'D':'E';
  return {g:gr,acc,pct};
}

// ---------- Freie Raketen (Titel, Galerie, Visualizer) ----------
function freeLaunch(x,y,fw,flight,opt={}){
  const x0=x+(Math.random()-0.5)*60;
  freeRockets.push({x0,y0:H*0.8,x1:x,y1:y,t0:FX.time,t1:FX.time+flight,fw,s:opt.s||1,sp:opt.sp,far:!!opt.far});
}
function updateFree(){
  for(let i=freeRockets.length-1;i>=0;i--){
    const r=freeRockets[i]; const u=Math.min(1,(FX.time-r.t0)/(r.t1-r.t0)); const e=1-Math.pow(1-u,2);
    const x=r.x0+(r.x1-r.x0)*e, y=r.y0+(r.y1-r.y0)*e; r.x=x; r.y=y;
    if(Math.random()<(r.far?0.5:0.9)) addP(x,y+6,(Math.random()-0.5)*15,25+Math.random()*25,{c:Math.random()<0.5?C.gold:C.ember,life:r.far?0.25:0.4,size:r.far?0.9:1.3,drag:2,grav:40});
    if(u>=1){ freeRockets.splice(i,1); const f=r.fw; launchBurst(x,y,f.type,f.c!==undefined?f.c:pick([0,1,2,5,6,7,8,9]),f.c2!==undefined?f.c2:(Math.random()<0.5?pick([C.white,C.gold]):-1),r.s); if(A.ctx) SFX.boom(A.ctx.currentTime+(r.far?0.22:0),r.far?0.18*r.s:0.6*r.s,(x/W)*2-1,r.far); }
  }
}
function drawFree(ctx){
  ctx.globalCompositeOperation='lighter';
  for(const r of freeRockets){ if(r.x===undefined) continue; const s=r.far?5:10; ctx.drawImage(SPRITES[C.gold],r.x-s,r.y-s,s*2,s*2); }
  ctx.globalCompositeOperation='source-over';
}
// ---------- Große Momente ----------
function ambience(t){
  if(t<0||!G.beatLen) return;
  const beat=Math.floor(t/G.beatLen); if(beat===G.lastBeat) return; G.lastBeat=beat;
  const live=G.players.filter(p=>!p.failed); if(!live.length) return;
  const m=Math.max(...live.map(multOf)), bloom=live.some(p=>p.bloomOn);
  let n=0;
  if(bloom) n=2; else if(m>=4) n=beat%2===0?1:0; else if(m>=3) n=beat%4===0?1:0; else if(m>=2) n=beat%8===0?1:0;
  for(let i=0;i<n;i++){ const x=W*(0.04+Math.random()*0.92), y=H*(0.08+Math.random()*0.2);
    freeLaunch(x,y,{type:pick(['peony','chrysanthemum','willow','kamuro','ring','palm','crackle']),c:pick([0,1,2,5,6,7,8,9,12])},G.beatLen*2-0.02,{s:0.35+Math.random()*0.25,far:true}); }
}
function salvo(n,noText){
  const k=7; for(let i=0;i<k;i++){ const x=W*(0.08+0.84*i/(k-1)); freeLaunch(x,H*(0.12+0.05*Math.abs(3-i)),{type:i%2?'chrysanthemum':'peony',c:pick([C.gold,C.white,C.cyan,C.magenta])},0.7,{s:0.7}); }
  banner(n+'er Kombo', n>=100?'Der Hafen tobt':'Weiter so'); later(0.7,()=>{ CAM.punch=0.7; });
  if(n>=50 && !noText) freeLaunch(W/2,H*0.15,{type:'peony',c:C.white},0.75,{s:0.3}), later(0.75,()=>{ skyText(W/2,H*0.15,String(n),n>=100?C.magenta:C.gold,C.white,Math.min(W*0.28,300)); SFX.boom(A.ctx.currentTime,1.2,0); });
}
function banner(text,sub){ if(G) G.banner={text,sub,t0:FX.time}; }
function grandFinale(){
  for(let i=0;i<28;i++) later(i*0.1+Math.random()*0.05,()=>freeLaunch(W*(0.05+Math.random()*0.9),H*(0.08+Math.random()*0.28),pickFirework(),0.5+Math.random()*0.35,{s:0.8+Math.random()*0.5}));
  later(2.2,()=>{ for(let i=0;i<7;i++) freeLaunch(W*(0.06+0.88*i/6),H*0.1,{type:'kamuro'},0.5,{s:1.2}); });
  later(3.1,()=>{ for(let i=0;i<3;i++) later(i*0.16,()=>{ launchBurst(W*(0.25+0.25*i),H*0.18,'strobe',C.white,C.silver,1.3); SFX.boom(A.ctx.currentTime,1.3,(i-1)*0.6); CAM.shake=0.9; CAM.punch=1; }); });
  later(2.5,()=>{ const live=G.players.filter(p=>!p.failed); const best=live.sort((a,b)=>b.score-a.score)[0]; const g=best?gradeOf(best).g:'';
    const word=g==='S'?'MEGA!':g==='A'?'BUMM!':'BUMM'; skyText(W/2,H*0.17,word,g==='S'?C.magenta:C.gold,C.white,Math.min(W*0.5,560)); SFX.boom(A.ctx.currentTime,1.5,0); CAM.shake=0.6; CAM.punch=1; });
  banner('Großes Finale','');
}
function compositeFx(){
  g.setTransform(1,0,0,1,0,0);
  const Wd=cv.width, Hd=cv.height, wy=Math.round(H*0.8*DPR), hh=Hd-wy;
  g.globalCompositeOperation='lighter';
  // Spiegelung im Hafenbecken, gestaucht und vom Wellengang verzerrt
  const step=Math.max(2,Math.round(3*DPR));
  for(let y=0;y<(CITY.ok?0:hh);y+=step){
    const sy=wy-y*4-step*4; if(sy<0) break; const f=1-0.65*y/hh;
    const dx=Math.sin(camT*1.7+y*0.11/DPR)*(1.5+y*0.05);
    g.globalAlpha=0.5*f; g.drawImage(fxc,0,sy,Wd,step*4,dx,wy+y,Wd,step);
  }
  if(!PERF.low){
    b1g.clearRect(0,0,b1.width,b1.height); b1g.drawImage(fxc,0,0,b1.width,b1.height);
    b2g.clearRect(0,0,b2.width,b2.height); b2g.drawImage(b1,0,0,b2.width,b2.height);
    g.globalAlpha=0.6; g.drawImage(b1,0,0,Wd,Hd); g.globalAlpha=0.75; g.drawImage(b2,0,0,Wd,Hd);
  }
  g.globalAlpha=1; g.drawImage(fxc,0,0);
  g.globalCompositeOperation='source-over';
}
function skyLight(){
  const L=FX.light; if(L.v<0.02) return; const kk=CITY.ok?0.45:1;
  g.globalCompositeOperation='lighter';
  const gr=g.createLinearGradient(0,0,0,H); const c='rgba('+(L.r|0)+','+(L.g|0)+','+(L.b|0)+',';
  gr.addColorStop(0,c+(kk*Math.min(0.2,L.v*0.12)).toFixed(3)+')'); gr.addColorStop(0.8,c+(kk*Math.min(0.12,L.v*0.07)).toFixed(3)+')'); gr.addColorStop(1,c+'0)');
  g.fillStyle=gr; g.fillRect(-60,-60,W+120,H+120);
  g.globalCompositeOperation='source-over';
}
function drawCinema(t){
  g.setTransform(DPR,0,0,DPR,0,0);
  const s=G.song;
  if(t<0.4 && !G.demo){
    const k=t<-0.5?1:Math.max(0,(0.4-t)/0.9);
    const lb=Math.min(1,(t+3.2)/0.5)*k, bh=H*0.11*lb;
    g.fillStyle='#000'; g.fillRect(0,0,W,bh); g.fillRect(0,H-bh,W,bh);
    const a=Math.max(0,Math.min(1,(t+2.8)/0.8))*k;
    g.globalAlpha=a; g.textAlign='center'; g.textBaseline='middle';
    if('letterSpacing' in g) g.letterSpacing='0.35em';
    g.fillStyle='rgba(235,215,165,0.9)'; g.font='600 '+Math.round(Math.max(11,Math.min(15,W*0.032)))+'px "Cinzel", Georgia, serif';
    g.fillText(s.composer.toUpperCase(),W/2,H*0.4,W*0.9);
    if('letterSpacing' in g) g.letterSpacing='0.04em';
    g.shadowColor='rgba(255,200,120,0.55)'; g.shadowBlur=24;
    g.fillStyle='#fff7e6'; g.font='600 '+Math.round(Math.max(22,Math.min(48,W*0.06)))+'px "Cinzel", Georgia, serif';
    g.fillText(s.piece,W/2,H*0.48,W*0.92);
    g.shadowBlur=0;
    if('letterSpacing' in g) g.letterSpacing='0px';
    g.fillStyle='rgba(205,212,245,0.85)'; g.font='500 14px "Rubik", system-ui, sans-serif';
    g.fillText('„'+s.title+'“  ·  '+DIFF_NAMES[G.diff]+(G.mode==='endless'?'  ·  Endlos':''),W/2,H*0.555,W*0.9);
    g.globalAlpha=1;
  }
  if(G.banner){
    const u=(FX.time-G.banner.t0)/1.8; if(u>=1){ G.banner=null; return; }
    const a=u<0.15?u/0.15:u>0.7?(1-u)/0.3:1;
    g.globalAlpha=a; g.textAlign='center'; g.textBaseline='middle';
    if('letterSpacing' in g) g.letterSpacing='0.12em';
    g.shadowColor='rgba(255,210,120,0.8)'; g.shadowBlur=20; g.fillStyle='#fff3d6';
    g.font='600 '+Math.round(Math.max(20,Math.min(40,W*0.05)))+'px "Cinzel", Georgia, serif'; g.fillText(G.banner.text,W/2,H*0.19-u*10,W*0.9);
    g.shadowBlur=0; if('letterSpacing' in g) g.letterSpacing='0.3em';
    if(G.banner.sub){ g.fillStyle='rgba(235,215,165,0.85)'; g.font='600 12px "Cinzel", Georgia, serif'; g.fillText(G.banner.sub.toUpperCase(),W/2,H*0.19+30-u*10,W*0.9); }
    if('letterSpacing' in g) g.letterSpacing='0px';
    g.globalAlpha=1;
  }
}
let attractT=0;
function attract(dt){
  attractT-=dt;
  if(attractT<=0){ attractT=0.5+Math.random()*1.1; if(!A.ctx) { // noch kein Ton erlaubt: nur Optik
      const x=W*(0.1+Math.random()*0.8), y=H*(0.12+Math.random()*0.3); freeLaunch(x,y,pickFirework(),0.9+Math.random()*0.4); }
    else { const x=W*(0.1+Math.random()*0.8), y=H*(0.12+Math.random()*0.3); freeLaunch(x,y,pickFirework(),0.9+Math.random()*0.4,{s:0.8}); }
  }
}

// ---------- Visualizer ----------
const VIS={el:null,an:null,data:null,avg:[0,0,0],last:[0,0,0],on:false,delay:0.9};
function visFile(file){
  audioInit(); stopGame(); newMusicBus();
  if(VIS.el){ VIS.el.pause(); }
  const el=new Audio(); el.src=URL.createObjectURL(file); el.crossOrigin='anonymous';
  const src=A.ctx.createMediaElementSource(el);
  const an=A.ctx.createAnalyser(); an.fftSize=1024; an.smoothingTimeConstant=0.2;
  const dl=A.ctx.createDelay(2); dl.delayTime.value=VIS.delay;
  src.connect(an); src.connect(dl); dl.connect(A.music);
  VIS.el=el; VIS.an=an; VIS.data=new Uint8Array(an.frequencyBinCount); VIS.on=true; VIS.avg=[0,0,0]; VIS.last=[0,0,0];
  el.play();
  el.onended=()=>{ VIS.on=false; };
  document.getElementById('vis-status').textContent='Läuft: '+file.name;
}
function visStop(){ if(VIS.el){ VIS.el.pause(); VIS.el=null; } VIS.on=false; }
function visUpdate(){
  if(!VIS.on||!VIS.an) return;
  VIS.an.getByteFrequencyData(VIS.data); const d=VIS.data;
  const bands=[[1,6],[6,40],[40,160]]; const now=FX.time;
  bands.forEach(([a,b],k)=>{
    let e=0; for(let i=a;i<b;i++) e+=d[i]; e/=(b-a);
    const avg=VIS.avg[k]; VIS.avg[k]=avg*0.94+e*0.06;
    const gap=[0.22,0.16,0.14][k];
    if(e>avg*1.35+6 && e>40 && now-VIS.last[k]>gap){
      VIS.last[k]=now;
      const type=k===0?pick(['peony','chrysanthemum','willow','palm','kamuro']):k===1?pick(['ring','crossette','pistil','doublering','spiral']):pick(['strobe','crackle','peony']);
      const x=W*(0.08+Math.random()*0.84), y=H*(0.1+Math.random()*0.35);
      freeLaunch(x,y,{type,c:pick([0,1,2,5,6,7,8,9,10])},VIS.delay,{s:k===0?1.1:k===1?0.85:0.6});
    }
  });
}
function demoUpdate(t){
  if(!G||!G.demo) return;
  for(const n of G.demoNotes){
    if(n.done) continue; if(n.t-t>0.9) break;
    n.done=true; const x=G.preview&&W>900 ? (n.lane<2?W*(0.03+Math.random()*0.17):W*(0.8+Math.random()*0.17)) : W*(0.12+0.76*(n.lane/3))+(Math.random()-0.5)*W*0.15; const y=H*(0.12+Math.random()*0.3);
    freeLaunch(x,y,{type:pickFirework().type,c:LANE_COL[n.lane]},Math.max(0.05,n.t-t),{s:0.9});
  }
}

// ---------- Zeichnen des Spielfelds ----------
// ---------- Hauptschleife ----------
let lastTs=performance.now();
function frame(ts){
  const dt=Math.min(0.05,(ts-lastTs)/1000); lastTs=ts;
  // Automatisch sparsamer rendern, wenn das Gerät nicht hinterherkommt
  if(!PERF.low && !document.hidden){ PERF.slow = dt>1/38 ? PERF.slow+dt : Math.max(0,PERF.slow-dt*0.5); if(PERF.slow>2.5){ PERF.low=true; PERF.slow=0; resize(); } }
  else if(PERF.low && CITY.ok && !document.hidden){ PERF.slow = dt>1/28 ? PERF.slow+dt : Math.max(0,PERF.slow-dt*0.5); if(PERF.slow>3){ CITY.ok=false; document.getElementById('cv3').style.display='none'; } }
  pollPads();
  let t=(G&&A.ctx)?songTime():0, bloomLvl=0;
  const playing=G&&!G.ended;
  if(!paused){
    camT+=dt;
    if(G&&A.ctx){
      t=songTime();
      if(!G.ended){
        scheduleAudio();
        if(G.beatLen && t>=0 && !G.custom){ const bt=Math.floor(t/G.beatLen); if(bt!==BEAT.last){ BEAT.last=bt; const down=bt%4===0; BEAT.p=down?1:0.55; if(down && G.players.length && !G.demo) CAM.punch=Math.max(CAM.punch,0.2); } }
        if(G.players.length) updatePlayers(t,dt);
        demoUpdate(t);
        endlessExtend(t);
        if(G.players.length && !G.demo){
          ambience(t);
          if(!G.openDone && t>-2.4){ G.openDone=true; freeLaunch(W/2,H*0.2,{type:'chrysanthemum',c:C.gold,c2:C.white},1.1,{s:1.25}); later(1.1,()=>{ CAM.punch=0.8; }); }
          if(G.finaleT!==undefined && !G.finaleDone && t>=G.finaleT-0.02){ G.finaleDone=true; if(!G.players.every(p=>p.failed)) grandFinale(); }
        }
        { const live=G.players.filter(p=>!p.failed); setDanger(!G.demo && G.mode!=='practice' && live.length>0 && live.every(p=>p.health<0.25 && !p.bloomOn)); }
        if(t>G.dur) finishGame(false);
      }
    } else if(!G) { attract(dt); }
    visUpdate(); updateFree(); fxUpdate(dt);
    VIG.miss=Math.max(0,VIG.miss-dt*2.6); BEAT.p=Math.max(0,BEAT.p-dt*4.5); CAM.shake=Math.max(0,CAM.shake-dt*2.2); CAM.punch=Math.max(0,CAM.punch-dt*2.5);
  }
  if(G) for(const p of G.players) if(p.bloomOn) bloomLvl=1;
  camCompute();
  if(GFX.ok){
    // Grafikkarte: Hintergrund auf eigene Ebene, Feuerwerk mit Leuchten darüber, Spielfeld ganz oben
    CITY.introK = (G&&G.players.length&&!G.demo&&!G.ended&&A.ctx) ? Math.max(0,Math.min(1,(0.6-t)/3.8)) : 0;
    if(CITY.ok) cityRender(paused?0:dt,bloomLvl>0);
    const gm=g; g=gb; g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,cvb.width,cvb.height); camApply(g);
    if(CITY.ok){ if(bloomLvl>0) drawAurora(camT,bloomLvl); } else drawBackground(camT,bloomLvl);
    skyLight(); g=gm;
    gfxRender(!CITY.ok);
    g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,cv.width,cv.height); camApply(g);
  } else {
  if(CITY.ok){ cityRender(paused?0:dt,bloomLvl>0); g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,cv.width,cv.height); camApply(g); if(bloomLvl>0) drawAurora(camT,bloomLvl); }
  else { camApply(g); drawBackground(camT,bloomLvl); }
  skyLight(); smokeDraw(g);
  fg.setTransform(1,0,0,1,0,0); fg.clearRect(0,0,fxc.width,fxc.height); camApply(fg);
  fxDraw(fg); drawFree(fg);
  compositeFx(); camApply(g);
  }
  if(G && !G.ended && G.players.length && A.ctx){ for(const p of G.players) drawField(p,t); g.setTransform(DPR,0,0,DPR,0,0); drawVignette(t); drawHud(t); drawCinema(t); drawCountdown(t); }
  requestAnimationFrame(frame);
}

// ---------- Eingabe ----------
const KEY_SOLO={ArrowLeft:0,ArrowDown:1,ArrowUp:2,ArrowRight:3,KeyA:0,KeyS:1,KeyW:2,KeyD:3,Numpad4:0,Numpad2:1,Numpad8:2,Numpad6:3,Numpad5:1};
const KEY_P1={KeyA:0,KeyS:1,KeyW:2,KeyD:3}, KEY_P2={ArrowLeft:0,ArrowDown:1,ArrowUp:2,ArrowRight:3,Numpad4:0,Numpad2:1,Numpad8:2,Numpad6:3,Numpad5:1};
const held=new Set();
window.addEventListener('keydown',e=>{
  if(G && !G.ended && !G.demo && G.players.length){
    if(e.code==='Escape'||e.code==='KeyP'){ e.preventDefault(); togglePause(); return; }
    if(paused){ menuKey(e); return; }
    if(e.repeat){ e.preventDefault(); return; }
    if(G.mode==='versus'){
      if(e.code in KEY_P1){ e.preventDefault(); pressLane(0,KEY_P1[e.code],e.timeStamp); return; }
      if(e.code in KEY_P2){ e.preventDefault(); pressLane(1,KEY_P2[e.code],e.timeStamp); return; }
      if(e.code==='Space'||e.code==='KeyQ'||e.code==='KeyE'||e.code==='ShiftLeft'){ e.preventDefault(); pressBloom(0); return; }
      if(e.code==='Enter'||e.code==='NumpadEnter'||e.code==='ShiftRight'||e.code==='Numpad0'){ e.preventDefault(); pressBloom(1); return; }
    } else {
      if(e.code in KEY_SOLO){ e.preventDefault(); pressLane(0,KEY_SOLO[e.code],e.timeStamp); return; }
      if(e.code==='Space'||e.code==='Enter'||e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='Numpad0'){ e.preventDefault(); pressBloom(0); return; }
    }
    return;
  }
  if(G && G.demo && e.code==='Escape'){ stopGame(); showScreen('vis'); return; }
  menuKey(e);
});
// Touch / Maus auf dem Spielfeld
cv.addEventListener('pointerdown',e=>{
  if(!G||G.ended||paused||!G.players.length) return;
  for(const p of G.players){ if(e.clientX>=p.fx-10 && e.clientX<=p.fx+p.fw+10){ const l=Math.max(0,Math.min(3,Math.floor((e.clientX-p.fx)/(p.fw/4)))); pressLane(p.i,l,e.timeStamp); e.preventDefault(); return; } }
},{passive:false});
document.getElementById('bloomBtn').addEventListener('pointerdown',e=>{ e.preventDefault(); pressBloom(0); });
window.addEventListener('blur',()=>{ if(G&&!G.ended&&!G.demo&&G.players.length&&!paused) togglePause(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&G&&!G.ended&&!G.demo&&G.players.length&&!paused) togglePause(); });

// Gamepads
const padPrev={};
const PAD_LANE={2:0,0:1,3:2,1:3,14:0,13:1,12:2,15:3};
function pollPads(){
  const pads=navigator.getGamepads?navigator.getGamepads():[]; let pi=0;
  for(const pad of pads){
    if(!pad) continue; const prev=padPrev[pad.index]||[]; const now=pad.buttons.map(b=>b.pressed||b.value>0.5);
    const player = G&&G.mode==='versus' ? Math.min(1,pi) : 0; pi++;
    now.forEach((on,bi)=>{
      if(!on||prev[bi]) return;
      const inGame=G&&!G.ended&&!G.demo&&G.players.length&&!paused;
      if(inGame){
        if(bi in PAD_LANE) pressLane(player,PAD_LANE[bi]);
        else if(bi>=4&&bi<=7) pressBloom(player);
        else if(bi===9) togglePause();
      } else {
        const map={12:'ArrowUp',13:'ArrowDown',14:'ArrowLeft',15:'ArrowRight',0:'Enter',1:'Escape',9:'Enter'};
        if(bi===9 && G && paused){ togglePause(); return; }
        if(map[bi]) menuKey({code:map[bi],key:map[bi],preventDefault(){},synthetic:true});
      }
    });
    padPrev[pad.index]=now;
  }
}
