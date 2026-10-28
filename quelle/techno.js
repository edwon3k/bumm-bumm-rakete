// ===== Elektro-Klangerzeuger: Techno/Trance-Instrumente, live synthetisiert =====
// Bassdrum im 909-Stil, Clap, metallische Hi-Hats, Synth-Bässe, Supersaw-Leads, dunkle Flächen.
// Bass, Flächen und Stabs laufen über A.duck: die Bassdrum drückt sie kurz weg (Pumpen wie im Club).
// Verzerrer-Kennlinie mit ungerader Länge: Stille bleibt exakt Stille (kein Gleichspannungs-Versatz)
function eCurve(){ if(A.eCurve) return A.eCurve; const n=1025,c=new Float32Array(n); for(let i=0;i<n;i++){ const x=(i-512)/512; c[i]=Math.tanh(x*5)*0.8; } return A.eCurve=c; }
function eOut(){ return A.duck||A.music; }
function duck(t,amt){ if(!A.duck) return; const p=A.duck.gain; p.cancelScheduledValues(t); p.setValueAtTime(1-amt,t); p.setTargetAtTime(1,t+0.02,0.075); }
const EDRUM = {
  kick(t,v=1){ const ctx=A.ctx, hard=DRUMKIT==='eh';
    const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1.15*v,t+0.002); g.gain.exponentialRampToValueAtTime(0.001,t+(hard?0.42:0.36)); g.connect(A.drums);
    let into=g; if(hard){ const ws=ctx.createWaveShaper(); ws.curve=eCurve(); const pre=ctx.createGain(); pre.gain.value=1.6; pre.connect(ws); ws.connect(g); into=pre; }
    const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(hard?200:155,t); o.frequency.exponentialRampToValueAtTime(hard?46:50,t+0.085); o.connect(into); o.start(t); o.stop(t+0.45);
    const cg=ctx.createGain(); cg.gain.setValueAtTime(0.28*v,t); cg.gain.exponentialRampToValueAtTime(0.001,t+0.01); cg.connect(A.drums); noiseSrc(t,0.02,lp(3500,0.7,cg));
    duck(t,0.6); },
  clap(t,v=1){ const ctx=A.ctx, g=ctx.createGain(), p=g.gain; p.setValueAtTime(0.0001,t);
    [0,0.01,0.021].forEach(d=>{ p.setValueAtTime(0.75*v,t+d); p.exponentialRampToValueAtTime(0.08*v,t+d+0.008); });
    p.setValueAtTime(0.6*v,t+0.03); p.exponentialRampToValueAtTime(0.001,t+0.22);
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1250; bp.Q.value=1.1; bp.connect(g); g.connect(A.drums); noiseSrc(t,0.26,bp); },
  snare(t,v=1){ const ctx=A.ctx; if(v<0.45){ EDRUM.hat(t,v*1.4); return; }
    const g=ctx.createGain(); g.gain.setValueAtTime(0.5*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.17); const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1400; hp.connect(g); g.connect(A.drums); noiseSrc(t,0.2,hp);
    const bg=ctx.createGain(); bg.gain.setValueAtTime(0.55*v,t); bg.gain.exponentialRampToValueAtTime(0.001,t+0.09); bg.connect(A.drums); const o=osc('triangle',200,t,t+0.12,bg); o.frequency.exponentialRampToValueAtTime(150,t+0.06); },
  rim(t,v=1){ EDRUM.clap(t,v*0.6); },
  hat(t,v=1,open){ const ctx=A.ctx, s=ctx.createBufferSource(); s.buffer=A.metal; const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=open?6500:8000;
    const g=ctx.createGain(), d=open?0.2:0.04; g.gain.setValueAtTime((open?0.32:0.4)*Math.max(0.25,v),t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
    s.connect(hp); hp.connect(g); g.connect(A.drums); s.start(t,Math.random()*1.5); s.stop(t+d+0.02); },
  ride(t,v=1){ const ctx=A.ctx, s=ctx.createBufferSource(); s.buffer=A.metal; const bp=ctx.createBiquadFilter(); bp.type='highpass'; bp.frequency.value=5200;
    const g=ctx.createGain(); g.gain.setValueAtTime(0.09*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.45); s.connect(bp); bp.connect(g); g.connect(A.drums); s.start(t,Math.random()*1.5); s.stop(t+0.5); },
  tamb(t,v=1){ EDRUM.hat(t,v*0.7); },
  conga(t,v=1){ EDRUM.hat(t,v*0.5); },
  tom(t,v=1,f=150){ const ctx=A.ctx, g=ctx.createGain(); g.gain.setValueAtTime(0.7*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25); g.connect(A.drums);
    const o=osc('sine',f*1.6,t,t+0.3,g); o.frequency.exponentialRampToValueAtTime(f*0.7,t+0.2); },
};
// Synth-Bass: rolling (Offbeat-Techno), reese (zwei verstimmte Sägezähne), acid (resonanter Filter)
function sBass(t,d,f,v,kind){
  const ctx=A.ctx, g=ctx.createGain(), fl=ctx.createBiquadFilter(); fl.type='lowpass';
  const end=t+Math.max(0.06,d), stop=end+0.12;
  if(kind==='acid'){ fl.Q.value=10; fl.frequency.setValueAtTime(400+1900*v,t); fl.frequency.exponentialRampToValueAtTime(240,t+0.16); }
  else if(kind==='reese'){ fl.Q.value=1.5; fl.frequency.setValueAtTime(700,t); fl.frequency.exponentialRampToValueAtTime(380,t+0.3); }
  else { fl.Q.value=4; fl.frequency.setValueAtTime(1300,t); fl.frequency.exponentialRampToValueAtTime(200,t+0.11); }
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime((kind==='acid'?0.26:0.36)*v,t+0.004); g.gain.setTargetAtTime(0.0001,end,0.02);
  fl.connect(g); g.connect(eOut());
  osc('sawtooth',f,t,stop,fl,kind==='reese'?-12:0); if(kind==='reese') osc('sawtooth',f,t,stop,fl,12);
  if(kind!=='acid'){ const sg=ctx.createGain(); sg.gain.value=0.45; sg.connect(g); osc('sine',f/2,t,stop,sg); }
}
// Synth-Leads: supersaw (Trance), hoover (rau, verzerrt), acidlead, pluck (kurz, für Arpeggios)
function sLead(t,d,f,v,kind,out){
  const ctx=A.ctx, g=ctx.createGain(), fl=ctx.createBiquadFilter(); fl.type='lowpass';
  const pl=kind==='pluck', end=t+Math.max(0.05,d), rel=pl?0.1:0.08, stop=end+rel+0.25;
  const cut={supersaw:3600,hoover:3000,acidlead:2200,pluck:3400}[kind]||3000;
  fl.Q.value=kind==='acidlead'?7:0.8;
  fl.frequency.setValueAtTime(cut*1.5,t); fl.frequency.exponentialRampToValueAtTime(pl?420:cut,t+(pl?0.22:0.1));
  const pk=(pl?0.24:kind==='hoover'?0.17:0.16)*v;
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(pk,t+0.006);
  if(pl) g.gain.setTargetAtTime(0.0001,t+0.015,Math.min(0.22,d*0.45+0.04)); else g.gain.setTargetAtTime(0.0001,end,rel/3);
  let into=fl;
  if(kind==='hoover'){ const ws=ctx.createWaveShaper(); ws.curve=eCurve(); const pre=ctx.createGain(); pre.gain.value=0.7; pre.connect(ws); ws.connect(fl); into=pre; }
  fl.connect(g); g.connect(out||A.lead);
  if(kind==='supersaw'||kind==='hoover'){ [-16,0,15].forEach(dt=>osc('sawtooth',f,t,stop,into,dt)); if(kind==='hoover') osc('square',f/2,t,stop,into); }
  else if(kind==='acidlead') osc('sawtooth',f,t,stop,into);
  else { osc('sawtooth',f,t,stop,into,-6); osc('square',f,t,stop,into,6); }
}
function sPad(t,d,notes,v){
  const ctx=A.ctx, g=ctx.createGain(), fl=ctx.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=950; fl.Q.value=0.6;
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.045*v,t+Math.min(0.35,d*0.3)); g.gain.setTargetAtTime(0.0001,t+d,0.12);
  fl.connect(g); g.connect(eOut()); sendTo(g,0.5);
  notes.forEach(m=>{ const f=mtof(m); osc('sawtooth',f,t,t+d+0.6,fl,-10); osc('sawtooth',f,t,t+d+0.6,fl,10); });
}
function sStab(t,notes,v){
  const ctx=A.ctx, g=ctx.createGain(), fl=ctx.createBiquadFilter(); fl.type='lowpass'; fl.Q.value=3.5;
  fl.frequency.setValueAtTime(3400,t); fl.frequency.exponentialRampToValueAtTime(500,t+0.16);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.075*v,t+0.004); g.gain.setTargetAtTime(0.0001,t+0.09,0.05);
  fl.connect(g); g.connect(eOut()); sendTo(g,0.35);
  notes.forEach(m=>{ const f=mtof(m); osc('sawtooth',f,t,t+0.5,fl,-7); osc('square',f,t,t+0.5,fl,7); });
}
Object.assign(LEAD,{ supersaw:(t,d,f,v,o)=>sLead(t,d,f,v,'supersaw',o), hoover:(t,d,f,v,o)=>sLead(t,d,f,v,'hoover',o), acidlead:(t,d,f,v,o)=>sLead(t,d,f,v,'acidlead',o), pluck:(t,d,f,v,o)=>sLead(t,d,f,v,'pluck',o) });
Object.assign(BASS,{ rolling:(t,d,f,v)=>sBass(t,d,f,v,'rolling'), reese:(t,d,f,v)=>sBass(t,d,f,v,'reese'), acid:(t,d,f,v)=>sBass(t,d,f,v,'acid') });
const E_LEADS=['supersaw','hoover','acidlead','pluck'];

// ---------- Musikstil umschalten: Elektro (neu) oder Band (alt) ----------
const SONG_KEYS=['style','lead','bass','pad','orch','oct','bpm'];
function applyMusicStyle(){
  const elek=SETTINGS.musicStyle!=='band';
  for(const s of SONGS){
    if(s.custom) continue;
    if(!s.band){ s.band={}; for(const k of SONG_KEYS) s.band[k]=s[k]; }
    const src=Object.assign({},s.band, elek&&s.elektro?s.elektro:{});
    for(const k of SONG_KEYS) s[k]=src[k];
    delete s._p;
    if(elek && s.elektro && s.elektro.oct===undefined){ // Melodie in eine tiefere, vollere Lage schieben
      const P=prepareSong(s); const mean=P.mel.notes.reduce((a,n)=>a+n.midi,0)/P.mel.notes.length;
      s.oct=(s.oct||0)+12*Math.round((64-mean)/12); delete s._p; }
  }
}
