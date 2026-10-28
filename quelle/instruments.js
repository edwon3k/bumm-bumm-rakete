// ===== Echte Instrumente: aufgenommene Samples (FluidR3 GM, MIT-Lizenz) statt Synthesizer =====
const SMP_META={"trumpet":{"notes":[52,55,58,61,64,67,70,73,76,79,82,85],"slot":2.4,"t0":0.5},"trombone":{"notes":[40,43,46,49,52,55,58,61,64,67,70],"slot":2.4,"t0":0.5},"brass":{"notes":[48,51,54,57,60,63,66,69,72,75,78,81],"slot":1.4,"t0":0.5},"odgtr":{"notes":[40,43,46,49,52,55,58,61,64,67,70,73,76,79,82,85,88],"slot":2.8,"t0":0.5},"distgtr":{"notes":[40,43,46,49,52,55,58,61,64,67,70,73,76],"slot":2.5,"t0":0.5},"mutegtr":{"notes":[40,43,46,49,52,55,58,61,64,67,70,73,76],"slot":0.7,"t0":0.5},"cleangtr":{"notes":[52,55,58,61,64,67,70,73,76,79,82],"slot":1.9,"t0":0.5},"fbass":{"notes":[28,31,34,37,40,43,46,49,52,55,58],"slot":1.8,"t0":0.5},"pbass":{"notes":[28,31,34,37,40,43,46,49,52,55,58],"slot":1.6,"t0":0.5},"slap":{"notes":[28,31,34,37,40,43,46,49,52,55,58],"slot":1.1,"t0":0.5},"organ":{"notes":[43,46,49,52,55,58,61,64,67,70,73,76,79,82,85,88],"slot":2.5,"t0":0.5},"ep":{"notes":[45,48,51,54,57,60,63,66,69,72,75,78,81,84,87],"slot":2.8,"t0":0.5},"strings":{"notes":[36,39,42,45,48,51,54,57,60,63,66,69,72,75,78,81,84,87],"slot":3.8,"t0":0.5},"choir":{"notes":[48,51,54,57,60,63,66,69,72,75,78],"slot":3.8,"t0":0.5},"celesta":{"notes":[60,63,66,69,72,75,78,81,84,87,90,93,96],"slot":2.0,"t0":0.5},"timpani":{"notes":[36,39,42,45,48,51,54,57],"slot":2.4,"t0":0.5},"drums":{"names":["kick","kick2","snare","snareS","ghost","rim","clap","hat","hatS","pedal","ohat","crash","crash2","ride","bell","tamb","congaH","congaL","tomH","tomM","tomL","tomF","cowbell","splash","shaker"],"slot":1.6,"t0":0.5},"fx":{"names":["c00","c01","c04","c05","c06","c08","c09","c12","c03","c10","rise","thump"],"slot":2.6,"t0":0.5}};
const SMP={buf:{}, d0:{}, loading:{}};
const mFromF=f=>69+12*Math.log2(f/440);
function smpLoad(name){
  if(SMP.buf[name]) return Promise.resolve(true);
  if(SMP.loading[name]) return SMP.loading[name];
  audioInit();
  const emb=window.SMP_EMBED&&window.SMP_EMBED[name];
  const src= emb ? Promise.resolve().then(()=>{ const bin=atob(emb); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u.buffer; })
                 : fetch('samples/'+name+'.mp3').then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
  return SMP.loading[name]=src
    .then(b=>new Promise((res,rej)=>A.ctx.decodeAudioData(b,res,rej)))
    .then(buf=>{ // MP3-Vorlauf messen: erster Ton beginnt nach t0 Sekunden Stille
      const d=buf.getChannelData(0), sr=buf.sampleRate, t0=SMP_META[name].t0; let pk=0; const e=Math.min(d.length,Math.floor((t0+0.3)*sr));
      for(let i=0;i<e;i++) pk=Math.max(pk,Math.abs(d[i])); let s=0; for(let i=0;i<e;i++){ if(Math.abs(d[i])>pk*0.03){ s=i; break; } }
      SMP.d0[name]=Math.max(0,s/sr-t0-0.0015); SMP.buf[name]=buf; return true; })
    .catch(err=>{ console.warn('Sample fehlt',name,err); delete SMP.loading[name]; return false; });
}
function smpNeeded(song){
  const s=new Set(['drums','fx']);
  if(!song || song.custom) return ['fx'];
  const L={brass:['trumpet','trombone'],guitar:['odgtr'],organ:['organ'],ep:['ep'],bell:['celesta'],strings:['strings']}[song.lead]||[];
  L.forEach(x=>s.add(x));
  s.add(({bass:'fbass',walk:'fbass',pick:'pbass',slap:'slap',octave:'slap'})[song.bass]||'fbass');
  (({power:['distgtr','mutegtr','cleangtr'],skank:['cleangtr','organ','brass'],brass:['brass','mutegtr'],chicken:['mutegtr','cleangtr','brass'],ep:['ep'],arp:['ep']})[song.pad]||[]).forEach(x=>s.add(x));
  if(song.orch){ s.add('strings'); s.add('timpani'); if(song.orch==='full') s.add('choir'); }
  s.add('ep'); s.add('timpani');
  return [...s];
}
function smpEnsure(song){ return Promise.all(smpNeeded(song).map(smpLoad)); }
// Ein Ton aus einem Instrument: nächstliegendes Sample, per Abspielrate auf die Tonhöhe gezogen
function splay(name,t,midi,dur,vel,dest,o){
  const buf=SMP.buf[name]; if(!buf||!A.ctx) return null; o=o||{};
  const m=SMP_META[name]; let bi=0,bd=99; for(let i=0;i<m.notes.length;i++){ const dd=Math.abs(midi-m.notes[i]); if(dd<bd){ bd=dd; bi=i; } }
  const rate=Math.pow(2,(midi-m.notes[bi])/12)*(o.rate||1);
  const off=SMP.d0[name]+m.t0+bi*m.slot, avail=(m.slot-0.08)/rate;
  const rel=o.rel||0.1, len=Math.max(0.02,Math.min(dur,avail-rel));
  const s=A.ctx.createBufferSource(); s.buffer=buf; s.playbackRate.value=rate;
  const g=A.ctx.createGain(); const p=g.gain;
  if(o.att){ p.setValueAtTime(0.0001,t); p.linearRampToValueAtTime(vel,t+o.att); } else p.setValueAtTime(vel,t);
  p.setValueAtTime(vel,t+Math.max(len,o.att||0)); p.setTargetAtTime(0.0001,t+Math.max(len,o.att||0),rel/3);
  s.connect(g); g.connect(dest); s.start(t,off,m.slot-0.08); s.stop(t+len+rel*2.5);
  return s;
}
function dplay(name,t,vel,dest,rate){
  const buf=SMP.buf.drums; if(!buf||!A.ctx) return null; const m=SMP_META.drums; const i=m.names.indexOf(name); if(i<0) return null;
  const s=A.ctx.createBufferSource(); s.buffer=buf; if(rate) s.playbackRate.value=rate;
  const g=A.ctx.createGain(); g.gain.value=vel; s.connect(g); g.connect(dest||A.drums);
  s.start(t,SMP.d0.drums+m.t0+i*m.slot,m.slot-0.1); return s;
}
function fxplay(name,t,vel,dest,rate,maxLen){
  const buf=SMP.buf.fx; if(!buf||!A.ctx) return null; const m=SMP_META.fx; const i=m.names.indexOf(name); if(i<0) return null;
  const s=A.ctx.createBufferSource(); s.buffer=buf; if(rate) s.playbackRate.value=rate;
  const g=A.ctx.createGain(); g.gain.value=vel; s.connect(g); g.connect(dest||A.sfx);
  const L=maxLen||(m.slot-0.1); s.start(t,SMP.d0.fx+m.t0+i*m.slot,L); return {s,g};
}
// Abwärtskompatibel für das Arrangement (gezupfte Akkordtöne im Break)
function ksPlay(t,midi,kind,dur,gain,dest){ if(!has('cleangtr')) return synKsPlay(t,midi,kind,dur,gain,dest,false); return splay(kind==='dist'?'odgtr':'cleangtr',t,midi,dur,gain*1.4,dest,{rel:0.25}); }

