// ===== Online: Raum mit Freunden (gleichzeitig spielen) + gemeinsame Bestenliste =====
const ON={room:null, db:null, user:null, uid:null, r:null, code:null, host:false, lastGo:null, board:[], mine:null, tick:null, unsubPeers:null};
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function onGetName(){ let n=''; try{ n=localStorage.getItem('bumm-name')||''; }catch(e){} return n; }
function onSetName(n){ try{ localStorage.setItem('bumm-name',n); }catch(e){} }
function onCleanName(s){ return String(s||'').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'').trim().slice(0,16); }
function onStatus(t){ const el=$('#on-status'); if(el) el.textContent=t; }

async function onInit(){
  $('#on-name').value=onGetName();
  if(!window.claude || !claude.use){
    if(typeof p2pAvailable==='function' && p2pAvailable()){ ON.p2p=true; ON.room={join:p2pJoin}; onStatus('Erstelle einen Raum oder gib den Code deiner Freunde ein. Bis zu 12 Leute pro Raum.'); boardRender(); onUpdateUI(); return; }
    onStatus('Online-Spielen geht nur, wenn das Spiel über den Claude-Link oder die Webseite geöffnet ist.'); onUpdateUI(); return; }
  try{
    const [room,db,user]=await Promise.all([claude.use('room'),claude.use('db'),claude.use('user')]);
    ON.room=room; ON.db=db; ON.user=user;
    if(user){ try{ ON.uid=await user.id(); }catch(e){} }
  }catch(e){ console.warn(e); }
  if(ON.room) onStatus('Erstelle einen Raum oder gib den Code deiner Freunde ein.');
  else onStatus('Online-Räume sind in dieser Ansicht nicht verfügbar. Deine Freunde müssen über „Teilen“ eingeladen sein und angemeldet sein.');
  boardSubscribe();
  onUpdateUI();
}

