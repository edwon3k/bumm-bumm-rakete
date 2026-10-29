// ===== Menüs =====
const $=s=>document.querySelector(s);
const MODE_NAMES={arcade:'Arcade',endless:'Endlos',practice:'Training',versus:'2 Spieler'};
const STYLE_NAMES={own:'Eigene Datei',ballad:'Ballade',ska:'Ska',skapunk:'Ska-Punk',rock:'Rock',metal:'Metal',funk:'Funk',bigbeat:'Big Beat',triphop:'Trip-Hop',latin:'Latin',disco:'Disco',house:'House',surf:'Surf-Rock',techno:'Techno',trance:'Trance',hardtek:'Hard Techno',electro:'Electro',breaks:'Breakbeat',deep:'Deep House'};
let UI={screen:'title', mode:'arcade', diff:1, tempo:0.75, sel:0, last:null, mods:{}};
const isTouch = matchMedia('(pointer: coarse)').matches;

function showScreen(name){
  if(name!=='select' && G && G.preview) previewStop();
  UI.screen=name;
  document.querySelectorAll('.screen').forEach(s=>{ s.hidden = s.id!=='s-'+name; });
  $('#ui').classList.toggle('open', !!name);
  $('#bloomBtn').hidden = !(isTouch && !name && G && G.players && G.players.length===1);
  if(name){ const f=document.querySelector('#s-'+name+' [data-nav]:not([disabled])'); if(f && !f.matches('input[type=range]')) setTimeout(()=>f.focus({preventScroll:true}),30); }
  if(name==='title'){ renderStats(); setTimeout(renderDaily,0); }
  if(name==='ach') renderAch();
  if(name==='select'){ renderSelect(); PREV.idx=-1; previewQueue(UI.sel); }
  if(name==='gallery') renderGallery();
  if(name==='options') renderOptions();
  if(name==='board' && typeof boardRender==='function') boardRender();
  if(name==='online' && typeof onFillSongs==='function') onFillSongs();
}
function renderStats(){
  const el=$('#t-stats'); if(!el) return; const b=Object.values(SAVE.best||{});
  progInit(); const L=levelOf(SAVE.xp);
  if(!b.length && !SAVE.unlocked.length && !SAVE.xp){ el.hidden=true; return; }
  const s=b.filter(x=>x.grade==='S').length;
  el.innerHTML='<span class="rk">Stufe <b>'+L.level+'</b>· '+rankOf(L.level)+'</span><span><b>'+b.length+'</b> '+(b.length===1?'Lied':'Lieder')+' geschafft</span><span><b>'+s+'</b> mit Note S</span><span><b>'+SAVE.unlocked.length+'</b>/'+UNLOCKS.length+' Feuerwerke</span>';
  el.hidden=false;
}
function click(){ audioInit(); SFX.ui(A.ctx.currentTime); UI.lastClick=performance.now(); }
// leiser Tick, wenn man mit Tastatur oder Controller durchs Menü geht (ändert nichts an der Steuerung)
let lastPtr=0; document.addEventListener('pointerdown',()=>{ lastPtr=performance.now(); },true);
document.addEventListener('focusin',e=>{
  const now=performance.now(); if(now-lastPtr<400 || now-(UI.lastClick||0)<250) return;
  if(!A.ctx||A.ctx.state!=='running'||!e.target.matches||!e.target.matches('[data-nav]')) return;
  if(G&&!G.ended&&!G.demo&&G.players.length&&!paused) return;
  SFX.nav(A.ctx.currentTime);
});
// ---------- Hörprobe in der Liedauswahl (Musik mit passendem Feuerwerk) ----------
const PREV={timer:0,idx:-1,gen:0};
function previewStop(){ clearTimeout(PREV.timer); PREV.idx=-1; PREV.gen++; if(G&&G.preview) stopGame(); document.querySelectorAll('#songs .song.playing').forEach(b=>b.classList.remove('playing')); }
function previewQueue(i){ if(UI.screen!=='select'||PREV.idx===i) return; clearTimeout(PREV.timer); PREV.timer=setTimeout(()=>previewStart(i),450); }
async function previewStart(i){
  const s=SONGS[i]; if(!s||UI.screen!=='select'||!A.ctx||A.ctx.state!=='running') return;
  if(G&&!G.preview) return;
  if(s.custom && (!s.buffer||!s.analysis||s.analysis.v!==2)) return;
  const gen=++PREV.gen; PREV.idx=i;
  if(smpNeeded(s).some(n=>!SMP.buf[n])){ try{ await smpEnsure(s); }catch(e){ return; } }
  if(gen!==PREV.gen||UI.screen!=='select'||(G&&!G.preview)) return;
  if(G) stopGame();
  try{ startGame({mode:'demo',songIdx:i,diff:1,tempo:1,preview:true}); }catch(e){ console.warn(e); G=null; }
  document.querySelectorAll('#songs .song').forEach(b=>b.classList.toggle('playing',+b.dataset.i===i));
}
document.addEventListener('click',e=>{ if(e.target.closest('button')) click(); });