// Falls Samples nicht laden: Synthesizer-Ersatz
const has=n=>!!SMP.buf[n];
const LEAD = {
  brass(t,d,f,v,out){ if(!has('trumpet')) return SYN_LEAD.brass(t,d,f,v,out); const m=mFromF(f); splay('trumpet',t,m,d,0.55*v,out,{rel:0.12}); if(d>0.16) splay('trombone',t,m-12,d,0.32*v,out,{rel:0.12}); },
  guitar(t,d,f,v,out){ if(!has('odgtr')) return SYN_LEAD.guitar(t,d,f,v,out); splay('odgtr',t,mFromF(f),d+0.05,0.5*v,out,{rel:0.15}); },
  organ(t,d,f,v,out){ if(!has('organ')) return SYN_LEAD.organ(t,d,f,v,out); splay('organ',t,mFromF(f),d,0.55*v,out,{rel:0.06}); },
  ep(t,d,f,v,out){ if(!has('ep')) return SYN_LEAD.ep(t,d,f,v,out); splay('ep',t,mFromF(f),Math.max(d,0.35)+0.4,0.7*v,out,{rel:0.35}); },
  bell(t,d,f,v,out){ if(!has('celesta')) return SYN_LEAD.bell(t,d,f,v,out); splay('celesta',t,mFromF(f),Math.max(d,0.5)+0.5,0.6*v,out,{rel:0.4}); },
  strings(t,d,f,v,out){ if(!has('strings')) return SYN_LEAD.strings(t,d,f,v,out); splay('strings',t,mFromF(f),d,0.55*v,out,{att:0.04,rel:0.25}); },
};
const BASS = {
  bass(t,d,f,v,out){ if(!has('fbass')) return SYN_BASS.bass(t,d,f,v,out); splay('fbass',t,mFromF(f),d,0.8*v,out,{rel:0.06}); },
  pick(t,d,f,v,out){ if(!has('pbass')) return SYN_BASS.pick(t,d,f,v,out); splay('pbass',t,mFromF(f),d,0.8*v,out,{rel:0.05}); },
  slap(t,d,f,v,out){ if(!has('slap')) return SYN_BASS.slap(t,d,f,v,out); splay('slap',t,mFromF(f),Math.min(d,0.3),0.9*v,out,{rel:0.05}); },
};
function bassOut(){ return A.music; }
let DRUMKIT='rock';
const DRUM_S = {
  kick(t,v=1){ dplay(DRUMKIT==='rock'?'kick':'kick2',t,1.0*v); },
  snare(t,v=1){ if(v<0.45) dplay('ghost',t,1.4*v); else dplay(DRUMKIT==='rock'?'snare':'snareS',t,0.72*v); },
  rim(t,v=1){ dplay('rim',t,0.8*v); },
  clap(t,v=1){ dplay('clap',t,0.7*v); },
  hat(t,v=1,open){ if(open) dplay('ohat',t,0.9*v); else dplay(v<0.5?'hatS':'hat',t,(v<0.5?1.6:1.0)*Math.max(v,0.3)); },
  ride(t,v=1){ dplay('ride',t,0.8*v); },
  crash(t,v=1){ dplay(Math.random()<0.5?'crash':'crash2',t,0.75*v); },
  tamb(t,v=1){ dplay('tamb',t,0.55*v); },
  conga(t,v=1,hi){ dplay(hi?'congaH':'congaL',t,0.8*v); },
  tom(t,v=1,f=150){ dplay(f>185?'tomH':f>150?'tomM':f>120?'tomL':'tomF',t,0.75*v); },
  cannon(t,v=1){ // Kanonenschlag: tiefe Pauke + echter Feuerwerksknall + Subbass
    if(SMP.buf.timpani) splay('timpani',t,38,1.5,1.0*v,A.drums,{rel:0.5});
    fxplay('c12',t,0.7*v,A.drums,0.85);
    const g=A.ctx.createGain(); g.gain.setValueAtTime(0.7*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.8); g.connect(A.drums);
    const o=osc('sine',80,t,t+0.9,g); o.frequency.exponentialRampToValueAtTime(30,t+0.6); },
  riser(t,dur){ const r=Math.max(0.5,Math.min(2.5,1.6/Math.max(0.2,dur))); const x=fxplay('rise',t,0.35,A.drums,r,1.65); if(!x){ return; } },
  timpani(t,v=1,f=55){ if(SMP.buf.timpani) splay('timpani',t,mFromF(f),1.4,0.9*v,A.drums,{rel:0.5}); else SYN_DRUM.timpani(t,v,f); },
};
const DRUM = new Proxy(DRUM_S,{ get:(o,k)=> (DRUMKIT[0]==='e' && EDRUM[k]) ? EDRUM[k] : (k==='cannon'||k==='riser') ? (has('fx')||k==='cannon'?o[k]:SYN_DRUM[k]) : (has('drums')||!SYN_DRUM[k] ? o[k] : SYN_DRUM[k]) });
function strings(t,d,notes,v){ if(!has('strings')) return synStrings(t,d,notes,v); notes.forEach(m=>splay('strings',t,m,d,0.24*v,A.music,{att:0.18,rel:0.5})); }
function choir(t,d,notes,v){ if(!has('choir')) return synChoir(t,d,notes,v); notes.forEach(m=>splay('choir',t,m,d,0.28*v,A.music,{att:0.25,rel:0.6})); }
// --- Begleitung ---
const COMP = {
  power(t,d,root,v,mute){ if(!has('distgtr')) return SYN_COMP.power(t,d,root,v,mute);
    if(mute){ [0,7].forEach((iv,i)=>splay('mutegtr',t+i*0.003,root+iv,Math.min(d,0.2),0.5*v,A.music,{rel:0.04})); }
    else [0,7,12].forEach((iv,i)=>splay('distgtr',t+i*0.006,root+iv,d,0.32*v,A.music,{rel:0.12})); },
  skank(t,notes,v){ if(!has('cleangtr')) return SYN_COMP.skank(t,notes,v); notes.forEach((m,i)=>splay('cleangtr',t+(notes.length-1-i)*0.007,m,0.13,0.42*v,A.music,{rel:0.05})); },
  scratch(t,v){ if(!has('mutegtr')) return SYN_COMP.scratch(t,v); [52,57,62].forEach(m=>splay('mutegtr',t,m,0.04,0.22*v,A.music,{rel:0.02})); },
  organBubble(t,notes,v){ if(!has('organ')) return SYN_COMP.organBubble(t,notes,v); notes.forEach(m=>splay('organ',t,m,0.09,0.18*v,A.music,{rel:0.04})); },
  brassStab(t,notes,v,fall){ if(!has('brass')) return SYN_COMP.brassStab(t,notes,v,fall); notes.forEach(m=>{ const s=splay('brass',t,m,fall?0.32:0.17,0.4*v,A.music,{rel:0.08}); if(s&&fall){ const r=s.playbackRate.value; s.playbackRate.setValueAtTime(r,t+0.12); s.playbackRate.exponentialRampToValueAtTime(r*0.84,t+0.34); } }); },
  epChord(t,d,notes,v){ if(!has('ep')) return SYN_COMP.epChord(t,d,notes,v); notes.forEach(m=>splay('ep',t,m,d,0.4*v,A.music,{rel:0.3})); },
};
