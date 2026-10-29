// ===== Fortschritt: Rang mit Erfahrungspunkten und Erfolge =====
const RANKS=['Funkenlehrling','Zündler','Böllerfan','Raketenbauer','Pyrotechniker','Lichtkünstler','Feuerwerksmeister','Himmelsmaler','Sternenschmied','Hafenlegende'];
function xpNeed(l){ return 300+l*250; }                 // XP von Stufe l auf l+1
function levelOf(xp){ let l=1, r=xp; while(r>=xpNeed(l)){ r-=xpNeed(l); l++; } return {level:l, into:r, need:xpNeed(l)}; }
function rankOf(level){ return RANKS[Math.min(RANKS.length-1,Math.floor((level-1)/3))]; }
const ACH=[
  ['first','Erste Show','Ein Lied im Arcade-Modus schaffen'],
  ['hard','Mutprobe','Ein Lied auf Schwer schaffen'],
  ['gradeA','Saubere Arbeit','Note A oder besser'],
  ['gradeS','Meisterzündung','Note S'],
  ['hardS','Pyro-Profi','Note S auf Schwer'],
  ['fc','Full Combo','Ein Lied ohne einen einzigen Fehler'],
  ['ap','Alles perfekt','Ein Lied nur mit „Perfekt“-Treffern'],
  ['c50','Kettenreaktion','50er Kombo'],
  ['c100','Dauerfeuer','100er Kombo'],
  ['c200','Unaufhaltsam','200er Kombo'],
  ['x8','Achtfach','Im Bloom den ×8-Multiplikator erreichen'],
  ['bloom10','Blütezeit','Bloom 10-mal zünden'],
  ['all10','Ganzer Hafen','Alle 10 Hauptlieder schaffen'],
  ['bonus','Zugabe','Alle 5 Bonuslieder schaffen'],
  ['unl5','Sammler','5 Spezial-Feuerwerke freischalten'],
  ['unl20','Feuerwerkskiste','20 Spezial-Feuerwerke freischalten'],
  ['unl45','Komplette Sammlung','Alle Spezial-Feuerwerke freischalten'],
  ['endless5','Ausdauer','5 Runden im Endlos-Modus'],
  ['own','Eigener Sound','Ein eigenes Lied schaffen'],
  ['versus','Duell','Ein Spiel zu zweit'],
  ['online','Gemeinsam','Ein Lied online mit Freunden spielen'],
  ['vis','Lichtshow','Den Visualizer ausprobieren'],
  ['daily','Tagwerk','Eine Tages-Challenge schaffen'],
  ['hiddenOk','Blindflug','Ein Lied mit „Versteckt“ schaffen'],
  ['turboA','Überschall','Note A oder besser mit Turbo'],
  ['goldAll','Goldrausch','Alle Goldraketen eines Liedes treffen'],
];
// ---------- Modifikatoren ----------
const MOD_INFO={mirror:['Spiegel',1.05],turbo:['Turbo',1.2],hidden:['Versteckt',1.25],sudden:['Plötzlich',1.2]};
function modMult(m){ let x=1; for(const k in MOD_INFO) if(m&&m[k]) x*=MOD_INFO[k][1]; return Math.round(x*100)/100; }
function modsLabel(m){ return Object.keys(MOD_INFO).filter(k=>m&&m[k]).map(k=>MOD_INFO[k][0]).join(' + '); }
// ---------- Tages-Challenge: jeden Tag ein anderes Lied mit Modifikatoren ----------
function dayKey(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function dailyPick(){
  let h=2166136261; for(const c of 'bbr'+dayKey()){ h^=c.charCodeAt(0); h=Math.imul(h,16777619)>>>0; }
  const pool=SONGS.map((s,i)=>i).filter(i=>!SONGS[i].custom); const idx=pool[h%pool.length];
  const diff=1+((h>>>5)%2); const opts=[{turbo:true},{mirror:true},{hidden:true},{sudden:true},{mirror:true,turbo:true},{turbo:true,sudden:true}];
  return {idx, diff, mods:opts[(h>>>9)%opts.length]};
}
function renderDaily(){ const b=document.getElementById('t-daily'); if(!b) return; progInit(); const d=dailyPick(), done=SAVE.dailyDone===dayKey();
  b.innerHTML='<span>Tages-Challenge'+(done?' ✓':'')+'</span><small>'+SONGS[d.idx].title+' · '+DIFF_NAMES[d.diff]+' · '+modsLabel(d.mods)+(done?' · geschafft':' · Bonus-XP')+'</small>'; }
function progInit(){ if(!SAVE.ach) SAVE.ach={}; if(!SAVE.xp) SAVE.xp=0; if(!SAVE.stats) SAVE.stats={blooms:0,games:0}; }
// Erfolg vergeben (einmalig) und kurz oben rechts einblenden
const ACHQ=[]; let achBusy=false;
function award(id){
  progInit(); if(SAVE.ach[id]) return false;
  const a=ACH.find(x=>x[0]===id); if(!a) return false;
  SAVE.ach[id]=Date.now(); storeSave(); ACHQ.push(a); achNext(); return true;
}
function achNext(){
  if(achBusy||!ACHQ.length) return; achBusy=true; const a=ACHQ.shift();
  const el=document.getElementById('achpop'); el.innerHTML='<b>Erfolg freigeschaltet</b><span>'+a[1]+'</span><small>'+a[2]+'</small>';
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  if(A.ctx) SFX.multUp(A.ctx.currentTime,4);
  setTimeout(()=>{ el.classList.remove('on'); setTimeout(()=>{ achBusy=false; achNext(); },400); },3200);
}
// Nach jedem Lied: Erfahrungspunkte und Erfolge
function progAfterGame(){
  progInit();
  const p=G.players[0]; if(!p) return null; const gr=gradeOf(p); const failed=G.failed||p.failed;
  let gain=Math.round(p.score/60)+p.hits*2;
  if(!failed) gain+=120; if(p.fc) gain+=250; gain+=({S:300,A:150,B:80,C:30})[gr.g]||0;
  gain=Math.round(gain*modMult(G.mods));
  if(G.mode==='practice') gain=Math.round(gain*0.4);
  let daily=false;
  if(G.daily && !failed && SAVE.dailyDone!==dayKey()){ gain=Math.round(gain*1.5)+300; SAVE.dailyDone=dayKey(); daily=true; award('daily'); }
  if(!failed && G.mode!=='practice' && p.goldTotal>=3 && p.goldHit===p.goldTotal) award('goldAll');
  if(!failed && G.mode!=='practice'){ if(G.mods.hidden) award('hiddenOk'); if(G.mods.turbo && (gr.g==='A'||gr.g==='S')) award('turboA'); }
  const before=levelOf(SAVE.xp); SAVE.xp+=gain; const after=levelOf(SAVE.xp); SAVE.stats.games++;
  const arcadeOk=(G.mode==='arcade'||G.mode==='versus')&&!failed;
  if(arcadeOk) award('first');
  if(arcadeOk && G.diff===2) award('hard');
  if(arcadeOk && (gr.g==='A'||gr.g==='S')) award('gradeA');
  if(arcadeOk && gr.g==='S'){ award('gradeS'); if(G.diff===2) award('hardS'); }
  if(!failed && G.mode!=='practice'){ if(p.fc) award('fc'); if(p.fc==='ALLES PERFEKT') award('ap'); }
  if(G.mode==='versus') award('versus');
  if(G.online) award('online');
  if(G.custom && !failed) award('own');
  if(G.mode==='endless' && G.lap-1>=5) award('endless5');
  const done=id=>[0,1,2].some(d=>SAVE.best[id+'_'+d]);
  if(SONGS.filter(s=>s.pack===1).every(s=>done(s.id))) award('all10');
  if(SONGS.filter(s=>s.pack===2).every(s=>done(s.id))) award('bonus');
  progUnlockAch();
  storeSave();
  return {gain, before, after, xp:SAVE.xp, daily};
}
function progUnlockAch(){ const n=SAVE.unlocked.length; if(n>=5) award('unl5'); if(n>=20) award('unl20'); if(n>=UNLOCKS.length) award('unl45'); }
function xpHtml(r){
  if(!r) return '';
  const up=r.after.level>r.before.level, pct0=up?0:r.before.into/r.before.need*100, pct1=r.after.into/r.after.need*100;
  return '<div class="xpbox"><div class="xprow"><span class="xprank">'+rankOf(r.after.level)+' · Stufe '+r.after.level+'</span><span class="xpgain">+'+r.gain.toLocaleString('de-DE')+' XP</span></div>'+
    '<div class="xpbar"><i style="--a:'+pct0.toFixed(1)+'%;--b:'+pct1.toFixed(1)+'%"></i></div>'+
    (r.daily?'<p class="xpup">Tages-Challenge geschafft · Bonus-XP!</p>':'')+(up?'<p class="xpup">Stufe '+r.after.level+' erreicht'+(rankOf(r.after.level)!==rankOf(r.before.level)?' · neuer Rang: '+rankOf(r.after.level):'')+'!</p>':'')+'</div>';
}
function renderAch(){
  progInit(); const box=document.getElementById('achlist'); box.innerHTML='';
  const L=levelOf(SAVE.xp); document.getElementById('ach-rank').textContent=rankOf(L.level)+' · Stufe '+L.level+' · '+L.into+'/'+L.need+' XP bis zur nächsten Stufe';
  let n=0;
  for(const [id,name,desc] of ACH){ const got=!!SAVE.ach[id]; if(got) n++;
    const d=document.createElement('div'); d.className='achcell'+(got?' got':'');
    d.innerHTML='<b>'+(got?'★ ':'☆ ')+name+'</b><small>'+desc+'</small>'; box.appendChild(d); }
  document.getElementById('ach-count').textContent=n+' von '+ACH.length+' Erfolgen';
}