function menuKey(e){
  const scr=document.getElementById('s-'+UI.screen); if(!scr||scr.hidden) return;
  const items=[...scr.querySelectorAll('[data-nav]:not([disabled])')].filter(el=>el.offsetParent!==null);
  const i=items.indexOf(document.activeElement);
  const k=e.code;
  const ae=document.activeElement; if(ae && ae.tagName==='INPUT' && ae.type!=='range' && /^Arrow(Left|Right)$/.test(k)) return;
  if(UI.screen==='select' && (k==='ArrowLeft'||k==='ArrowRight')){ e.preventDefault(); UI.diff=Math.max(0,Math.min(2,UI.diff+(k==='ArrowLeft'?-1:1))); renderSelect(true); click(); return; }
  if(k==='ArrowDown'||k==='ArrowRight'){ if(document.activeElement&&document.activeElement.type==='range'&&k==='ArrowRight') return; e.preventDefault(); const n=items[(i+1+items.length)%items.length]; n&&n.focus(); n&&n.scrollIntoView({block:'nearest'}); }
  else if(k==='ArrowUp'||k==='ArrowLeft'){ if(document.activeElement&&document.activeElement.type==='range'&&k==='ArrowLeft') return; e.preventDefault(); const n=items[(i-1+items.length)%items.length]; n&&n.focus(); n&&n.scrollIntoView({block:'nearest'}); }
  else if(k==='Enter' && e.synthetic){ if(document.activeElement && items.includes(document.activeElement)) document.activeElement.click(); }
  else if(k==='Escape'){ const b=scr.dataset.back; if(b){ e.preventDefault(); if(UI.screen==='vis'){ visStop(); stopGame(); } showScreen(b); click(); } }
}

// ---------- Titel ----------
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{ UI.mode=b.dataset.mode; showScreen('select'); }));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{ const to=b.dataset.go; if(UI.screen==='vis'&&to!=='vis'){ visStop(); stopGame(); } showScreen(to); }));