// ---------- Eigene Lieder teilen ----------
// Die Datei wird in Stücken in der gemeinsamen Datenbank abgelegt (songs/<hash>), Freunde laden sie von dort.
const SHARE={loading:{}, pickH:null, pickP:null, preH:null};
const PART=180000;
async function shaHex(buf){ const d=await crypto.subtle.digest('SHA-256',buf); return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24); }
async function ownHash(song){ if(song.rec.hash) return song.rec.hash; song.rec.hash=await shaHex(song.rec.bytes); ownSave(song.rec); return song.rec.hash; }
async function ownFindByHash(h){ for(const s of SONGS){ if(s.custom && await ownHash(s)===h) return s; } return null; }
function onSongKey(s){ return s.custom ? 'own:'+(s.rec.hash||'') : s.id; }
function toB64(buf){ const u=new Uint8Array(buf); let s=''; for(let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000)); return btoa(s); }
function fromB64(str){ const bin=atob(str); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u.buffer; }
async function dbRetry(fn){ for(let i=0;;i++){ try{ return await fn(); }catch(e){ const c=e&&e.code; if(i<6 && (c==='resource_exhausted'||c==='unavailable')){ await new Promise(r=>setTimeout(r,500*(i+1))); continue; } throw e; } } }
async function shareUpload(song,onP){
  const h=await ownHash(song);
  const meta=ON.db.doc('songs/'+h);
  const m=await dbRetry(()=>meta.get()).catch(()=>null);
  if(m && m.exists && m.data().done) return h;
  const str=toB64(song.rec.bytes); const n=Math.ceil(str.length/PART);
  const info={title:song.title, name:song.piece||song.title, n, size:song.rec.bytes.byteLength, t:Date.now()};
  await dbRetry(()=>meta.set(Object.assign({done:false},info)));
  for(let i=0;i<n;i++){ await dbRetry(()=>ON.db.doc('songs/'+h+'/parts/'+i).set({d:str.slice(i*PART,(i+1)*PART)})); onP&&onP((i+1)/n); }
  await dbRetry(()=>meta.set(Object.assign({done:true},info)));
  shareCleanup(h);
  return h;
}
// Nur die letzten 3 geteilten Lieder behalten, damit der Speicher nicht vollläuft
async function shareCleanup(keep){
  try{
    const q=await ON.db.collection('songs').get(); const docs=q.docs.filter(d=>d.exists).map(d=>({id:d.id,t:+(d.data().t)||0,n:+(d.data().n)||0}));
    docs.sort((a,b)=>b.t-a.t);
    for(const d of docs.slice(3)){ if(d.id===keep) continue; for(let i=0;i<d.n;i++){ try{ await ON.db.doc('songs/'+d.id+'/parts/'+i).delete(); }catch(e){} } try{ await ON.db.doc('songs/'+d.id).delete(); }catch(e){} }
  }catch(e){}
}
async function shareFinish(bytes,h,md,o){
  if(await shaHex(bytes)!==h) throw {msg:'Die Datei kam beschädigt an.'};
  const song=await ownAddBytes(bytes, md.title, md.name, t=>onStatus(t));
  song.rec.hash=h; song.rec.offset=Math.max(-200,Math.min(200,+o.off||0)); song.charts=chartsFromAnalysis(song.analysis,song.rec.offset); ownSave(song.rec);
  onStatus('„'+song.title+'“ ist geladen und liegt jetzt auch in deiner Liedauswahl.');
  return song;
}
function shareFetch(o){
  const h=String(o.h||'').replace(/[^0-9a-f]/g,'').slice(0,24); if(h.length!==24) return Promise.reject({msg:'Ungültiges Lied.'});
  if(SHARE.loading[h]) return SHARE.loading[h];
  const pr=(async()=>{
    const have=await ownFindByHash(h); if(have) return have;
    onMyPresence({loading:h});
    if(ON.p2p){
      if(!ON.r||!ON.r.fetchFile) throw {msg:'Keine Verbindung zum Gastgeber.'};
      const t=String(o.title||'Lied').slice(0,60);
      const bytes=await ON.r.fetchFile(h,p=>onStatus('Lade „'+t+'“ vom Gastgeber … '+Math.round(p*100)+' %'));
      return await shareFinish(bytes,h,{title:t,name:t},o);
    }
    if(!ON.db) throw {msg:'Keine Verbindung zur Datenbank.'};
    const m=await dbRetry(()=>ON.db.doc('songs/'+h).get());
    if(!m.exists || !m.data().done) throw {msg:'Das Lied ist noch nicht hochgeladen.'};
    const md=m.data(); const n=Math.max(0,Math.min(200,+md.n||0)); const parts=[];
    for(let i=0;i<n;i++){ const p=await dbRetry(()=>ON.db.doc('songs/'+h+'/parts/'+i).get()); if(!p.exists) throw {msg:'Ein Teil des Lieds fehlt.'}; parts.push(String(p.data().d||'')); onStatus('Lade „'+String(md.title||'Lied').slice(0,60)+'“ vom Gastgeber … '+Math.round((i+1)/n*100)+' %'); }
    return await shareFinish(fromB64(parts.join('')),h,md,o);
  })();
  SHARE.loading[h]=pr;
  pr.then(()=>{ delete SHARE.loading[h]; onMyPresence({loading:null, have:h}); }, e=>{ delete SHARE.loading[h]; onMyPresence({loading:null}); onStatus((e&&e.msg||'Das Lied konnte nicht geladen werden.')+' Du kannst die gleiche Datei auch selbst unter „Eigenes Lied“ hinzufügen.'); });
  return pr;
}
// Gastgeber wählt ein Lied: eigenes Lied sofort hochladen, damit die anderen es vorladen
async function onHostPick(){
  if(!ON.r||!ON.host) return null;
  const s=SONGS[+$('#on-song').value]; if(!s) return null;
  if(!s.custom){ SHARE.pickH=null; SHARE.pickP=null; onMyPresence({pick:null}); onHostCtl(); return null; }
  const h=await ownHash(s);
  if(SHARE.pickH===h && SHARE.pickP) return SHARE.pickP;
  SHARE.pickH=h;
  SHARE.pickP=(async()=>{
    if(!ON.p2p){ // über Claude: Datei in die gemeinsame Datenbank; direkt verbunden holen sich die Gäste sie beim Gastgeber
      if(!ON.db) throw {msg:'Keine Datenbank.'};
      onHostCtl('Lade „'+s.title+'“ hoch …');
      await shareUpload(s,p=>onHostCtl('Lade „'+s.title+'“ hoch … '+Math.round(p*100)+' %'));
    }
    const own={h, title:s.title, off:s.rec.offset||0};
    onMyPresence({pick:own}); onHostCtl();
    return own;
  })();
  SHARE.pickP.catch(e=>{ console.warn(e); SHARE.pickH=null; SHARE.pickP=null; onHostCtl(); const c=e&&e.code;
    toast(c==='quota_exceeded'?'Der Speicher für geteilte Lieder ist voll.':c==='permission_denied'||c==='not_granted'?'Du darfst hier keine Lieder hochladen.':'Hochladen hat nicht geklappt.'); });
  return SHARE.pickP;
}
function onHostCtl(busy){ const b=$('#on-start'); if(!b) return; b.disabled=!!busy; b.textContent=busy||'Für alle starten'; }
function onFillSongs(){
  const sel=$('#on-song'); if(!sel) return; const cur=SONGS[+sel.value]; sel.innerHTML='';
  SONGS.forEach((x,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=(x.custom?'★ ':'')+x.title; sel.appendChild(o); });
  const k=cur?SONGS.indexOf(cur):-1; if(k>=0) sel.value=k;
}

