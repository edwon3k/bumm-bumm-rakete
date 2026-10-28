// ---------- Arrangement: echte Band-Stile statt Synthesizer ----------
// Pro Spur 16 Sechzehntel: X = Akzent, x = normal, g = Ghost-Note, . = Pause
// k Bassdrum, s Snare, c Clap, m Rimshot, h Hi-Hat, o offene Hi-Hat, r Ride, t Tamburin, q Conga (X hoch, x tief), b Bass-Rhythmus
const STYLES = {
  ska:     {k:'X.......X.......', s:'....X.......X...', h:'x.X.x.X.x.X.x.X.', o:'..............x.', b:'x...x...x...x...', r:true},
  skapunk: {k:'X...x.x.X...x...', s:'....X.......X..g', h:'x.x.x.x.x.x.x.x.', o:'..x...x...x...x.', b:'x.x.x.x.x.x.x.x.'},
  rock:    {k:'X.....x.X.x.....', s:'....X.......X..g', h:'x.x.x.x.x.x.x.x.', o:'..............x.', b:'x.x.x.x.x.x.x.x.', r:true},
  metal:   {k:'X.x.X.x.X.x.X.x.', s:'....X.......X...', h:'x.x.x.x.x.x.x.x.', o:'', b:'X.xxX.xxX.xxX.xx', r:true},
  funk:    {k:'X..x..x...X..x..', s:'....X..g.g..X..g', h:'xgxgxgxgxgxgxgxg', o:'..............x.', b:'X..x.xx..x.x..x.'},
  bigbeat: {k:'X.x.......x.x...', s:'....X..g.x..X..g', h:'x.x.x.x.x.x.x.x.', o:'..x.......x.....', t:'..x...x...x...x.', b:'x.....x.x.x.....'},
  triphop: {k:'X......x..x.....', s:'....X.......X...', h:'x.g.x.gxx.g.x.g.', o:'', b:'x.........x.....', m:'..........x.....'},
  latin:   {k:'X..x..x.X..x..x.', s:'', m:'x..x..x...x.x...', h:'', t:'xgxgxgxgxgxgxgxg', q:'..x.X..x..x.X..x', b:'x..x..x.x..x..x.'},
  disco:   {k:'X...X...X...X...', s:'....X.......X...', c:'....x.......x...', h:'x...x...x...x...', o:'..x...x...x...x.', t:'xgxgxgxgxgxgxgxg', b:'x.x.x.x.x.x.x.x.'},
  house:   {k:'X...X...X...X...', s:'', c:'....X.......X...', h:'xgxgxgxgxgxgxgxg', o:'..x...x...x...x.', t:'..x...x...x...x.', b:'..x...x...x...x.'},
  surf:    {k:'X...x.x.X...x...', s:'....X.......X...', h:'x.x.x.x.x.x.x.x.', o:'', b:'x.x.x.x.x.x.x.x.', r:true},
  // ---- Elektro (synthetisiert) ----
  techno:  {k:'X...X...X...X...', c:'....X.......X...', h:'xgxgxgxgxgxgxgxg', o:'..x...x...x...x.', b:'..xx..xx..xx..xx', e:1},
  trance:  {k:'X...X...X...X...', c:'....X.......X...', h:'..x...x...x...x.', o:'..x...x...x...x.', b:'.xxx.xxx.xxx.xxx', e:1},
  hardtek: {k:'X...X...X...X...', c:'....X.......X...', h:'x.x.x.x.x.x.x.x.', o:'..x...x...x...x.', b:'.xx..xx..xx..xx.', e:1, hard:1},
  electro: {k:'X.....X...X.....', s:'....X.......X...', h:'x.x.x.xxx.x.x.x.', o:'......x.......x.', b:'x..x..x...x.x...', e:1},
  breaks:  {k:'X.........X.....', s:'....X.....X.X...', h:'x.x.x.x.x.x.x.xx', o:'..x.......x.....', b:'x.....x.x.....x.', e:1},
  deep:    {k:'X...X...X...X...', c:'....x.......x...', h:'..x...x...x...x.', o:'', t:'', b:'x..x..x...x..x..', e:1},
};
const VEL=c=>c==='X'?1:c==='x'?0.75:c==='g'?0.3:0;
const at=(p,s)=>p?VEL(p[s]):0;
function chordAt(P, bar, step){ const arr=P.chords[bar%P.chords.length]; const i=Math.min(arr.length-1, Math.floor(step/16*arr.length)); return arr[i]; }
function chordNotes(ch, base){ // Akkordtöne nahe 'base'
  return ch.iv.map(iv=>{ let m=ch.pc+iv; while(m<base) m+=12; while(m>=base+12) m-=12; return m; }).sort((a,b)=>a-b);
}
function bassRoot(ch){ let r=ch.pc+36; if(r<40) r+=12; return r; }
function guitarRoot(ch){ let r=ch.pc+40; if(r>51) r-=12; return r; }
// kind: intro | A | B | break | fill | build | C | outro | lap
function makeSection(song, kind, t0, bpm){
  const P=prepareSong(song), st=STYLES[song.style]||STYLES.rock;
  DRUMKIT=st.e?(st.hard?'eh':'e'):['rock','metal','surf','skapunk','bigbeat'].includes(song.style)?'rock':'std';
  const elek=!!st.e;
  const sd=60/bpm/4; const ev=[], cands=[];
  const E=(t,f)=>ev.push({t,f});
  const bassI = BASS[song.bass] || (song.bass==='octave'?BASS.slap:BASS.bass);
  const orch = song.orch, comp=song.pad;
  let bars, melBars=null;
  if(kind==='intro') bars=2; else if(kind==='fill'||kind==='build') bars=1; else if(kind==='outro') bars=2;
  else if(kind==='break') { bars=Math.ceil(P.nBars/2); melBars=[0,bars]; }
  else { bars=P.nBars; melBars=[0,bars]; }
  const lvl = {intro:0,A:1,B:2,C:3,lap:3,break:-1,fill:1,build:1,outro:0}[kind];
  const lastBar=P.nBars-1;
  for(let b=0;b<bars;b++){
    const cb = melBars? b : (kind==='intro'? b : lastBar);
    const half = P.chords[cb%P.chords.length].length>1 ? 8:16;
    for(let s=0;s<16;s++){
      const t=t0+(b*16+s)*sd;
      const ch=chordAt(P, kind==='outro'?0:cb, s);
      // ---------- Schluss-Schlag ----------
      if(kind==='outro'){
        if(b===0&&s===0){
          const notes=chordNotes(ch,60), dd=sd*28, br=bassRoot(ch), gr=guitarRoot(ch);
          E(t,tt=>{ DRUM.kick(tt); DRUM.crash(tt,1.3); DRUM.crash(tt+0.01,0.8); if(song.cannon) DRUM.cannon(tt); if(orch) DRUM.timpani(tt,1,mtof(ch.pc+36));
            bassI(tt,sd*14,mtof(br),1,A.music);
            if(comp==='power') COMP.power(tt,dd,gr,1.1,false);
            else if(comp==='brass'||comp==='skank'||comp==='chicken') COMP.brassStab(tt,notes,1.2,true);
            else COMP.epChord(tt,dd,notes,1.2);
            if(orch) strings(tt,dd,[notes[0]-12,...notes,notes[0]+12],1.4);
            LEAD[song.lead](tt,sd*12,mtof(notes[notes.length-1]),0.8,A.lead); });
          // Trommelwirbel zum Ausklingen
          for(let i=0;i<6;i++) E(t+sd*(4+i*0.5),tt=>DRUM.snare(tt,0.25*(1-i/6)));
        }
        continue;
      }
      // ---------- Aufbau: Snarewirbel + Riser ----------
      if(kind==='build'){
        const dens = s<8? (s%2===0) : true; if(dens) E(t,tt=>DRUM.snare(tt,0.3+s/16*0.75));
        if(s===0) E(t,tt=>DRUM.riser(tt,sd*16));
        if(s%4===0) E(t,tt=>DRUM.kick(tt,0.85));
        if(orch){ const tf=mtof(ch.pc+36); E(t,tt=>DRUM.timpani(tt,0.25+s/16*0.6,tf)); }
        else if(s>=12){ E(t,tt=>DRUM.tom(tt,0.7,[200,170,140,110][s-12])); }
        if(comp==='power' && s%2===0) { const r=guitarRoot(ch); E(t,tt=>COMP.power(tt,sd*1.5,r,0.5+s/16*0.5,true)); }
        if(s%2===0) cands.push({t,step:s,len:2,drum:true,lane: (s/2)%4, beat:sd*4});
        continue;
      }
      // ---------- Schlagzeug ----------
      if(kind==='fill'){
        if(s<8){ const kv=at(st.k,s); if(kv) E(t,tt=>DRUM.kick(tt,kv)); if(s===4) E(t,tt=>DRUM.snare(tt)); if(s%2===0) E(t,tt=>DRUM.hat(tt,0.7)); }
        else { const f=[220,220,170,170,135,135,100,100][s-8]; E(t,tt=>DRUM.tom(tt,s%2?0.7:0.95,f)); if(s%2===0) cands.push({t,step:s,len:2,drum:true,lane:3-((s-8)/2|0)%4, beat:sd*4}); }
        if(s===0) cands.push({t,step:0,len:4,drum:true,lane:0,beat:sd*4});
        if(s===4) cands.push({t,step:4,len:4,drum:true,lane:1,beat:sd*4});
      } else {
        const soft = lvl<0?0.5:1;
        const kv = lvl>=0 ? at(st.k,s) : 0;
        if(kv) E(t,tt=>DRUM.kick(tt,kv));
        if(lvl>=0 || s%8===4){
          const sv=at(st.s,s); if(sv && (sv>0.5 || lvl>=1)) E(t,tt=>DRUM.snare(tt,sv*soft));
          const cv=at(st.c,s); if(cv) E(t,tt=>DRUM.clap(tt,cv*soft));
          const mv=at(st.m,s); if(mv) E(t,tt=>DRUM.rim(tt,mv*soft));
        }
        const useRide = st.r && lvl>=3;
        const hv=at(st.h,s);
        if(useRide){ if(s%2===0) E(t,tt=>DRUM.ride(tt,s%4===0?1:0.7)); }
        else if(hv && (lvl!==0 || s%4===2)) E(t,tt=>DRUM.hat(tt,hv*soft));
        if(lvl>=2 && at(st.o,s)) E(t,tt=>DRUM.hat(tt,0.7,true));
        const tv=at(st.t,s); if(tv && lvl>=1) E(t,tt=>DRUM.tamb(tt,tv));
        const qv=st.q?st.q[s]:'.'; if(qv!=='.'&&qv&&lvl>=1) E(t,tt=>DRUM.conga(tt,0.8,qv==='X'));
        if(b===0&&s===0&&(kind==='B'||kind==='C'||kind==='lap')){ E(t,tt=>{ DRUM.crash(tt); if(orch) DRUM.timpani(tt,1,mtof(ch.pc+36)); if(song.cannon&&kind!=='B') DRUM.cannon(tt,0.45); }); }
        else if(lvl>=2 && s===0 && b%4===0 && b>0) E(t,tt=>DRUM.crash(tt,0.6));
        if(orch==='full' && lvl>=2 && s===0 && b%2===0){ const tf=mtof(ch.pc+36); E(t,tt=>DRUM.timpani(tt,0.6,tf)); }
        if(song.cannon && lvl>=2 && s===0 && b%4===3) E(t,tt=>DRUM.cannon(tt,0.8));
        // kleiner Fill am Ende jedes vierten Taktes
        if(lvl>=1 && b%4===3 && s>=12) E(t,tt=>DRUM.snare(tt,0.45+0.15*(s-12)));
        if(kind==='intro'){
          if(at(st.s,s)>0.5||at(st.c,s)>0.5) cands.push({t,step:s,len:4,drum:true,lane:(b*2+(s>8?1:0))%2?2:1,beat:sd*4});
          else if(kv && s%4===0 && b===1) cands.push({t,step:s,len:4,drum:true,lane:s===0?0:3,beat:sd*4});
        }
      }
      // ---------- Bass ----------
      const isFill = kind==='fill';
      const bv = at(st.b,s);
      if((bv && lvl>-1 && (!isFill || s<8)) || (lvl===-1 && s%8===0)){
        const root=bassRoot(ch); let m=root;
        let len=1; while(s+len<16 && !at(st.b,s+len) && len<8) len++;
        if(song.bass==='walk'){ // Walking Bass: Grundton, Terz, Quinte, chromatischer Durchgang
          const q=(s/4)|0; const nx=chordAt(P,cb+1,0); const nr=bassRoot(nx);
          m = q===0?root : q===1?root+ch.iv[1] : q===2?root+7 : (nr>root?nr-1:nr+1);
        } else if(song.bass==='octave' || song.style==='funk'){ const hits=st.b.slice(0,s).replace(/\./g,'').length; if(hits%2===1) m+=12; }
        else if(song.style==='latin'){ const hits=st.b.slice(0,s).replace(/\./g,'').length; if(hits%3===1) m+=7; }
        else if(song.style==='metal' && bv<1) m=root; // Pedalton
        if(lvl===-1) len=8;
        const dd=len*sd*(song.style==='metal'||song.style==='ska'?0.6:0.92), f=mtof(m), vv=(lvl===-1?0.7:1)*(bv||1);
        E(t,tt=>bassI(tt,dd,f,vv,A.music));
      }
      if(isFill) continue;
      // ---------- Begleitung ----------
      const notes=chordNotes(ch,62);
      if(lvl===-1){
        if(s%half===0){ const dd=half*sd; if(elek) E(t,tt=>sPad(tt,dd,[...chordNotes(ch,52),chordNotes(ch,52)[0]+12],1.2)); if(orch) E(t,tt=>strings(tt,dd,[notes[0]-12,...notes,notes[0]+12],elek?0.7:1.2)); else if(!elek) E(t,tt=>COMP.epChord(tt,dd,chordNotes(ch,57),0.9)); }
        if(elek && s%2===0){ const an=chordNotes(ch,57), m=an[(s/2)%an.length]; E(t,tt=>LEAD.pluck(tt,sd*1.5,mtof(m),0.45,eOut())); }
        if(comp==='power' && s%4===0){ const g=chordNotes(ch,52); const m=g[(s/4)%g.length]+12; E(t,tt=>ksPlay(tt,m,'clean',sd*4,0.35,A.music,false)); }
      } else if(lvl===0){ // Intro: Band zählt ein
        if(s===0){ const dd=sd*14, gr=guitarRoot(ch);
          if(comp==='power') E(t,tt=>COMP.power(tt,dd,gr,0.9,false));
          else if(comp==='brass') E(t,tt=>COMP.brassStab(tt,notes,1,b===1));
          else if(elek) E(t,tt=>sPad(tt,dd,chordNotes(ch,52),1));
          else E(t,tt=>COMP.epChord(tt,dd,chordNotes(ch,57),0.8));
          if(orch) E(t,tt=>strings(tt,dd,notes,0.9)); }
        if((comp==='skank'||comp==='chicken') && s%4===2) E(t,tt=>COMP.skank(tt,notes,0.8));
      } else {
        if(comp==='skank'){
          if(s%4===2) E(t,tt=>COMP.skank(tt,[...notes,notes[0]+12],1));
          if(lvl>=2 && (s%4===2||s%4===3)) { const on=chordNotes(ch,55); E(t,tt=>COMP.organBubble(tt,on,s%4===2?1:0.6)); }
          if(lvl>=3 && s===0 && b%2===0) E(t,tt=>COMP.brassStab(tt,notes,0.9,false));
        } else if(comp==='power'){
          const gr=guitarRoot(ch);
          if(song.style==='metal'){ const v=at(st.b,s); if(v){ const open = lvl>=3 && v===1 && s%8===0; E(t,tt=>COMP.power(tt,open?sd*7:sd*0.9,gr,v,!open)); } }
          else if(lvl===1){ if(s%2===0) E(t,tt=>COMP.power(tt,sd*1.2,gr,s%4===0?0.9:0.6,true)); }
          else if(lvl===2){ if(s%half===0) E(t,tt=>COMP.power(tt,half*sd*0.95,gr,1,false)); else if(s%2===0&&s%half>=half-4) E(t,tt=>COMP.power(tt,sd*1.1,gr,0.55,true)); }
          else { if(s%2===0) { const acc=s%8===0; E(t,tt=>COMP.power(tt,acc?sd*3.6:sd*1.6,gr,acc?1:0.75,!acc)); } }
        } else if(comp==='brass'){
          const pat='X..x..X...x.X...'; const v=at(pat,s);
          if(v && lvl>=1) E(t,tt=>COMP.brassStab(tt,notes,v,lvl>=2&&s===12&&b%2===1));
          if(lvl>=2 && s%2===1) E(t,tt=>COMP.scratch(tt,0.6));
        } else if(comp==='chicken'){
          if(s%2===1) E(t,tt=>COMP.scratch(tt,s%4===3?0.9:0.5));
          if(s%4===2) E(t,tt=>COMP.skank(tt,notes,0.75));
          if(lvl>=3 && s===0) E(t,tt=>COMP.brassStab(tt,notes,0.8,false));
        } else if(comp==='ep'){
          const pn = song.style==='house'?'X..x..x...x..x..' : song.style==='latin'?'x..x..x.x..x..x.' : null;
          if(pn){ const v=at(pn,s); if(v){ const dd=sd*1.6; E(t,tt=>COMP.epChord(tt,dd,notes,v*0.9)); } }
          else if(s%half===0){ const dd=half*sd; E(t,tt=>COMP.epChord(tt,dd,chordNotes(ch,57),0.9)); }
        } else if(comp==='stab'){
          const v=at('X..x..x...x..x..',s); if(v){ const sn=chordNotes(ch,55); E(t,tt=>sStab(tt,sn,v)); }
        } else if(comp==='synpad'){
          if(s%half===0){ const dd=half*sd; E(t,tt=>sPad(tt,dd,chordNotes(ch,52),lvl>=2?1.1:0.9)); }
        } else if(comp==='arp'){
          const an=chordNotes(ch,56); const seq=[an[0],an[1],an[2]];
          if(s%2===0||lvl>=3){ const m=seq[(s/(lvl>=3?1:2)|0)%3]+((s>=8&&lvl>=2)?12:0); const dd=sd*3; E(t,tt=>LEAD.ep(tt,dd,mtof(m),0.32,A.music)); }
        }
        if(elek && lvl>=2){ const an=chordNotes(ch,57); const m=an[s%an.length]+(s%8>=6?12:0); if(s%(lvl>=3?1:2)===0) E(t,tt=>LEAD.pluck(tt,sd*1.2,mtof(m),lvl>=3?0.32:0.26,eOut())); }
        if(elek && comp!=='synpad' && lvl>=3 && s%half===0){ const dd=half*sd; E(t,tt=>sPad(tt,dd,chordNotes(ch,52),0.8)); }
        // Orchester-Schicht
        if(orch && lvl>=2 && s%half===0){ const dd=half*sd; E(t,tt=>strings(tt,dd,[notes[0]-12,...notes,notes[0]+12],lvl>=3?1.1:0.8)); }
        if(orch==='full' && lvl>=3 && s%half===0){ const dd=half*sd, cn=chordNotes(ch,57); E(t,tt=>choir(tt,dd,cn,1)); }
      }
    }
  }
  // ---------- Melodie ----------
  if(melBars){
    const maxStep=melBars[1]*16;
    for(const n of P.mel.notes){
      if(n.step>=maxStep) continue;
      const t=t0+n.step*sd, d=n.len*sd*0.92, f=mtof(n.midi);
      const v = kind==='break'?0.8:1;
      E(t,tt=>LEAD[song.lead](tt,d,f,v,A.lead));
      if(lvl>=3 && E_LEADS.includes(song.lead)) { const f2=f/2; E(t,tt=>LEAD[song.lead](tt,d,f2,0.45,A.lead)); }
      else if(lvl>=3 && song.lead!=='guitar' && n.len>=2) { const f2=f*2; E(t,tt=>LEAD[song.lead](tt,d,f2,0.3,A.lead)); }
      if(lvl>=3 && song.lead==='guitar' && n.len>=4) { const f2=mtof(n.midi+12); E(t,tt=>LEAD.guitar(tt,d,f2,0.35,A.lead)); }
      const band = Math.min(3, Math.floor((n.midi-P.lo)*4/(P.hi-P.lo+1)));
      cands.push({t, step:n.step%16, len:n.len, midi:n.midi, lane:band, beat:sd*4, mel:true});
    }
  }
  ev.sort((a,b)=>a.t-b.t);
  return {ev, cands, dur:bars*16*sd, end:t0+bars*16*sd};
}
const ARCADE_PLAN=['intro','A','fill','B','break','build','C','outro'];
function buildArcade(song, tempo){
  const bpm=song.bpm*tempo; let t=0; const ev=[], cands=[]; const marks=[];
  const plan = prepareSong(song).nBars<=8 ? ['intro','A','fill','B','break','build','C','fill','lap','outro'] : ARCADE_PLAN;
  for(const k of plan){ const s=makeSection(song,k,t,bpm); marks.push({kind:k,t}); ev.push(...s.ev); cands.push(...s.cands); t=s.end; }
  ev.sort((a,b)=>a.t-b.t);
  return {ev, cands, dur:t+1.5, marks};
}
// Schwierigkeit: 0 leicht, 1 normal, 2 schwer
const DIFF_NAMES=['Leicht','Normal','Schwer'];
function makeChart(cands, diff, minT){
  const list=cands.slice().sort((a,b)=>a.t-b.t);
  const out=[]; let last=-9;
  for(const c of list){
    if(c.t<minT) continue;
    if(diff===0 && !(c.step%4===0 || c.len>=6)) continue;
    if(diff===1 && !(c.step%2===0 || c.len>=3)) continue;
    const gap = diff===0? c.beat*0.98 : diff===1? c.beat*0.49 : Math.max(c.beat*0.245, 0.12);
    if(c.t-last < gap - 1e-4) continue;
    let lane=c.lane;
    // Spur folgt der Melodiekontur: gleicher Ton = gleiche Spur, höher = weiter rechts, tiefer = weiter links
    const p=out.length?out[out.length-1]:null;
    if(p && c.midi!==undefined && p.midi!==undefined && c.t-p.t < c.beat*2.1){
      if(c.midi===p.midi) lane=p.lane;
      else if(lane===p.lane){ const dir=Math.sign(c.midi-p.midi); lane=p.lane+dir; if(lane<0||lane>3) lane=p.lane-dir; }
    }
    out.push({t:c.t, lane, midi:c.midi}); last=c.t;
    if(diff===2 && c.mel && c.len>=8 && c.step%4===0) out.push({t:c.t, lane:(lane+2)%4});
    if(diff===1 && c.mel && c.len>=12 && c.step===0) out.push({t:c.t, lane:(lane+2)%4});
  }
  return out;
}