// ---------- Liedauswahl ----------
function bestKey(song,d){ return song.id+'_'+d; }
function renderSelect(keepFocus){
  $('#sel-mode').textContent=MODE_NAMES[UI.mode];
  document.querySelectorAll('#diffs button').forEach(b=>b.setAttribute('aria-pressed', +b.dataset.d===UI.diff));
  $('#speeds').hidden = UI.mode!=='practice';
  document.querySelectorAll('#mods button').forEach(b=>b.setAttribute('aria-pressed', !!UI.mods[b.dataset.m]));
  { const m=modMult(UI.mods); $('#mods-xp').textContent=m>1?'XP ×'+m.toFixed(2).replace('.',','):'Modifikatoren'; }
  document.querySelectorAll('#speeds button').forEach(b=>b.setAttribute('aria-pressed', +b.dataset.t===UI.tempo));
  const list=$('#songs');
  const focusIdx = keepFocus ? [...list.children].indexOf(document.activeElement) : -1;
  list.innerHTML='';
  SONGS.forEach((s,i)=>{
    if(s.custom && UI.mode==='endless') return;
    const b=document.createElement('button'); b.className='song'+(G&&G.preview&&G.songIdx===i?' playing':''); b.dataset.nav=''; b.dataset.i=i;
    let badges='';
    if(UI.mode==='endless'){ const e=SAVE.endless[s.id]; badges = e? '<span class="badge">Rekord: '+e.laps+' Runden</span>' : ''; }
    else for(let d=0;d<3;d++){ const r=SAVE.best[bestKey(s,d)]; badges+='<span class="badge'+(d===UI.diff?' cur':'')+'" title="'+DIFF_NAMES[d]+'">'+DIFF_NAMES[d][0]+' '+(r?r.grade:'–')+'</span>'; }
    const un=s.custom?-1:[0,1,2].filter(d=>SAVE.unlocked.includes(i*3+d)).length;
    b.innerHTML='<span class="num">'+String(i+1).padStart(2,'0')+'</span><span class="st"><span class="tt">'+s.title+'</span><span class="sub">'+s.composer+' · '+s.piece+'</span></span><span class="meta"><span class="style">'+STYLE_NAMES[s.style]+' · '+s.bpm+' BPM'+(s.pack===2?' · Bonus':s.pack===3?' · Neu':'')+songLevelHtml(s,UI.diff)+'</span><span class="badges">'+badges+(un>=0?'<span class="badge fw" title="Freigeschaltete Feuerwerke">✦ '+un+'/3</span>':'')+'</span></span>';
    b.addEventListener('click',()=>{ UI.sel=i; launch(); });
    b.addEventListener('focus',()=>{ UI.sel=i; previewQueue(i); });
    b.addEventListener('pointerenter',()=>previewQueue(i));
    if(s.custom){
      const row=document.createElement('div'); row.className='songrow'; row.appendChild(b);
      const del=document.createElement('button'); del.className='btn del'; del.dataset.nav=''; del.textContent='Löschen'; del.setAttribute('aria-label','„'+s.title+'“ löschen');
      del.addEventListener('click',()=>{ if(del.dataset.arm){ ownDelete(s.id); SONGS.splice(SONGS.indexOf(s),1); renderSelect(); toast('„'+s.title+'“ gelöscht'); } else { del.dataset.arm='1'; del.textContent='Sicher?'; setTimeout(()=>{ delete del.dataset.arm; del.textContent='Löschen'; },3000); } });
      const ofs=document.createElement('span'); ofs.className='ofs';
      const lab=()=>{ const v=s.rec.offset||0; return (v>0?'+':v<0?'−':'±')+Math.abs(v)+' ms'; };
      const mk=(txt,dv,aria)=>{ const x=document.createElement('button'); x.className='btn ofsb'; x.dataset.nav=''; x.textContent=txt; x.setAttribute('aria-label',aria);
        x.addEventListener('click',()=>{ ownSetOffset(s,(s.rec.offset||0)+dv); val.textContent=lab(); SFX.ui(A.ctx?A.ctx.currentTime:0,dv>0); }); return x; };
      const val=document.createElement('span'); val.className='ofsv'; val.textContent=lab(); val.title='Raketen früher oder später als die Musik';
      ofs.append(mk('◀',-10,'Raketen 10 ms früher'),val,mk('▶',10,'Raketen 10 ms später'));
      row.appendChild(ofs); row.appendChild(del); list.appendChild(row);
    } else list.appendChild(b);
  });
  if(focusIdx>=0 && list.children[focusIdx]) list.children[focusIdx].focus({preventScroll:true});
}
document.querySelectorAll('#diffs button').forEach(b=>b.addEventListener('click',()=>{ UI.diff=+b.dataset.d; renderSelect(); }));
document.querySelectorAll('#mods button').forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.m; UI.mods[k]=!UI.mods[k];
  if(k==='hidden'&&UI.mods.hidden) UI.mods.sudden=false; if(k==='sudden'&&UI.mods.sudden) UI.mods.hidden=false; renderSelect(true); }));