// ---------- Raum ----------
function onMyPresence(extra){ if(!ON.r) return; ON.r.presence(Object.assign({name:onCleanName($('#on-name').value)||'Spieler', host:ON.host}, extra||{})).catch(()=>{}); }
async function onJoin(code, asHost){
  if(!ON.room){ toast('Online ist hier nicht verfügbar.'); return; }
  const name=onCleanName($('#on-name').value); if(!name){ toast('Gib zuerst deinen Namen ein.'); $('#on-name').focus(); return; }
  onSetName(name);
  code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);
  if(code.length!==4){ toast('Der Code hat 4 Zeichen.'); return; }
  await onLeave(true);
  onStatus('Verbinde mit Raum '+code+' …');
  try{ ON.r=await ON.room.join('bbr-'+code.toLowerCase(), asHost); }
  catch(e){ onStatus(e&&e.msg?e.msg:'Beitritt hat nicht geklappt ('+(e&&e.code||'Fehler')+'). Versuch es nochmal.'); ON.r=null; onUpdateUI(); return; }
  ON.code=code; ON.host=!!asHost; ON.lastGo=null;
  // Ein Start, der schon vor dem Beitritt lief, wird ignoriert
  const h=onHostPeer(); if(h && h.presence.go) ON.lastGo=h.presence.go;
  onMyPresence({state:'lobby', score:0});
  ON.unsubPeers=ON.r.onPeers(onPeersChanged, e=>{ onStatus(e&&e.msg||'Verbindung zum Raum verloren.'); if(ON.p2p) onLeave(true).then(onUpdateUI); });
  onStatus(asHost?'Raum erstellt. Schick deinen Freunden den Code.':'Du bist im Raum. Der Gastgeber startet das Lied.');
  onUpdateUI(); onRenderLobby();
}
async function onLeave(silent){
  if(ON.unsubPeers){ try{ ON.unsubPeers(); }catch(e){} ON.unsubPeers=null; }
  if(ON.r){ try{ await ON.r.leave(); }catch(e){} }
  ON.r=null; ON.code=null; ON.host=false;
  if(!silent){ onStatus('Erstelle einen Raum oder gib den Code deiner Freunde ein.'); onUpdateUI(); }
}
function onPeersList(){ return ON.r ? ON.r.peers().filter(p=>p.kind==='viewer') : []; }
function onHostPeer(){
  // Gastgeber: wer sich als host meldet; bei mehreren der mit dem frühesten Zeitstempel
  const hs=onPeersList().filter(p=>p.presence && p.presence.host===true);
  hs.sort((a,b)=>(+a.presence.since||0)-(+b.presence.since||0)); return hs[0]||null;
}
function onPeersChanged(){
  onRenderLobby(); onRenderLive(); if(UI.screen==='results' && G && G.online) onRenderResults();
  const h=onHostPeer(); if(!h || h.sameTab) return;
  const pr=h.presence;
  const pk=pr.pick; if(pk && pk.h && pk.h!==SHARE.preH){ SHARE.preH=pk.h; shareFetch(pk).catch(()=>{}); }
  if(!pr.go || pr.go===ON.lastGo) return;
  ON.lastGo=pr.go; const go=pr.go;
  const diff=Math.max(0,Math.min(2,+pr.diff||0));
  const start=idx=>{ if(ON.lastGo!==go) return; if(G && !G.ended && G.players && G.players.length){ stopGame(); } launch({mode:'arcade', songIdx:idx, diff, tempo:1, online:true}); };
  if(String(pr.song).startsWith('own:') && pr.own){
    toast('Lade das Lied vom Gastgeber …');
    shareFetch(pr.own).then(s=>start(SONGS.indexOf(s)), e=>toast(e&&e.msg||'Das Lied konnte nicht geladen werden.'));
    return;
  }
  const idx=SONGS.findIndex(s=>s.id===pr.song); if(idx<0) return;
  start(idx);
}
async function onHostStart(){
  if(!ON.r||!ON.host) return;
  const idx=+$('#on-song').value, diff=+$('#on-diff').value; const s=SONGS[idx]; if(!s) return;
  let own=null;
  if(s.custom){ try{ own=await onHostPick(); }catch(e){ return; } if(!own) return; }
  const go=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  ON.lastGo=go;
  onMyPresence({song:own?'own:'+own.h:s.id, own, diff, go, state:'play', score:0, since:ON.since||Date.now()});
  launch({mode:'arcade', songIdx:idx, diff, tempo:1, online:true});
}
function onRenderLobby(){
  const ul=$('#on-players'); if(!ul) return; ul.innerHTML='';
  for(const p of onPeersList()){
    const li=document.createElement('li'); const pr=p.presence||{};
    const nm=document.createElement('b'); nm.textContent=onCleanName(pr.name)||'Spieler'; li.appendChild(nm);
    const meta=document.createElement('span'); meta.className='fine';
    meta.textContent=(pr.host?' · Gastgeber':'')+(p.sameTab?' · du':'')+(p.guest?' · Gast':'')+(pr.state==='play'?' · spielt':pr.state==='done'?' · fertig':'')+onReadyTag(pr);
    li.appendChild(meta); ul.appendChild(li);
  }
}
function onReadyTag(pr){
  const h=onHostPeer(); const pk=h&&h.presence&&h.presence.pick; if(!pk||!pk.h||pr.host) return '';
  return pr.have===pk.h?' · Lied bereit':pr.loading===pk.h?' · lädt Lied …':'';
}
function onUpdateUI(){
  const inRoom=!!ON.r;
  $('#on-join').hidden=inRoom; $('#on-lobby').hidden=!inRoom;
  $('#on-create').disabled=!ON.room; $('#on-enter').disabled=!ON.room;
  if(inRoom){ $('#on-roomcode').textContent=ON.code; $('#on-hostctl').hidden=!ON.host; $('#on-wait').hidden=ON.host; }
}
// Laufende Punkte senden und die der anderen zeigen
function onGameTick(){
  if(!G || !G.online || !ON.r) return;
  const p=G.players&&G.players[0]; if(!p) return;
  const st=G.ended?'done':'play';
  const gr=gradeOf(p);
  onMyPresence({state:st, score:p.score, combo:p.combo||0, grade:(G.failed||p.failed)?'✕':gr.g, song:onSongKey(G.song), diff:G.diff});
  onRenderLive();
}
function onRenderLive(){
  const box=$('#olive'); if(!box) return;
  const show=G && G.online && ON.r && !G.ended && UI.screen===null;
  box.hidden=!show; if(!show) return;
  const ps=onPeersList().filter(p=>p.presence && (p.presence.state==='play'||p.presence.state==='done'));
  ps.sort((a,b)=>(+b.presence.score||0)-(+a.presence.score||0));
  box.innerHTML='';
  ps.slice(0,8).forEach((p,i)=>{ const row=document.createElement('div'); if(p.sameTab) row.className='me';
    const a=document.createElement('span'); a.textContent=(i+1)+'. '+(onCleanName(p.presence.name)||'Spieler');
    const b=document.createElement('span'); b.textContent=(Math.max(0,+p.presence.score||0)).toLocaleString('de-DE')+(p.presence.state==='done'?' ✓':'');
    row.append(a,b); box.appendChild(row); });
}
function onRenderResults(){
  let box=$('#res-online'); if(!box){ box=document.createElement('div'); box.id='res-online'; box.className='rescol'; $('#res-body').appendChild(box); }
  box.innerHTML='<h3>Raum '+ON.code+'</h3>';
  const key=onSongKey(G.song); const ps=onPeersList().filter(p=>p.presence && p.presence.song===key);
  ps.sort((a,b)=>(+b.presence.score||0)-(+a.presence.score||0));
  const ol=document.createElement('ol'); ol.className='onrank';
  ps.forEach(p=>{ const li=document.createElement('li'); if(p.sameTab) li.className='me';
    const a=document.createElement('span'); a.textContent=onCleanName(p.presence.name)||'Spieler';
    const b=document.createElement('span'); b.textContent=(Math.max(0,+p.presence.score||0)).toLocaleString('de-DE')+' · '+String(p.presence.grade||'–').slice(0,1)+(p.presence.state==='done'?'':' · spielt noch');
    li.append(a,b); ol.appendChild(li); });
  box.appendChild(ol);
}

