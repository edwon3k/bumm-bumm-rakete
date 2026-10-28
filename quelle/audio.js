// ===== Audio-Engine: alles live mit WebAudio synthetisiert =====
const A = { ctx:null };
function audioInit(){
  if(A.ctx) { if(A.ctx.state==='suspended') A.ctx.resume(); return A.ctx; }
  const ctx = new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  A.ctx = ctx;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value=-12; comp.knee.value=8; comp.ratio.value=4; comp.attack.value=0.004; comp.release.value=0.25;
  const lim=ctx.createDynamicsCompressor(); lim.threshold.value=-2; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=0.001; lim.release.value=0.1; const og=ctx.createGain(); og.gain.value=0.82; comp.connect(og); og.connect(lim); lim.connect(ctx.destination);
  A.master = ctx.createGain(); A.master.gain.value=0.75; A.master.connect(comp);
  // Hall
  A.rev = ctx.createConvolver(); A.rev.buffer = makeImpulse(ctx, 3.4);
  const revOut = ctx.createGain(); revOut.gain.value=0.5; A.rev.connect(revOut); revOut.connect(A.master);
  // Musikbus
  A.musicVol = ctx.createGain(); A.musicVol.connect(A.master);
  A.shelf = ctx.createBiquadFilter(); A.shelf.type='highshelf'; A.shelf.frequency.value=2500; A.shelf.gain.value=0;
  // Mix-EQ: mehr Fundament und Glanz, weniger harte Mitten (wie eine fertig gemischte Platte)
  { const lo=ctx.createBiquadFilter(); lo.type='lowshelf'; lo.frequency.value=110; lo.gain.value=3.5;
    const mid=ctx.createBiquadFilter(); mid.type='peaking'; mid.frequency.value=1800; mid.Q.value=0.8; mid.gain.value=-3.5;
    const hi=ctx.createBiquadFilter(); hi.type='highshelf'; hi.frequency.value=7500; hi.gain.value=4.5;
    A.shelf.connect(lo); lo.connect(mid); mid.connect(hi); hi.connect(A.musicVol); }
  A.music = ctx.createGain(); A.music.connect(A.shelf);
  A.lead = ctx.createGain(); A.lead.connect(A.music);
  A.drums = ctx.createGain(); A.drums.connect(A.music);
  sendTo(A.music, 0.12); sendTo(A.lead, 0.22);
  // SFX
  A.sfx = ctx.createGain(); A.sfx.connect(A.master); sendTo(A.sfx, 0.4);
  // Echo der Explosionen zwischen den Häuserfronten
  const ed=ctx.createDelay(1); ed.delayTime.value=0.23; const ef=ctx.createBiquadFilter(); ef.type='lowpass'; ef.frequency.value=1100;
  const fb=ctx.createGain(); fb.gain.value=0.38; const eo=ctx.createGain(); eo.gain.value=0.45;
  A.sfx.connect(ed); ed.connect(ef); ef.connect(fb); fb.connect(ed); ef.connect(eo); eo.connect(A.master);
  // Rauschen
  const nb = ctx.createBuffer(1, ctx.sampleRate*2, ctx.sampleRate); const d=nb.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  A.noise = nb;
  // Orgel-Wellenform
  const re=new Float32Array([0,1,0.8,0.55,0.45,0.25,0.3,0.12,0.18]); A.organWave = ctx.createPeriodicWave(re, new Float32Array(re.length));
  A.distCurve = (()=>{ const n=1024,c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i*2/n-1; c[i]=Math.tanh(x*6)*0.8; } return c; })();
  // Röhrenverstärker-Kennlinie (asymmetrisch, kräftig)
  A.ampCurve = (()=>{ const n=2048,c=new Float32Array(n); let mx=0; for(let i=0;i<n;i++){ const x=i*2/n-1; c[i]=Math.tanh(x*9+0.25*x*x*9); mx=Math.max(mx,Math.abs(c[i])); } for(let i=0;i<n;i++) c[i]/=mx; return c; })();
  // metallisches Rauschen für Becken (Summe von Rechteckschwingungen wie bei echten Becken-Moden)
  { const len=ctx.sampleRate*2, mb=ctx.createBuffer(1,len,ctx.sampleRate), md=mb.getChannelData(0);
    const fr=[205.3,304.4,369.6,522.7,540,800].map(f=>f*2.03), ph=fr.map(()=>Math.random()); let mx=0;
    for(let i=0;i<len;i++){ let v=0; for(let k=0;k<fr.length;k++){ const p=(ph[k]+fr[k]*i/ctx.sampleRate)%1; v+=p<0.5?1:-1; } v=v/fr.length*0.7+(Math.random()*2-1)*0.3; md[i]=v; mx=Math.max(mx,Math.abs(v)); }
    for(let i=0;i<len;i++) md[i]/=mx; A.metal=mb; }
  sendTo(A.drums, 0.13);
  applyVolumes();
  setTimeout(()=>{ smpLoad('fx'); smpLoad('drums'); },0);
  return ctx;
}
function sendTo(node, amt){ const g=A.ctx.createGain(); g.gain.value=amt; node.connect(g); g.connect(A.rev); }
function makeImpulse(ctx, sec){
  const len=ctx.sampleRate*sec, b=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let c=0;c<2;c++){ const d=b.getChannelData(c); for(let i=0;i<len;i++){ d[i]=(Math.random()*2-1)*Math.pow(1-i/len, 3.2); } }
  return b;
}
function applyVolumes(){
  if(!A.ctx) return;
  A.musicVol.gain.value = SETTINGS.music*0.9;
  A.sfx.gain.value = SETTINGS.sfx*0.8;
}
function setLeadOk(ok){ if(!A.ctx) return; const g=A.lead.gain, t=A.ctx.currentTime; g.cancelScheduledValues(t); g.setTargetAtTime(ok?1:0.18, t, ok?0.01:0.03); }
function setBloomAudio(on){ if(!A.ctx) return; const t=A.ctx.currentTime; A.shelf.gain.cancelScheduledValues(t); A.shelf.gain.setTargetAtTime(on?6:0, t, 0.08); }