document.querySelectorAll('#speeds button').forEach(b=>b.addEventListener('click',()=>{ UI.tempo=+b.dataset.t; renderSelect(); }));
async function launch(opts){
  opts = opts || {mode:UI.mode, songIdx:UI.sel, diff:UI.diff, tempo:UI.mode==='practice'?UI.tempo:1, mods:Object.assign({},UI.mods)};
  const sg=SONGS[opts.songIdx];
  if(sg && sg.custom && (!sg.buffer || sg.analysis.v!==2)){ toast('Lade „'+sg.title+'“ …'); try{ await ownEnsureBuffer(sg); }catch(e){ toast('Das Lied konnte nicht geladen werden.'); return; } }
  audioInit(); if(sg && smpNeeded(sg).some(n=>!SMP.buf[n])){ toast('Lade Instrumente …'); await smpEnsure(sg); }
  UI.last=opts;
  if(document.activeElement) document.activeElement.blur();
  showScreen(null);
  startGame(opts);
  if(opts.mode==='versus') toast('Spieler 1: W A S D + Leertaste · Spieler 2: Pfeiltasten + Enter');
}

// ---------- Pause ----------
function togglePause(){
  if(!G||G.ended) return;
  if(!paused){ paused=true; A.ctx.suspend(); const p0=G.players[0]; $('#p-info').textContent=G.song.title+' · '+DIFF_NAMES[G.diff]+(p0&&G.players.length===1?' · '+p0.score.toLocaleString('de-DE')+' Punkte':''); showScreen('pause'); }
  else if(G.resumeAt){ G.resumeAt=0; showScreen('pause'); }
  else { // kurz runterzählen, damit man nicht überrumpelt wird
    showScreen(null); const tok=G.resumeAt=performance.now()+1200; const g0=G;
    setTimeout(()=>{ if(G===g0 && G.resumeAt===tok){ G.resumeAt=0; paused=false; A.ctx.resume(); } },1200); }
}
$('#p-resume').addEventListener('click',togglePause);
$('#p-restart').addEventListener('click',()=>{ paused=false; A.ctx.resume(); stopGame(); launch(UI.last); });
$('#p-quit').addEventListener('click',()=>{ paused=false; A.ctx.resume(); stopGame(); showScreen(UI.last&&UI.last.online?'online':'select'); });
function stopGame(){ if(G){ if(G.src){ try{ G.src.stop(); }catch(e){} } newMusicBus(); G=null; } paused=false; }