// ---------- Bestenliste (gemeinsam, alle sehen alle) ----------
function boardSubscribe(){
  if(!ON.db) { boardRender(); return; }
  try{
    ON.db.collection('scores').onSnapshot(snap=>{
      ON.board=snap.docs.filter(d=>d.exists).map(d=>({id:d.id, d:d.data()||{}}));
      const m=ON.board.find(x=>x.id===ON.uid); ON.mine=m?m.d:null;
      boardRender();
    }, e=>{ console.warn('Bestenliste',e); boardRender(); });
  }catch(e){ console.warn(e); }
}
async function boardSubmit(song, diff, score, grade, pct){
  if(!ON.db || !ON.uid || song.custom) return;
  const key=song.id+'_'+diff; const old=ON.mine&&ON.mine.best&&ON.mine.best[key];
  if(old && old.s>=score) return;
  const best=Object.assign({}, (ON.mine&&ON.mine.best)||{}); best[key]={s:score, g:grade, p:pct, t:Date.now()};
  const name=onCleanName($('#on-name').value||onGetName())||'Spieler';
  const body={name, best}; ON.mine=body;
  try{ await ON.db.doc('scores/'+ON.uid).set(body); toast('In der Bestenliste eingetragen!'); }
  catch(e){ console.warn('Eintrag fehlgeschlagen',e); }
}
function boardRender(){
  const list=$('#bd-list'); if(!list) return; list.innerHTML='';
  const st=$('#bd-status');
  if(!ON.db){ st.textContent='Die gemeinsame Bestenliste gibt es nur in der Claude-Version des Spiels. Deine eigenen Rekorde siehst du in der Liedauswahl.'; return; }
  const sid=$('#bd-song').value, diff=+$('#bd-diff').value; const key=sid+'_'+diff;
  const rows=ON.board.map(x=>({id:x.id, name:onCleanName(x.d.name)||'Spieler', e:x.d.best&&x.d.best[key]})).filter(r=>r.e && typeof r.e.s==='number');
  rows.sort((a,b)=>b.e.s-a.e.s);
  st.textContent=rows.length? '' : 'Noch keine Einträge. Schaff das Lied im Arcade-Modus, dann stehst du hier.';
  rows.slice(0,25).forEach((r,i)=>{ const li=document.createElement('li'); if(r.id===ON.uid) li.className='me';
    const a=document.createElement('span'); a.textContent=(i+1)+'. '+r.name;
    const b=document.createElement('span'); b.textContent=r.e.s.toLocaleString('de-DE')+' · '+String(r.e.g||'–').slice(0,1)+' · '+Math.round(+r.e.p||0)+' %';
    li.append(a,b); list.appendChild(li); });
}

