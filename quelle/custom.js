// ===== Eigene Lieder: Analyse, Charts, Speicher =====
function fftInPlace(re,im){
  const n=re.length;
  for(let i=1,j=0;i<n;i++){ let bit=n>>1; for(;j&bit;bit>>=1) j^=bit; j^=bit; if(i<j){ let t=re[i];re[i]=re[j];re[j]=t; t=im[i];im[i]=im[j];im[j]=t; } }
  for(let len=2;len<=n;len<<=1){
    const ang=-2*Math.PI/len, wr=Math.cos(ang), wi=Math.sin(ang);
    for(let i=0;i<n;i+=len){ let cr=1,ci=0;
      for(let k=0;k<len/2;k++){ const a=i+k,b=a+len/2; const xr=re[b]*cr-im[b]*ci, xi=re[b]*ci+im[b]*cr; re[b]=re[a]-xr; im[b]=im[a]-xi; re[a]+=xr; im[a]+=xi; const nr=cr*wr-ci*wi; ci=cr*wi+ci*wr; cr=nr; } }
  }
}
async function analyzeAudio(buf,onProgress){
  const sr=buf.sampleRate, N=1024, hop=512;
  const c0=buf.getChannelData(0), c1=buf.numberOfChannels>1?buf.getChannelData(1):null;
  const frames=Math.max(0,Math.floor((buf.length-N)/hop));
  const win=new Float32Array(N); for(let i=0;i<N;i++) win[i]=0.5-0.5*Math.cos(2*Math.PI*i/(N-1));
  const re=new Float32Array(N), im=new Float32Array(N), prev=new Float32Array(N/2), mag=new Float32Array(N/2);
  const edges=[1,Math.round(150/sr*N),Math.round(2000/sr*N),Math.min(N/2-1,Math.round(9000/sr*N))];
  const fl=[new Float32Array(frames),new Float32Array(frames),new Float32Array(frames)], cen=new Float32Array(frames);
  for(let f=0;f<frames;f++){
    const o=f*hop;
    for(let i=0;i<N;i++){ re[i]=(c1?(c0[o+i]+c1[o+i])*0.5:c0[o+i])*win[i]; im[i]=0; }
    fftInPlace(re,im);
    let cs=0,cw=0;
    for(let k=1;k<N/2;k++){ const m=Math.sqrt(re[k]*re[k]+im[k]*im[k]); mag[k]=Math.log1p(m*20); cs+=k*m; cw+=m; }
    for(let b=0;b<3;b++){ let s=0; for(let k=edges[b];k<edges[b+1];k++){ const d=mag[k]-prev[k]; if(d>0) s+=d; } fl[b][f]=s/(edges[b+1]-edges[b]); }
    cen[f]=cw>0?cs/cw:0; prev.set(mag);
    if(f%600===0){ onProgress&&onProgress(f/frames); await new Promise(r=>setTimeout(r,0)); }
  }
  // Onset-Kurve
  const env=new Float32Array(frames); const mean=b=>{ let s=0; for(const v of fl[b]) s+=v; return s/Math.max(1,frames)+1e-9; };
  const m0=mean(0),m1=mean(1),m2=mean(2);
  let emax=0; for(let f=0;f<frames;f++){ env[f]=fl[0][f]/m0*1.0+fl[1][f]/m1*0.8+fl[2][f]/m2*0.5; emax=Math.max(emax,env[f]); }
  const fps=sr/hop;
  // Tempo per Autokorrelation (70–180 BPM)
  const lo=Math.floor(fps*60/180), hi=Math.ceil(fps*60/70); let best=lo, bs=-1; const sc=[];
  let em=0; for(const v of env) em+=v; em/=Math.max(1,frames);
  for(let L=lo;L<=hi;L++){ let s=0; for(let f=0;f+L<frames;f++) s+=(env[f]-em)*(env[f+L]-em); let s2=0; for(let f=0;f+2*L<frames;f+=2) s2+=(env[f]-em)*(env[f+2*L]-em); const v=s+0.5*s2; sc[L]=v; if(v>bs){ bs=v; best=L; } }
  let Lf=best; if(sc[best-1]!==undefined&&sc[best+1]!==undefined){ const a=sc[best-1],b=sc[best],c=sc[best+1]; const d=a-2*b+c; if(d!==0) Lf=best+0.5*(a-c)/d; }
  let bpm=60*fps/Lf; while(bpm<80) bpm*=2; while(bpm>175) bpm/=2;
  const beatF=60*fps/bpm;
  // Phase des Taktes
  let bp=0,bv=-1; for(let ph=0;ph<Math.round(beatF);ph++){ let s=0; for(let x=ph;x<frames;x+=beatF) s+=env[Math.round(x)]||0; if(s>bv){ bv=s; bp=ph; } }
  // Spitzen finden
  const onsets=[]; const W2=12;
  for(let f=3;f<frames-3;f++){
    const v=env[f]; if(v<env[f-1]||v<env[f+1]||v<env[f-2]||v<env[f+2]||v<env[f-3]||v<env[f+3]) continue;
    let s=0,c=0; for(let k=Math.max(0,f-W2);k<Math.min(frames,f+W2);k++){ s+=env[k]; c++; }
    if(v<(s/c)*1.35+emax*0.04) continue;
    const bands=[fl[0][f]/m0,fl[1][f]/m1,fl[2][f]/m2]; const band=bands.indexOf(Math.max(...bands));
    onsets.push({t:(f*hop+N/2)/sr+0.004, s:v, band, cen:cen[f]});
  }
  // Globales Raster (lineare Regression) als Startwert
  let period=60/bpm, beat0=(bp*hop+N/2)/sr+0.004;
  const strong=onsets.filter(o=>o.s>emax*0.25);
  for(let it=0;it<3;it++){
    let n=0,sk=0,st=0,skk=0,skt=0;
    for(const o of strong){ const k=Math.round((o.t-beat0)/period); const e=o.t-(beat0+k*period); if(Math.abs(e)<0.06){ n++; sk+=k; st+=o.t; skk+=k*k; skt+=k*o.t; } }
    if(n<8) break; const den=n*skk-sk*sk; if(!den) break;
    const p2=(n*skt-sk*st)/den, b2=(st-p2*sk)/n; if(Math.abs(p2-period)/period>0.03) break; period=p2; beat0=b2;
  }
  while(beat0-period>=0) beat0-=period;
  // Schlagverfolgung per dynamischer Programmierung: folgt Tempo-Schwankungen im Lied
  const off=(N/2)/sr+0.004;
  const P=period*fps; let sd=0; for(const v of env) sd+=(v-em)*(v-em); sd=Math.sqrt(sd/Math.max(1,frames))+1e-9;
  const oe=new Float32Array(frames); for(let f=0;f<frames;f++) oe[f]=env[f]/sd;
  const score=new Float32Array(frames), back=new Int32Array(frames).fill(-1);
  const lo2=Math.round(P*0.5), hi2=Math.round(P*2), tight=120;
  for(let f=0;f<frames;f++){
    let best=-1e9, bi=-1;
    for(let p=Math.max(0,f-hi2); p<=f-lo2; p++){ const r=Math.log((f-p)/P); const v=score[p]-tight*r*r; if(v>best){ best=v; bi=p; } }
    if(bi>=0 && best>0){ score[f]=oe[f]+best; back[f]=bi; } else score[f]=oe[f];
    if(f%4000===0) await new Promise(r=>setTimeout(r,0));
  }
  let bl=Math.max(0,frames-Math.round(P)); for(let f=bl;f<frames;f++) if(score[f]>score[bl]) bl=f;
  const bf=[]; for(let f=bl; f>=0; f=back[f]) bf.push(f); bf.reverse();
  // Schläge auf Sub-Frame-Genauigkeit
  const raw=bf.map(f=>{ let x=f; if(f>0&&f<frames-1&&oe[f]>=oe[f-1]&&oe[f]>=oe[f+1]){ const a2=oe[f-1],b2=oe[f],c2=oe[f+1],d=a2-2*b2+c2; if(d<0) x=f+Math.max(-0.5,Math.min(0.5,0.5*(a2-c2)/d)); } return x/fps+off; });
  // Lücken (Pausen im Lied) mit dem Raster auffüllen, Anfang und Ende ergänzen
  const beats=[]; const per=period;
  if(raw.length<4){ for(let t=beat0;t<buf.duration;t+=per) beats.push(t); }
  else {
    for(let t=raw[0]-per; t>0.02; t-=per) beats.unshift(t);
    for(let i=0;i<raw.length;i++){ beats.push(raw[i]); if(i<raw.length-1){ const g=raw[i+1]-raw[i], k=Math.round(g/per); for(let j=1;j<k;j++) beats.push(raw[i]+g*j/k); } }
    for(let t=beats[beats.length-1]+per; t<buf.duration-0.05; t+=per) beats.push(t);
  }
  // Zittern glätten: lokale Gerade über ±4 Schläge; bei stabilem Tempo das exakte globale Raster nehmen
  const sm=beats.map((_,i)=>{ let n=0,sk=0,st=0,skk=0,skt=0; for(let k=Math.max(0,i-4);k<=Math.min(beats.length-1,i+4);k++){ n++; sk+=k; st+=beats[k]; skk+=k*k; skt+=k*beats[k]; } const den=n*skk-sk*sk; if(!den) return beats[i]; const p2=(n*skt-sk*st)/den; return (st-p2*sk)/n+p2*i; });
  let res=0,rn=0; for(const t of sm){ const k=Math.round((t-beat0)/period); res+=Math.pow(t-(beat0+k*period),2); rn++; }
  const steady=Math.sqrt(res/Math.max(1,rn))<0.012;
  const grid= steady ? (()=>{ const g=[]; for(let t=beat0;t<buf.duration-0.05;t+=period) g.push(t); return g; })() : sm;
  // Taktanfang: die Phase mit den kräftigsten Bassschlägen
  const low=new Float32Array(frames); for(let f=0;f<frames;f++) low[f]=fl[0][f]/m0;
  const atF=(arr,t)=>{ const c=Math.round((t-off)*fps); let m=0; for(let f=Math.max(0,c-2);f<=Math.min(frames-1,c+2);f++) m=Math.max(m,arr[f]); return m; };
  const ph=[0,0,0,0]; grid.forEach((t,i)=>{ ph[i%4]+=atF(low,t); });
  const down=ph.indexOf(Math.max(...ph));
  onProgress&&onProgress(1);
  return {v:2, bpm:60/period, beat0, beats:grid, steady, down, onsets, dur:buf.duration, fps, off, env:oe, low, cen};
}
function chartsFromAnalysis(a,offsetMs){
  if(a.v!==2) return chartsLegacy(a);
  const sh=(offsetMs||0)/1000, B=a.beats, os=a.onsets; if(!os.length||B.length<2) return [[],[],[]];
  const per=60/a.bpm, nB=B.length;
  // Position im verfolgten Schlagraster (in Schlägen, mit Bruchteil) und zurück
  const posOf=t=>{ if(t<=B[0]) return (t-B[0])/per; if(t>=B[nB-1]) return nB-1+(t-B[nB-1])/per;
    let lo=0,hi=nB-1; while(hi-lo>1){ const m=(lo+hi)>>1; if(B[m]<=t) lo=m; else hi=m; } return lo+(t-B[lo])/(B[lo+1]-B[lo]); };
  const timeOf=p=>{ if(p<=0) return B[0]+p*per; if(p>=nB-1) return B[nB-1]+(p-nB+1)*per; const i=Math.floor(p); return B[i]+(p-i)*(B[i+1]-B[i]); };
  const cs=os.map(o=>o.cen).sort((x,y)=>x-y), q=p=>cs[Math.floor(p*(cs.length-1))];
  const q1=q(0.25),q2=q(0.5),q3=q(0.75);
  const ss=os.map(o=>o.s).sort((x,y)=>x-y), sq=p=>ss[Math.floor(p*(ss.length-1))];
  // [Raster für die Auswahl (pro Schlag), Raster zum Einrasten, Mindeststärke]: wie früher dicht, aber jede Rakete sitzt exakt im Takt
  const res=[[1,2,0.55],[2,4,0.3],[4,4,0]];
  return res.map(([keyDiv,snapDiv,pct],d)=>{
    const thr=sq(pct), best=new Map();
    for(const o of os){ if(o.s<thr) continue; const p=posOf(o.t); const k=Math.round(p*keyDiv); const cur=best.get(k); if(!cur||o.s>cur.o.s) best.set(k,{o,p}); }
    const keys=[...best.keys()].sort((x,y)=>x-y); const out=[]; let lastP=-99, prev=null;
    const big=sq(d===2?0.92:0.97), minGap=Math.max(0.9/keyDiv, 0.12/per);
    for(const k of keys){
      const {o,p}=best.get(k); let sp=Math.round(p*snapDiv)/snapDiv;
      if(sp-lastP<minGap-1e-6) continue;
      const t=timeOf(sp);
      let lane=o.cen<q1?0:o.cen<q2?1:o.cen<q3?2:3;
      if(prev && lane===prev.lane && Math.abs(o.cen-prev.cen)>(q3-q1)*0.25){ const dir=Math.sign(o.cen-prev.cen); lane=lane+dir; if(lane<0||lane>3) lane=prev.lane-dir; }
      out.push({t:t+sh,lane}); prev={lane,cen:o.cen}; lastP=sp;
      if(d>0 && o.s>=big && o.band===0) out.push({t:t+sh,lane:(lane+2)%4});
    }
    return out;
  });
}
function chartsLegacy(a){
  const beat=60/a.bpm; const os=a.onsets; if(!os.length) return [[],[],[]];
  const cs=os.map(o=>o.cen).sort((x,y)=>x-y), q=p=>cs[Math.floor(p*(cs.length-1))];
  const q1=q(0.25),q2=q(0.5),q3=q(0.75);
  const ss=os.map(o=>o.s).sort((x,y)=>x-y), sq=p=>ss[Math.floor(p*(ss.length-1))];
  const res=[[1,0.55],[0.5,0.3],[0.25,0]];
  return res.map(([r,pct],d)=>{
    const slot=beat*r, thr=sq(pct), best=new Map();
    for(const o of os){ if(o.s<thr) continue; const k=Math.round((o.t-a.beat0)/slot); const cur=best.get(k); if(!cur||o.s>cur.s) best.set(k,o); }
    const keys=[...best.keys()].sort((x,y)=>x-y); const out=[]; let last=-9, prev=null;
    const big=sq(d===2?0.92:0.97);
    for(const k of keys){
      const o=best.get(k); const gt=a.beat0+k*slot; let t=Math.abs(o.t-gt)<0.045?gt:o.t;
      if(t-last<Math.max(slot*0.9,0.12)) continue;
      let lane=o.cen<q1?0:o.cen<q2?1:o.cen<q3?2:3;
      if(prev && lane===prev.lane && Math.abs(o.cen-prev.cen)>(q3-q1)*0.25){ const dir=Math.sign(o.cen-prev.cen); lane=lane+dir; if(lane<0||lane>3) lane=prev.lane-dir; }
      out.push({t,lane}); prev={lane,cen:o.cen}; last=t;
      if(d>0 && o.s>=big && o.band===0) out.push({t,lane:(lane+2)%4});
    }
    return out;
  });
}
// ---------- Speicher (IndexedDB, nur in diesem Browser) ----------
const OWN={db:null};
function ownDb(){
  return new Promise(res=>{
    if(OWN.db) return res(OWN.db);
    try{ const rq=indexedDB.open('bumm-lieder',1);
      rq.onupgradeneeded=()=>rq.result.createObjectStore('songs',{keyPath:'id'});
      rq.onsuccess=()=>{ OWN.db=rq.result; res(OWN.db); }; rq.onerror=()=>res(null);
    }catch(e){ res(null); }
  });
}
async function ownSave(rec){ const db=await ownDb(); if(!db) return false; return new Promise(r=>{ try{ const tx=db.transaction('songs','readwrite'); tx.objectStore('songs').put(rec); tx.oncomplete=()=>r(true); tx.onerror=()=>r(false); }catch(e){ r(false); } }); }
async function ownDelete(id){ const db=await ownDb(); if(!db) return; try{ db.transaction('songs','readwrite').objectStore('songs').delete(id); }catch(e){} }
async function ownLoadAll(){ const db=await ownDb(); if(!db) return []; return new Promise(r=>{ try{ const rq=db.transaction('songs').objectStore('songs').getAll(); rq.onsuccess=()=>r(rq.result||[]); rq.onerror=()=>r([]); }catch(e){ r([]); } }); }
function songFromRecord(rec){
  const a=rec.analysis;
  return {id:rec.id, title:rec.title, composer:'Eigenes Lied', piece:rec.name, bpm:Math.round(a.bpm), style:'own', custom:true, pack:3,
    bytes:rec.bytes, buffer:null, charts:chartsFromAnalysis(a,rec.offset), analysis:a, rec};
}
function ownSetOffset(song,ms){
  song.rec.offset=Math.max(-200,Math.min(200,ms)); song.charts=chartsFromAnalysis(song.analysis,song.rec.offset); ownSave(song.rec);
}
async function ownRestore(){
  const recs=await ownLoadAll();
  for(const r of recs){ if(!SONGS.some(s=>s.id===r.id)) SONGS.push(songFromRecord(r)); }
  if(UI.screen==='select') renderSelect();
}
// Aus Bytes ein eigenes Lied machen (Datei vom Gerät oder vom Gastgeber geladen)
async function ownAddBytes(bytes,title,name,status){
  audioInit();
  const buf=await A.ctx.decodeAudioData(bytes.slice(0));
  if(buf.duration<20) throw {msg:'Das Lied ist zu kurz (mindestens 20 Sekunden).'};
  if(buf.duration>600) throw {msg:'Das Lied ist zu lang (höchstens 10 Minuten).'};
  const a=await analyzeAudio(buf,p=>{ status&&status('Analysiere Schläge … '+Math.round(p*100)+' %'); });
  const clean=t=>String(t||'').replace(/[<>&"'`]/g,'').slice(0,60)||'Lied';
  const rec={id:'own-'+Date.now(),title:clean(title),name:clean(name),bytes,analysis:a,created:Date.now()};
  const song=songFromRecord(rec); song.buffer=buf;
  SONGS.push(song);
  song.saved=await ownSave(rec);
  return song;
}
async function ownAdd(file){
  const st=document.getElementById('own-status');
  try{
    st.textContent='Lade „'+file.name+'“ …';
    const bytes=await file.arrayBuffer();
    const song=await ownAddBytes(bytes,file.name.replace(/\.[^.]+$/,'').replace(/[_]+/g,' '),file.name,t=>{ st.textContent=t; });
    st.textContent='„'+song.title+'“ ist bereit: '+song.bpm+' BPM, '+song.charts[1].length+' Raketen auf Normal. Falls sie nicht genau sitzen: mit ◀ ▶ neben dem Lied nachstellen.'+(song.saved?'':' (Konnte nicht dauerhaft gespeichert werden.)');
    renderSelect();
  }catch(e){ if(e&&e.msg){ st.textContent=e.msg; return; } console.error(e); st.textContent='Diese Datei kann der Browser nicht abspielen. Probier MP3, M4A, OGG oder WAV.'; }
}
async function ownEnsureBuffer(song){
  if(!song.buffer){ audioInit(); song.buffer=await A.ctx.decodeAudioData(song.bytes.slice(0)); }
  if(song.analysis.v!==2){ // ältere Analyse: mit der genaueren Schlagverfolgung neu berechnen
    toast('Verbessere die Schläge für „'+song.title+'“ …');
    const a=await analyzeAudio(song.buffer); song.analysis=a; song.rec.analysis=a; song.bpm=Math.round(a.bpm);
    song.charts=chartsFromAnalysis(a,song.rec.offset); ownSave(song.rec);
  }
  return song.buffer;
}