// ---------- Ergebnis ----------
// Schwierigkeitsanzeige in der Liederliste: Raketen pro Sekunde der gewählten Stufe als 1–5 Punkte
const LVL_CACHE={};
function songLevel(s,d){
  if(s.custom) return 0;
  const k=s.id+'|'+d+'|'+(SETTINGS.musicStyle||'');
  if(LVL_CACHE[k]===undefined){ try{ const bld=buildArcade(s,1); const ch=makeChart(bld.cands,d,0); const nps=ch.length/Math.max(1,bld.dur);
    LVL_CACHE[k]=Math.max(1,Math.min(5,Math.round((nps-LVL_BASE[d])/LVL_STEP[d])+1)); }catch(e){ LVL_CACHE[k]=0; } }
  return LVL_CACHE[k];
}
const LVL_BASE=[0.9,1.0,1.1], LVL_STEP=[0.3,0.65,0.65];
function songLevelHtml(s,d){ const l=songLevel(s,d); if(!l) return ''; return ' · <span class="lvl" title="Schwierigkeit '+l+' von 5" aria-label="Schwierigkeit '+l+' von 5">'+'●'.repeat(l)+'<i>'+'●'.repeat(5-l)+'</i></span>'; }
function showResults(){
  if(!G) return;
  const res=$('#res-body'); res.innerHTML='';
  const ps=G.players; const multi=ps.length>1;
  let head;
  if(G.mode==='endless') head='Show vorbei! '+(G.lap-1)+' Runden geschafft';
  else if(multi){ head = ps[0].score===ps[1].score?'Unentschieden!':'Spieler '+(ps[0].score>ps[1].score?1:2)+' gewinnt!'; }
  else head = G.failed?'Die Lunte ist aus!':'Show beendet!';
  $('#res-title').textContent=head;
  $('#res-song').textContent=G.song.title+' · '+DIFF_NAMES[G.diff]+(G.mode==='practice'?' · Training '+Math.round(G.tempo*100)+'%':'');
  for(const p of ps){
    const gr=gradeOf(p); const failed=G.failed||p.failed;
    if(p.i===0) UI.share={song:G.song.title,diff:DIFF_NAMES[G.diff],score:p.score,grade:failed&&G.mode!=='endless'?'–':gr.g,pct:Math.round(gr.pct*100),combo:p.maxCombo,mode:G.mode,laps:G.lap-1};
    const col=document.createElement('div'); col.className='rescol';
    let extra='';
    if(G.mode==='arcade' && !failed){
      const k=bestKey(G.song,G.diff), old=SAVE.best[k];
      if(!old||p.score>old.score){ SAVE.best[k]={score:p.score,grade:gr.g,pct:Math.round(gr.pct*100)}; extra+='<p class="rec">Neuer Rekord!'+(old?' <small>+'+(p.score-old.score).toLocaleString('de-DE')+'</small>':'')+'</p>'; }
      else extra+='<p class="hint">Dein Rekord: '+old.score.toLocaleString('de-DE')+' ('+old.grade+')</p>';
      if(!multi && typeof boardSubmit==='function') boardSubmit(G.song,G.diff,p.score,gr.g,Math.round(gr.pct*100));
      if(p.unlock!==null && !SAVE.unlocked.includes(p.unlock)){ SAVE.unlocked.push(p.unlock); extra+='<p class="unl">✦ Feuerwerk freigeschaltet: '+UNLOCKS[p.unlock].name+'</p>'; }
    }
    if(G.mode==='arcade' && failed && p.unlock!==null && !SAVE.unlocked.includes(p.unlock)) extra+='<p class="hint">Das Feuerwerk wird erst freigeschaltet, wenn du das Lied schaffst.</p>';
    if(G.mode==='endless'){ const e=SAVE.endless[G.song.id]; const laps=G.lap-1; if(!e||laps>e.laps||(laps===e.laps&&p.score>e.score)){ SAVE.endless[G.song.id]={laps,score:p.score}; extra+='<p class="rec">Neuer Endlos-Rekord!</p>'; } }
    const parts=[['Perfekt',p.perfect,'#ffe066'],['Super',p.great,'#6ff3ff'],['Gut',p.good,'#8dff9e'],['Daneben',p.miss,'#ff6b6b']];
    col.innerHTML=(multi?'<h3>Spieler '+(p.i+1)+'</h3>':'')+
      '<div class="reshead"><div class="grade stamp g'+gr.g+'">'+(failed&&G.mode!=='endless'?'✕':gr.g)+'</div>'+
      '<div class="resnums"><div class="big"><b class="cnt" data-to="'+p.score+'">0</b><span>Punkte</span></div>'+
      '<div class="mid"><b class="cnt" data-to="'+Math.round(gr.pct*100)+'">0</b> %<span>Trefferquote</span></div></div></div>'+
      '<div class="dist" role="img" aria-label="'+parts.map(x=>x[0]+' '+x[1]).join(', ')+'">'+parts.map(x=>'<i style="flex-grow:'+x[1]+';background:'+x[2]+'"></i>').join('')+'</div>'+
      '<div class="legend">'+parts.map(x=>'<span><i style="background:'+x[2]+'"></i>'+x[0]+' <b>'+x[1]+'</b></span>').join('')+'</div>'+
      '<dl><dt>Beste Kombo</dt><dd>'+p.maxCombo+'</dd><dt>Fehlzündungen</dt><dd>'+p.misfire+'</dd>'+(p.goldTotal?'<dt>Goldraketen</dt><dd class="gold">'+p.goldHit+' / '+p.goldTotal+'</dd>':'')+'</dl>'+
      (p.fc?'<p class="fc">'+p.fc+'</p>':'')+timingHtml(p,multi)+extra;
    res.appendChild(col);
  }
  const xpr=(G.mode!=='demo')?progAfterGame():null;
  if(xpr){ const xd=document.createElement('div'); xd.className='rescol xpcol'; xd.innerHTML=xpHtml(xpr); res.appendChild(xd); }
  storeSave();
  showScreen('results');
  if(G.online && typeof onRenderResults==='function') onRenderResults();
  countUp(res); res.querySelectorAll('canvas.tgraph').forEach(c=>drawTiming(c,ps[+c.dataset.p]));
  res.querySelectorAll('[data-ofs]').forEach(b=>b.addEventListener('click',()=>{ SETTINGS.offset=+b.dataset.ofs; storeSave(); b.disabled=true; b.textContent='Übernommen: '+(SETTINGS.offset>0?'+':'')+SETTINGS.offset+' ms'; toast('Latenz-Ausgleich jetzt '+(SETTINGS.offset>0?'+':'')+SETTINGS.offset+' ms'); }));
  // Stempel der Note mit Knall
  const g0=gradeOf(ps[0]).g;
  if(!G.failed){ later(0.42,()=>{ if(A.ctx){ SFX.boom(A.ctx.currentTime,0.7,0); if(g0==='S') SFX.unlock(A.ctx.currentTime+0.1); } }); }
  // Abschluss-Feuerwerk
  if(!G.failed) for(let i=0;i<8;i++) later(i*0.18,()=>freeLaunch(W*(0.15+Math.random()*0.7),H*(0.12+Math.random()*0.25),pickFirework(),0.8));
}
// Timing über das ganze Lied: Punkt oben = zu spät, unten = zu früh
function timingHtml(p,multi){
  if(p.errAll.length<8) return '';
  const avg=p.errAll.reduce((s,e)=>s+e[1],0)/p.errAll.length*1000, ms=Math.round(Math.abs(avg));
  let tip='Im Schnitt '+(ms<4?'genau auf dem Punkt':ms+' ms '+(avg>0?'zu spät':'zu früh'));
  let btn='';
  if(!multi && ms>=15 && p.errAll.length>=20){ const nv=Math.max(-200,Math.min(200,SETTINGS.offset+Math.round(avg/5)*5));
    btn='<button class="btn small" data-nav data-ofs="'+nv+'">Latenz-Ausgleich auf '+(nv>0?'+':'')+nv+' ms stellen</button>'; }
  return '<div class="timing"><canvas class="tgraph" data-p="'+p.i+'" width="680" height="120" aria-label="Timing deiner Treffer über das Lied"></canvas><p class="hint">'+tip+'</p>'+btn+'</div>';
}
function drawTiming(c,p){
  const mt=p.missT||[], x=c.getContext('2d'), w=c.width, h=c.height, mid=h/2, T=Math.max(1,p.errAll[p.errAll.length-1][0],mt.length?mt[mt.length-1]:0);
  // verpasste Raketen als rote Striche
  x.fillStyle='rgba(255,107,107,0.38)'; for(const tt of mt) x.fillRect(tt/T*(w-8)+4,4,2,h-8);
  x.fillStyle='rgba(255,224,102,0.12)'; x.fillRect(0,mid-mid*W_PERF/WIN,w,mid*2*W_PERF/WIN);
  x.fillStyle='rgba(255,255,255,0.35)'; x.fillRect(0,mid,w,1);
  x.font='600 18px "Josefin Sans", sans-serif'; x.fillStyle='rgba(200,245,255,0.55)'; x.fillText('SPÄT',8,22); x.fillText('FRÜH',8,h-8); if(mt.length){ x.textAlign='right'; x.fillStyle='rgba(255,140,140,0.7)'; x.fillText('│ DANEBEN',w-8,22); x.textAlign='left'; }
  for(const [tt,d] of p.errAll){ const ad=Math.abs(d); x.fillStyle=ad<=W_PERF?'#ffe066':ad<=W_GREAT?'#6ff3ff':'#8dff9e';
    x.fillRect(tt/T*(w-8)+2, mid-Math.max(-1,Math.min(1,d/WIN))*(mid-4)-3, 6,6); }
}
function countUp(root){
  const els=[...root.querySelectorAll('.cnt')], t0=performance.now(), D=1100;
  const step=now=>{ const u=Math.min(1,(now-t0)/D), e=1-Math.pow(1-u,3);
    for(const el of els){ el.textContent=Math.round(+el.dataset.to*e).toLocaleString('de-DE'); }
    if(u<1 && UI.screen==='results') requestAnimationFrame(step); else for(const el of els) el.textContent=(+el.dataset.to).toLocaleString('de-DE'); };
  requestAnimationFrame(step);
}
$('#r-again').addEventListener('click',()=>{ stopGame(); if(UI.last&&UI.last.online&&typeof ON!=='undefined'&&ON.r){ if(ON.host){ $('#on-song').value=UI.last.songIdx; $('#on-diff').value=UI.last.diff; onHostStart(); } else { showScreen('online'); toast('Der Gastgeber startet das nächste Lied.'); } return; } launch(UI.last); });
$('#r-select').addEventListener('click',()=>{ stopGame(); showScreen(UI.last&&UI.last.online?'online':'select'); });
$('#t-daily').addEventListener('click',()=>{ const d=dailyPick(); launch({mode:'arcade', songIdx:d.idx, diff:d.diff, tempo:1, mods:d.mods, daily:true}); });
$('#r-menu').addEventListener('click',()=>{ stopGame(); showScreen('title'); });

