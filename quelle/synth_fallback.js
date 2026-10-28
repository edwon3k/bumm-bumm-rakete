// ---------- Instrumente: gezupfte Saiten (Karplus-Strong), Bläser, Orgel, E-Piano ----------
const KS={};
function ksBuf(midi,kind){
  const key=kind+midi; if(KS[key]) return KS[key];
  const sr=A.ctx.sampleRate, f=mtof(midi), N=Math.max(2,Math.round(sr/f-0.5));
  const dur= kind==='bass'||kind==='slap'?1.8 : kind==='clean'?1.4 : 2.8;
  const len=Math.round(sr*dur), out=new Float32Array(len), dl=new Float32Array(N);
  for(let i=0;i<N;i++) dl[i]=Math.random()*2-1;
  const smooth = kind==='bass'?4 : kind==='clean'?1 : kind==='slap'?0 : 1;
  for(let r=0;r<smooth;r++) for(let i=0;i<N;i++) dl[i]=(dl[i]+dl[(i+1)%N])*0.5;
  let mean=0; for(let i=0;i<N;i++) mean+=dl[i]; mean/=N; for(let i=0;i<N;i++) dl[i]-=mean;
  const decay = kind==='bass'?0.9975 : kind==='slap'?0.996 : kind==='dist'?0.9995 : 0.996;
  let idx=0, pk=1e-6;
  for(let i=0;i<len;i++){ const a=dl[idx], nx=dl[(idx+1)%N]; out[i]=a; dl[idx]=decay*(a+nx)*0.5; idx=(idx+1)%N; const v=Math.abs(a); if(v>pk) pk=v; }
  for(let i=0;i<len;i++) out[i]/=pk;
  const b=A.ctx.createBuffer(1,len,sr); b.getChannelData(0).set(out);
  return KS[key]={b,rate:f/(sr/(N+0.5)),dur};
}
function synKsPlay(t,midi,kind,dur,gain,dest,vib){
  const k=ksBuf(midi,kind); const s=A.ctx.createBufferSource(); s.buffer=k.b; s.playbackRate.value=k.rate;
  const g=A.ctx.createGain(); g.gain.setValueAtTime(gain,t); g.gain.setTargetAtTime(0.0001,t+Math.max(0.01,dur),0.03);
  s.connect(g); g.connect(dest); s.start(t); s.stop(Math.min(t+k.dur,t+dur+0.25));
  if(vib && dur>0.3){ const l=A.ctx.createOscillator(); l.frequency.value=5.6; const lg=A.ctx.createGain(); lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(k.rate*0.012,t+Math.min(dur,0.6)); l.connect(lg); lg.connect(s.playbackRate); l.start(t); l.stop(t+dur+0.3); }
  return s;
}
// Gitarrenverstärker (Verzerrer + Box), einmal pro Musikbus
function ampChain(dest,drive){
  const inp=A.ctx.createGain(); inp.gain.value=drive;
  const hp=A.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=90;
  const ws=A.ctx.createWaveShaper(); ws.curve=A.ampCurve; ws.oversample='4x';
  const mid=A.ctx.createBiquadFilter(); mid.type='peaking'; mid.frequency.value=1600; mid.gain.value=4; mid.Q.value=0.8;
  const sc=A.ctx.createBiquadFilter(); sc.type='peaking'; sc.frequency.value=500; sc.gain.value=-4; sc.Q.value=1;
  const cab=A.ctx.createBiquadFilter(); cab.type='lowpass'; cab.frequency.value=4300; cab.Q.value=0.9;
  const cab2=A.ctx.createBiquadFilter(); cab2.type='lowpass'; cab2.frequency.value=6500;
  const out=A.ctx.createGain(); out.gain.value=0.22;
  inp.connect(hp); hp.connect(ws); ws.connect(sc); sc.connect(mid); mid.connect(cab); cab.connect(cab2); cab2.connect(out); out.connect(dest);
  return inp;
}
function amp(){ if(A.ampFor!==A.music){ A.ampIn=ampChain(A.music,1.6); A.ampFor=A.music; } return A.ampIn; }
function leadAmp(){ if(A.leadAmpFor!==A.lead){ A.leadAmpIn=ampChain(A.lead,2.2); A.leadAmpFor=A.lead; } return A.leadAmpIn; }