// ---------- Bausteine ----------
function osc(type, f, t, end, dest, detune){
  const o=A.ctx.createOscillator(); if(type==='organ') o.setPeriodicWave(A.organWave); else o.type=type;
  o.frequency.setValueAtTime(f,t); if(detune) o.detune.value=detune; o.connect(dest); o.start(t); o.stop(end); return o;
}
function gainEnv(t, dur, peak, a, rel, sus, dest){
  const g=A.ctx.createGain(); const p=g.gain;
  p.setValueAtTime(0.0001,t); p.linearRampToValueAtTime(peak, t+a);
  if(sus!==undefined && sus<1) p.setTargetAtTime(peak*sus, t+a, Math.max(0.02,dur*0.3));
  p.setTargetAtTime(0.0001, t+Math.max(a,dur), rel/3);
  g.connect(dest); return g;
}
function lp(freq, q, dest){ const f=A.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=freq; f.Q.value=q||0.7; f.connect(dest); return f; }
function noiseSrc(t, dur, dest, rate){ const s=A.ctx.createBufferSource(); s.buffer=A.noise; if(rate) s.playbackRate.value=rate; s.connect(dest); s.start(t, Math.random()*1.5); s.stop(t+dur); return s; }

// ---------- Effekte (Feuerwerk) ----------
const SFX = {
  boom(t,size=1,pan=0,far){
    if(!A.ctx) return;
    if(SMP.buf.fx){ // echte Feuerwerks-Aufnahmen
      const p=A.ctx.createStereoPanner? A.ctx.createStereoPanner():null; const dest=p||A.sfx; if(p){ p.pan.value=Math.max(-1,Math.min(1,pan)); p.connect(A.sfx); }
      const pool= far? ['c01','c09','c06'] : size>1.25? ['c12','c00','c04'] : ['c00','c01','c04','c05','c06','c08','c09'];
      const nm=pool[(Math.random()*pool.length)|0];
      // Nur der Knall: den Nachhall der Aufnahmen (Echo zwischen Häusern) kurz nach dem Schlag ausblenden
      const v=(far?0.45:0.95)*Math.min(1.5,size), rt=(far?0.85:1)*(0.93+Math.random()*0.14);
      const fr=fxplay(nm,t,v,dest,rt,0.75); if(fr){ const gg=fr.g.gain; gg.setValueAtTime(v,t); gg.setValueAtTime(v,t+0.22); gg.exponentialRampToValueAtTime(v*0.02,t+0.5); gg.linearRampToValueAtTime(0,t+0.6); }
      if(!far){ // Druck im Bauch: kurzer Subbass-Schlag unter der Aufnahme
        const g=A.ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.5*size,t+0.004); g.gain.exponentialRampToValueAtTime(0.001,t+0.45); g.connect(dest);
        const o=osc('sine',110,t,t+0.5,g); o.frequency.exponentialRampToValueAtTime(34,t+0.35); }
      if(!far && Math.random()<0.3) SFX.crackle(t+0.25,8,pan);
      return;
    }
    const p=A.ctx.createStereoPanner? A.ctx.createStereoPanner():null; const dest=p||A.sfx; if(p){ p.pan.value=Math.max(-1,Math.min(1,pan)); p.connect(A.sfx); }
    if(!far){ // peitschender Knall der Zerlegerladung: sehr kurz, breitbandig, laut
      const cg=A.ctx.createGain(); cg.gain.setValueAtTime(0.0001,t); cg.gain.linearRampToValueAtTime(0.85*size,t+0.0015); cg.gain.exponentialRampToValueAtTime(0.02,t+0.035); cg.gain.exponentialRampToValueAtTime(0.0005,t+0.11); cg.connect(dest);
      const hp=A.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=900; const pk=A.ctx.createBiquadFilter(); pk.type='peaking'; pk.frequency.value=3200; pk.gain.value=6; pk.Q.value=0.8; hp.connect(pk); pk.connect(cg); noiseSrc(t,0.12,hp,1.4);
      const kg=gainEnv(t,0.002,0.5*size,0.0005,0.02,1,dest); const ko=osc('square',2400,t,t+0.03,lp(6000,0.7,kg)); ko.frequency.exponentialRampToValueAtTime(300,t+0.02);
    }
    // Druckwelle: Körper der Explosion
    const g=A.ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.5*size,t+0.005); g.gain.exponentialRampToValueAtTime(0.001,t+0.6+0.5*size); g.connect(dest);
    const f=lp(1400,0.7,g); f.frequency.setValueAtTime(far?800:3200,t); f.frequency.exponentialRampToValueAtTime(far?140:200,t+0.45); noiseSrc(t,1.2,f,0.75);
    // Bauchschlag im Subbass
    const g2=A.ctx.createGain(); g2.gain.setValueAtTime(0.0001,t); g2.gain.linearRampToValueAtTime(0.8*size,t+0.003); g2.gain.exponentialRampToValueAtTime(0.001,t+0.7); g2.connect(dest);
    const o=osc('sine',140,t,t+0.75,g2); o.frequency.exponentialRampToValueAtTime(30,t+0.5);
    const g2b=gainEnv(t,0.02,0.25*size,0.002,0.1,1,dest); const o2=osc('triangle',90,t,t+0.2,lp(400,1,g2b)); o2.frequency.exponentialRampToValueAtTime(40,t+0.15);
    // Donnergrollen, das zwischen den Hochhäusern nachhallt
    const g3=A.ctx.createGain(); g3.gain.setValueAtTime(0.0001,t); g3.gain.linearRampToValueAtTime(0.36*size,t+0.07); g3.gain.exponentialRampToValueAtTime(0.001,t+2.2); g3.connect(dest);
    noiseSrc(t,2.3,lp(160,0.9,g3),0.45);
    if(!far && Math.random()<0.45) SFX.crackle(t+0.15,10,pan);
  },
  crackle(t,n=10,pan=0){ // Knistersterne: lauter werdende Mini-Knalle, die auseinanderlaufen
    if(!A.ctx) return;
    for(let i=0;i<n;i++){ const tt=t+0.2+Math.pow(Math.random(),0.7)*0.9; const v=0.06+Math.random()*0.1; const g=A.ctx.createGain(); g.gain.setValueAtTime(0.0001,tt); g.gain.linearRampToValueAtTime(v,tt+0.001); g.gain.exponentialRampToValueAtTime(0.001,tt+0.025+Math.random()*0.02);
      const pn=A.ctx.createStereoPanner?A.ctx.createStereoPanner():null; if(pn){ pn.pan.value=Math.max(-1,Math.min(1,pan+(Math.random()-0.5)*0.9)); g.connect(pn); pn.connect(A.sfx); } else g.connect(A.sfx);
      const hp=A.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1800+Math.random()*3500; hp.connect(g); noiseSrc(tt,0.05,hp,1.2); }
  },
  whistle(t,dur=0.9,dest){ // Pfeifrakete: aufsteigender, leicht schwankender Pfiff
    if(!A.ctx) return;
    const g=A.ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.05,t+0.06); g.gain.setValueAtTime(0.05,t+dur*0.8); g.gain.linearRampToValueAtTime(0.0001,t+dur); g.connect(dest||A.sfx);
    const bp=A.ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=12; bp.connect(g);
    const f0=1300+Math.random()*500, f1=f0*(1.9+Math.random()*0.5);
    const o=osc('triangle',f0,t,t+dur,bp); o.frequency.exponentialRampToValueAtTime(f1,t+dur); bp.frequency.setValueAtTime(f0,t); bp.frequency.exponentialRampToValueAtTime(f1,t+dur);
    const l=A.ctx.createOscillator(); l.frequency.value=17; const lg=A.ctx.createGain(); lg.gain.value=40; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t+dur);
    const ng=A.ctx.createGain(); ng.gain.value=0.6; ng.connect(bp); noiseSrc(t,dur,ng);
  },
  launch(t,pan=0,dur=0.9){
    if(!A.ctx) return;
    const p=A.ctx.createStereoPanner?A.ctx.createStereoPanner():null; const dest=p||A.sfx; if(p){ p.pan.value=Math.max(-1,Math.min(1,pan)); p.connect(A.sfx); }
    if(SMP.buf.fx){ // aufgenommener Ausstoß + Aufstieg
      fxplay('thump',t,0.35,dest,1.6,0.35);
      const r=fxplay('rise',t-0.02,0.0,dest,2.2,1.65); if(r){ const gg=r.g.gain; gg.setValueAtTime(0.0001,t); gg.linearRampToValueAtTime(0.32,t+0.08); gg.exponentialRampToValueAtTime(0.001,t+dur*0.8); }
    }
    // „Fwump“: Ausstoß aus dem Mörserrohr
    const g1=A.ctx.createGain(); g1.gain.setValueAtTime(0.0001,t); g1.gain.linearRampToValueAtTime(0.4,t+0.004); g1.gain.exponentialRampToValueAtTime(0.001,t+0.22); g1.connect(dest);
    const o=osc('sine',110,t,t+0.25,g1); o.frequency.exponentialRampToValueAtTime(42,t+0.18);
    const pg=A.ctx.createGain(); pg.gain.setValueAtTime(0.25,t); pg.gain.exponentialRampToValueAtTime(0.001,t+0.12); pg.connect(dest); noiseSrc(t,0.14,lp(700,1.2,pg),0.8);
    // „Schhhhh“: Treibsatz, der nach oben wegzischt (Doppler: Tonhöhe und Pegel fallen)
    const g2=A.ctx.createGain(); g2.gain.setValueAtTime(0.0001,t); g2.gain.linearRampToValueAtTime(0.12,t+0.05); g2.gain.exponentialRampToValueAtTime(0.03,t+dur*0.6); g2.gain.exponentialRampToValueAtTime(0.001,t+dur); g2.connect(dest);
    const bp=A.ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=1.1; bp.frequency.setValueAtTime(1200,t); bp.frequency.linearRampToValueAtTime(4200,t+0.12); bp.frequency.exponentialRampToValueAtTime(1600,t+dur); bp.connect(g2); noiseSrc(t,dur+0.05,bp);
    // Knattern des Treibsatzes
    const am=A.ctx.createGain(); am.gain.value=0.5; const ao=A.ctx.createOscillator(); ao.type='square'; ao.frequency.value=38+Math.random()*20; const ag=A.ctx.createGain(); ag.gain.value=0.5; ao.connect(ag); ag.connect(am.gain); ao.start(t); ao.stop(t+dur);
    const g3=A.ctx.createGain(); g3.gain.setValueAtTime(0.05,t+0.03); g3.gain.exponentialRampToValueAtTime(0.001,t+dur*0.8); g3.connect(dest); am.connect(g3); noiseSrc(t,dur,lp(2500,0.8,am));
    if(Math.random()<0.25) SFX.whistle(t+0.04,dur*0.95,dest);
  },
  dud(t){ if(!A.ctx) return; const g=A.ctx.createGain(); g.gain.setValueAtTime(0.12,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25); g.connect(A.sfx); const f=lp(600,1,g); noiseSrc(t,0.3,f,0.4); },
  misfire(t){ if(!A.ctx) return; const g=gainEnv(t,0.05,0.06,0.002,0.08,1,A.sfx); const o=osc('square',140,t,t+0.15,lp(900,1,g)); o.frequency.exponentialRampToValueAtTime(70,t+0.12); },
  bloom(t){ if(!A.ctx) return; DRUM.riser(t-0.0,0.35);
    [0,4,7,12,16].forEach((iv,i)=>{ const g=gainEnv(t+i*0.03,0.5,0.05,0.005,0.6,0.6,A.sfx); osc('sawtooth',mtof(72+iv),t+i*0.03,t+1.2,lp(3000,1,g)); }); },
  ui(t,hi){ if(!A.ctx) return; const g=gainEnv(t,0.03,0.05,0.002,0.06,1,A.sfx); osc('triangle',hi?1320:880,t,t+0.12,g); },
  unlock(t){ if(!A.ctx) return; [0,4,7,12,16,19,24].forEach((iv,i)=>{ const g=gainEnv(t+i*0.07,0.1,0.06,0.003,0.5,0.6,A.sfx); osc('triangle',mtof(76+iv),t+i*0.07,t+i*0.07+0.8,g); }); },
};