// ---------- Visualizer ----------
$('#vis-file').addEventListener('change',e=>{ const f=e.target.files[0]; if(f){ visFile(f); award('vis'); } });
(function(){ const s=$('#vis-song'); SONGS.forEach((x,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=x.title+' ('+x.composer+')'; s.appendChild(o); }); })();
$('#vis-play').addEventListener('click',async()=>{ visStop(); stopGame(); audioInit(); const vs=SONGS[+$('#vis-song').value]; if(smpNeeded(vs).some(n=>!SMP.buf[n])){ $('#vis-status').textContent='Lade Instrumente …'; await smpEnsure(vs); } award('vis'); startGame({mode:'demo',songIdx:+$('#vis-song').value,diff:2,tempo:1}); $('#vis-status').textContent='Läuft: '+SONGS[+$('#vis-song').value].title; });
$('#vis-stop').addEventListener('click',()=>{ visStop(); stopGame(); $('#vis-status').textContent='Gestoppt'; });

// ---------- Galerie ----------
function renderGallery(){
  const grid=$('#gal'); grid.innerHTML='';
  const NAMES={peony:'Päonie',chrysanthemum:'Chrysantheme',ring:'Ring',willow:'Trauerweide',palm:'Palme',crossette:'Kreuzette',strobe:'Blitzlicht',crackle:'Knisterregen'};
  BASE_TYPES.forEach(t=>{ const b=document.createElement('button'); b.className='fwcell'; b.dataset.nav=''; b.innerHTML='<span>'+NAMES[t]+'</span><small>Grundausstattung</small>';
    b.addEventListener('click',()=>freeLaunch(W*(0.2+Math.random()*0.6),H*(0.15+Math.random()*0.2),{type:t,c:pick([0,1,2,5,6,7,8,9])},0.8)); grid.appendChild(b); });
  UNLOCKS.forEach(u=>{ const own=SAVE.unlocked.includes(u.id); const b=document.createElement('button'); b.className='fwcell'+(own?'':' locked'); b.dataset.nav='';
    const s=SONGS[Math.floor(u.id/3)];
    b.innerHTML= own? '<span>'+u.name+'</span><small>'+s.title+'</small>' : '<span>???</span><small>'+s.title+' · '+DIFF_NAMES[u.id%3]+'</small>';
    b.style.setProperty('--sw',COLORS[u.c]); if(own) b.style.setProperty('--sw2',COLORS[u.c2]);
    b.addEventListener('click',()=>{ if(own) freeLaunch(W*(0.2+Math.random()*0.6),H*(0.15+Math.random()*0.2),{type:u.shape,c:u.c,c2:u.c2},0.8); else toast('Triff in „'+s.title+'“ ('+DIFF_NAMES[u.id%3]+') die Wunderkerzen-Rakete.'); });
    grid.appendChild(b); });
  $('#gal-count').textContent=SAVE.unlocked.length+' von '+UNLOCKS.length+' Spezial-Feuerwerken freigeschaltet';
}