function brassVoice(t,d,f,v,out,detC,bright){
  const short=d<0.2;
  const g=gainEnv(t,d,0.05*v*(short?1.4:1),0.03,0.12,0.85,out); const fl=lp(500,1.4,g);
  fl.frequency.setValueAtTime(450,t); fl.frequency.linearRampToValueAtTime(900+2600*v*bright,t+0.045); fl.frequency.setTargetAtTime(700+1500*v*bright,t+0.05,0.25);
  const e=t+d+0.18;
  const o1=osc('sawtooth',f,t,e,fl,detC), o2=short?null:osc('sawtooth',f,t,e,fl,-detC);
  [o1,o2].forEach(o=>{ if(!o) return; o.detune.setValueAtTime(-35,t); o.detune.linearRampToValueAtTime(detC*(o===o1?1:-1),t+0.05); });
  if(d>0.3){ const l=A.ctx.createOscillator(); l.frequency.value=5.4; const lg=A.ctx.createGain(); lg.gain.setValueAtTime(0,t+0.2); lg.gain.linearRampToValueAtTime(10,t+Math.min(d,0.7)); l.connect(lg); lg.connect(o1.detune); if(o2) lg.connect(o2.detune); l.start(t); l.stop(e); }
  // Atemgeräusch
  if(short && bright<1) return;
  const ng=gainEnv(t,0.04,0.012*v,0.01,0.05,1,out); const bp=A.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2200; bp.Q.value=1; bp.connect(ng); noiseSrc(t,0.08,bp);
}
const SYN_LEAD = {
  brass(t,d,f,v,out){ brassVoice(t,d,f,v,out,6,1); if(d>0.16) brassVoice(t,d,f/2,v*0.55,out,4,0.6); },   // Trompete + Posaune
  guitar(t,d,f,v,out){ const m=Math.round(69+12*Math.log2(f/440)); synKsPlay(t,m,'dist',d+0.05,0.9*v,leadAmp(),true); synKsPlay(t,m-12,'dist',d+0.05,0.35*v,leadAmp(),false); },
  organ(t,d,f,v,out){
    const g=gainEnv(t,d,0.075*v,0.004,0.08,1,out);
    const trem=A.ctx.createGain(); trem.gain.value=0.8; trem.connect(g);
    const l=A.ctx.createOscillator(); l.frequency.value=6.6; const lg=A.ctx.createGain(); lg.gain.value=0.2; l.connect(lg); lg.connect(trem.gain);
    const e=t+d+0.15; osc('organ',f,t,e,trem,3); osc('organ',f,t,e,trem,-3); osc('sine',f/2,t,e,trem); l.start(t); l.stop(e);
    const pg=gainEnv(t,0.01,0.05*v,0.001,0.15,1,out); osc('sine',f*3,t,t+0.25,pg);   // Perkussion
  },
  ep(t,d,f,v,out){
    const dur=Math.max(d,0.4)+0.9;
    const g=A.ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.11*v,t+0.004); g.gain.setTargetAtTime(0.0001,t+0.02,dur/3.5); g.connect(out);
    const c=osc('sine',f,t,t+dur,g);
    const m=A.ctx.createOscillator(); m.frequency.value=f; const mg=A.ctx.createGain(); mg.gain.setValueAtTime(f*(1.2+1.6*v),t); mg.gain.setTargetAtTime(f*0.25,t,0.25);
    m.connect(mg); mg.connect(c.frequency); m.start(t); m.stop(t+dur);
    const tg=gainEnv(t,0.02,0.018*v,0.001,0.25,1,out); osc('sine',f*7.1,t,t+0.3,tg);   // Klangzunge
  },
  bell(t,d,f,v,out){
    const dur=Math.max(d,0.5)+0.6;
    const g=A.ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.12*v,t+0.003); g.gain.setTargetAtTime(0.0001,t+0.01,dur/4); g.connect(out);
    const c=osc('sine',f,t,t+dur,g);
    const m=A.ctx.createOscillator(); m.frequency.value=f*3.5; const mg=A.ctx.createGain(); mg.gain.setValueAtTime(f*2.2,t); mg.gain.setTargetAtTime(f*0.2,t,0.15);
    m.connect(mg); mg.connect(c.frequency); m.start(t); m.stop(t+dur);
  },
  strings(t,d,f,v,out){
    const g=gainEnv(t,d,0.03*v,0.05,0.25,0.9,out); const fl=lp(3000,0.7,g);
    const l=A.ctx.createOscillator(); l.frequency.value=5.8; const lg=A.ctx.createGain(); lg.gain.value=f*0.006; l.connect(lg);
    const e=t+d+0.4; [-9,-3,3,9].forEach(dt=>{ const o=osc('sawtooth',f,t,e,fl,dt); lg.connect(o.frequency); }); l.start(t); l.stop(e);
  },
};
const SYN_BASS = {
  bass(t,d,f,v,out){ const m=Math.round(69+12*Math.log2(f/440)); synKsPlay(t,m,'bass',d,0.55*v,synBassOut(),false); const g=gainEnv(t,d,0.09*v,0.006,0.06,0.8,out); osc('sine',f,t,t+d+0.2,g); },
  pick(t,d,f,v,out){ const m=Math.round(69+12*Math.log2(f/440)); synKsPlay(t,m,'slap',d,0.42*v,synBassOut(),false); const g=gainEnv(t,d,0.09*v,0.004,0.05,0.8,out); osc('sine',f,t,t+d+0.2,g); },
  slap(t,d,f,v,out){ const m=Math.round(69+12*Math.log2(f/440)); synKsPlay(t,m,'slap',Math.min(d,0.22),0.7*v,synBassOut(),false); const g=gainEnv(t,Math.min(d,0.22),0.1*v,0.003,0.05,0.7,out); osc('sine',f,t,t+0.4,g); },
};
function synBassOut(){ if(A.bassFor!==A.music){ const f=lp(2200,0.8,A.music); const c=A.ctx.createGain(); c.gain.value=1; c.connect(f); A.bassIn=c; A.bassFor=A.music; } return A.bassIn; }
// --- Schlagzeug, das nach Studio klingt ---
const SYN_DRUM = {
  kick(t,v=1){ const g=A.ctx.createGain(); g.gain.setValueAtTime(1.0*v,t); g.gain.setTargetAtTime(0.0001,t+0.05,0.09); g.connect(A.drums);
    const o=osc('sine',150,t,t+0.5,g); o.frequency.exponentialRampToValueAtTime(52,t+0.07);
    const cg=gainEnv(t,0.003,0.35*v,0.0005,0.012,1,A.drums); const hp=A.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=3500; hp.connect(cg); noiseSrc(t,0.02,hp);
    const bg=gainEnv(t,0.01,0.25*v,0.001,0.04,1,A.drums); osc('triangle',1800,t,t+0.03,lp(3000,1,bg)); },
  snare(t,v=1){
    const sg=gainEnv(t,0.01,0.32*v,0.001,0.1,1,A.drums); osc('triangle',185,t,t+0.15,sg); osc('triangle',332,t,t+0.12,sg);
    const g=A.ctx.createGain(); g.gain.setValueAtTime(0.5*v,t); g.gain.setTargetAtTime(0.0001,t+0.01,0.06+0.03*v); g.connect(A.drums);
    const hp=A.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1400; const pk=A.ctx.createBiquadFilter(); pk.type='peaking'; pk.frequency.value=5000; pk.gain.value=5; hp.connect(pk); pk.connect(g); noiseSrc(t,0.35,hp); },
  rim(t,v=1){ const g=gainEnv(t,0.004,0.3*v,0.0005,0.03,1,A.drums); const bp=A.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1700; bp.Q.value=5; bp.connect(g); osc('triangle',1700,t,t+0.04,bp); noiseSrc(t,0.02,bp); },
  clap(t,v=1){ const g=A.ctx.createGain(); g.connect(A.drums); const bp=A.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1300; bp.Q.value=1.2; bp.connect(g);
    g.gain.setValueAtTime(0,t); [0,0.011,0.022].forEach(o=>{ g.gain.setValueAtTime(0.5*v,t+o); g.gain.exponentialRampToValueAtTime(0.06,t+o+0.009); });
    g.gain.setValueAtTime(0.35*v,t+0.033); g.gain.exponentialRampToValueAtTime(0.001,t+0.22); noiseSrc(t,0.25,bp); },
  hat(t,v=1,open){ const len=open?0.35:0.05; const g=A.ctx.createGain(); g.gain.setValueAtTime(0.2*v,t); g.gain.setTargetAtTime(0.0001,t+0.002,len/3); g.connect(A.drums);
    const bp=A.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=10000; bp.Q.value=0.8; const hp=A.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=7000; bp.connect(hp); hp.connect(g);
    metalSrc(t,len+0.1,bp); },
  ride(t,v=1){ const g=A.ctx.createGain(); g.gain.setValueAtTime(0.11*v,t); g.gain.setTargetAtTime(0.0001,t+0.003,0.35); g.connect(A.drums);
    const bp=A.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=6000; bp.Q.value=1.5; bp.connect(g); metalSrc(t,1.2,bp,0.85); },
  crash(t,v=1){ const g=A.ctx.createGain(); g.gain.setValueAtTime(0.2*v,t); g.gain.setTargetAtTime(0.0001,t+0.01,0.7); g.connect(A.drums);
    const hp=A.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=3200; hp.connect(g); metalSrc(t,2.4,hp,0.7); noiseSrc(t,2.4,hp,0.9); },
  tamb(t,v=1){ const g=A.ctx.createGain(); g.gain.setValueAtTime(0.12*v,t); g.gain.setTargetAtTime(0.0001,t+0.005,0.04); g.connect(A.drums);
    const hp=A.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=6500; hp.connect(g); metalSrc(t,0.2,hp,1.6); noiseSrc(t,0.2,hp); },
  conga(t,v=1,hi){ const f=hi?330:220; const g=A.ctx.createGain(); g.gain.setValueAtTime(0.4*v,t); g.gain.setTargetAtTime(0.0001,t+0.01,0.08); g.connect(A.drums);
    const o=osc('sine',f*1.15,t,t+0.3,g); o.frequency.exponentialRampToValueAtTime(f,t+0.03); },
  tom(t,v=1,f=150){ const g=A.ctx.createGain(); g.gain.setValueAtTime(0.6*v,t); g.gain.setTargetAtTime(0.0001,t+0.02,0.12); g.connect(A.drums);
    const o=osc('sine',f*1.5,t,t+0.5,g); o.frequency.exponentialRampToValueAtTime(f,t+0.08); const ng=gainEnv(t,0.01,0.1*v,0.001,0.05,1,A.drums); noiseSrc(t,0.06,lp(2500,1,ng)); },
  cannon(t,v=1){ const g=A.ctx.createGain(); g.gain.setValueAtTime(1.1*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+1.6); g.connect(A.drums);
    const f=lp(380,0.8,g); noiseSrc(t,1.7,f,0.5);
    const g2=A.ctx.createGain(); g2.gain.setValueAtTime(0.9*v,t); g2.gain.exponentialRampToValueAtTime(0.001,t+0.9); g2.connect(A.drums);
    const o=osc('sine',90,t,t+1,g2); o.frequency.exponentialRampToValueAtTime(28,t+0.6); },
  riser(t,dur){ const g=A.ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.14,t+dur); g.gain.linearRampToValueAtTime(0,t+dur+0.05); g.connect(A.drums);
    const bp=A.ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=3; bp.frequency.setValueAtTime(400,t); bp.frequency.exponentialRampToValueAtTime(7000,t+dur); bp.connect(g); noiseSrc(t,dur+0.1,bp); },
  timpani(t,v=1,f=55){ const g=A.ctx.createGain(); g.gain.setValueAtTime(0.8*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+1.4); g.connect(A.drums);
    const o=osc('sine',f*1.08,t,t+1.5,g); o.frequency.exponentialRampToValueAtTime(f,t+0.15); osc('sine',f*1.5,t,t+1.0,g);
    const ng=A.ctx.createGain(); ng.gain.setValueAtTime(0.35*v,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.12); ng.connect(A.drums); noiseSrc(t,0.15,lp(500,1,ng)); },
};
function metalSrc(t,dur,dest,rate){ const s=A.ctx.createBufferSource(); s.buffer=A.metal; if(rate) s.playbackRate.value=rate; s.connect(dest); s.start(t,Math.random()*1.2); s.stop(t+dur); return s; }
function synStrings(t,d,notes,v){
  for(const m of notes){ const f=mtof(m);
    const g=gainEnv(t,d,0.018*v,0.3,0.8,0.95,A.music); const fl=lp(2600,0.6,g);
    const vib=A.ctx.createOscillator(); vib.frequency.value=5.2; const vg=A.ctx.createGain(); vg.gain.value=f*0.004; vib.connect(vg);
    const e=t+d+1.0; [-7,7].forEach(dt=>{ const o=osc('sawtooth',f,t,e,fl,dt); vg.connect(o.frequency); }); vib.start(t); vib.stop(e);
  }
}
function synChoir(t,d,notes,v){
  for(const m of notes){ const f=mtof(m);
    const g=gainEnv(t,d,0.045*v,0.5,1,1,A.music);
    const f1=A.ctx.createBiquadFilter(); f1.type='bandpass'; f1.frequency.value=750; f1.Q.value=7; f1.connect(g);
    const f2=A.ctx.createBiquadFilter(); f2.type='bandpass'; f2.frequency.value=1150; f2.Q.value=9; f2.connect(g);
    const e=t+d+1.3; [-8,0,8].forEach(dt=>{ const o=osc('sawtooth',f,t,e,f1,dt); o.connect(f2); });
  }
}
// --- Begleitung ---
const SYN_COMP = {
  power(t,d,root,v,mute){ const dest=amp(); [0,7,12].forEach((iv,i)=>synKsPlay(t+i*0.004,root+iv,'dist',mute?Math.min(d,0.09):d,(mute?0.5:0.75)*v,dest,false)); },
  skank(t,notes,v){ notes.forEach((m,i)=>synKsPlay(t+(notes.length-1-i)*0.006,m,'clean',0.08,0.4*v,A.music,false)); },
  scratch(t,v){ const g=gainEnv(t,0.02,0.05*v,0.001,0.02,1,A.music); const bp=A.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2500; bp.Q.value=2; bp.connect(g); noiseSrc(t,0.04,bp); },
  organBubble(t,notes,v){ notes.forEach(m=>{ const f=mtof(m); const g=gainEnv(t,0.06,0.03*v,0.003,0.05,1,A.music); osc('organ',f,t,t+0.15,g); }); },
  brassStab(t,notes,v,fall){ notes.forEach(m=>{ const f=mtof(m); const g=gainEnv(t,0.1,0.04*v,0.012,0.08,0.7,A.music); const fl=lp(800,1.2,g); fl.frequency.setValueAtTime(700,t); fl.frequency.linearRampToValueAtTime(3500,t+0.03); fl.frequency.setTargetAtTime(1200,t+0.04,0.06);
    const e=t+0.3; [-6,6].forEach(dc=>{ const o=osc('sawtooth',f,t,e,fl,dc); if(fall){ o.detune.setValueAtTime(dc,t+0.09); o.detune.linearRampToValueAtTime(dc-250,t+0.25); } }); }); },
  epChord(t,d,notes,v){ notes.forEach(m=>SYN_LEAD.ep(t,d,mtof(m),0.45*v,A.music)); },
};