// ---------- Verdrahtung ----------
(function(){
  SONGS.forEach((x,i)=>{ if(x.custom) return; const o=document.createElement('option'); o.value=x.id; o.textContent=x.title; $('#bd-song').appendChild(o); }); onFillSongs();
  $('#on-create').addEventListener('click',()=>{ let c=''; for(let i=0;i<4;i++) c+=CODE_CHARS[(Math.random()*CODE_CHARS.length)|0]; ON.since=Date.now(); onJoin(c,true).then(()=>{ onMyPresence({since:ON.since}); SHARE.pickH=null; SHARE.pickP=null; onHostPick().catch(()=>{}); }); });
  $('#on-enter').addEventListener('click',()=>onJoin($('#on-code').value,false));
  $('#on-code').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); onJoin($('#on-code').value,false); } });
  $('#on-start').addEventListener('click',onHostStart);
  $('#on-song').addEventListener('change',()=>{ onHostPick().catch(()=>{}); });
  $('#on-leave').addEventListener('click',()=>onLeave(false));
  $('#on-name').addEventListener('change',()=>{ const n=onCleanName($('#on-name').value); $('#on-name').value=n; onSetName(n); onMyPresence(); });
  $('#bd-song').addEventListener('change',boardRender); $('#bd-diff').addEventListener('change',boardRender);
  setInterval(onGameTick,350);
  onInit();
})();