// ---------- Optionen ----------
function renderOptions(){
  $('#o-music').value=SETTINGS.music*100; $('#o-sfx').value=SETTINGS.sfx*100; $('#o-speed').value=SETTINGS.speed*100; $('#o-offset').value=SETTINGS.offset;
  $('#o-mstyle').value=SETTINGS.musicStyle||'elektro'; $('#o-glyph').value=SETTINGS.glyphStyle; $('#o-quality').value=SETTINGS.quality; $('#o-calm').value=SETTINGS.calm?'1':'0'; updOptLabels();
}
function updOptLabels(){
  $('#v-music').textContent=Math.round(SETTINGS.music*100)+' %'; $('#v-sfx').textContent=Math.round(SETTINGS.sfx*100)+' %';
  $('#v-speed').textContent=SETTINGS.speed.toFixed(2).replace('.',',')+'×'; $('#v-offset').textContent=(SETTINGS.offset>0?'+':'')+SETTINGS.offset+' ms';
}
$('#o-music').addEventListener('input',e=>{ SETTINGS.music=e.target.value/100; applyVolumes(); updOptLabels(); storeSave(); });
$('#o-sfx').addEventListener('input',e=>{ SETTINGS.sfx=e.target.value/100; applyVolumes(); updOptLabels(); storeSave(); });
$('#o-speed').addEventListener('input',e=>{ SETTINGS.speed=e.target.value/100; updOptLabels(); storeSave(); });
$('#o-offset').addEventListener('input',e=>{ SETTINGS.offset=+e.target.value; updOptLabels(); storeSave(); });
$('#o-mstyle').addEventListener('change',e=>{ SETTINGS.musicStyle=e.target.value; storeSave(); applyMusicStyle(); toast(e.target.value==='band'?'Musik: Band-Sound (alt)':'Musik: Elektro-Sound'); });
$('#o-glyph').addEventListener('change',e=>{ SETTINGS.glyphStyle=e.target.value; storeSave(); });
$('#o-calm').addEventListener('change',e=>{ SETTINGS.calm=e.target.value==='1'; storeSave(); toast(SETTINGS.calm?'Blitze gedämpft':'Blitze normal'); });
$('#o-quality').addEventListener('change',e=>{ SETTINGS.quality=e.target.value; PERF.low=SETTINGS.quality!=='high'; PERF.slow=0; storeSave(); resize(); });
let resetArm=false;
$('#o-reset').addEventListener('click',e=>{
  if(!resetArm){ resetArm=true; e.target.textContent='Wirklich alles löschen?'; setTimeout(()=>{ resetArm=false; e.target.textContent='Fortschritt zurücksetzen'; },3000); return; }
  SAVE.unlocked=[]; SAVE.best={}; SAVE.endless={}; storeSave(); resetArm=false; e.target.textContent='Fortschritt zurücksetzen'; toast('Fortschritt gelöscht');
});

// ---------- Hinweise ----------
let toastTimer=0;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('on'),2800); }
function toastBig(msg){ const t=$('#big'); t.textContent=msg; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); }

$('#own-file').addEventListener('change',e=>{ const f=e.target.files[0]; if(f) ownAdd(f); e.target.value=''; });
// ---------- Start ----------
applyMusicStyle();
cityInit();
gfxInit();
ownRestore();
resize();
showScreen('title');
requestAnimationFrame(frame);

// Ergebnis teilen: über das Teilen-Menü des Geräts, sonst in die Zwischenablage
$('#r-share').addEventListener('click',async()=>{
  const s=UI.share; if(!s) return;
  const txt='🎆 Bumm Bumm Rakete: „'+s.song+'“ ('+s.diff+') – '+s.score.toLocaleString('de-DE')+' Punkte'+(s.mode==='endless'?', '+s.laps+' Runden':', Note '+s.grade+', '+s.pct+' %')+', Kombo '+s.combo+'. Schaffst du mehr?';
  const url=location.protocol.startsWith('http')&&!/claude/.test(location.host)?location.href.split('#')[0]:'https://edwon3k.github.io/bumm-bumm-rakete/';
  try{ if(navigator.share){ await navigator.share({title:'Bumm Bumm Rakete',text:txt,url}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
  try{ await navigator.clipboard.writeText(txt+' '+url); toast('Ergebnis kopiert – einfach einfügen und verschicken'); }
  catch(e){ toast('Kopieren nicht möglich'); }
});
