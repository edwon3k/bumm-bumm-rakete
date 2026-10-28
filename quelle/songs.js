// ===== Songs: eigene Arrangements gemeinfreier Klassik =====
// Melodie-Notation: "NOTE-LÄNGE" in Sechzehnteln, R = Pause, | = Taktstrich (16 Sechzehntel/Takt)
// Akkorde: ein Token pro Takt, "D,A" teilt den Takt in zwei Hälften.
const SONGS = [
  { id:'blumen', title:'Blumen-Duett Lounge', composer:'Léo Delibes', piece:'Blumenduett (Lakmé)', bpm:96, style:'triphop', lead:'ep', bass:'bass', pad:'ep', oct:0, pack:1,
    mel:'R-4 B4-4 C#5-4 D#5-4 | F#5-8 E5-4 D#5-4 | C#5-8 B4-4 C#5-4 | B4-16 | R-4 C#5-4 D#5-4 E5-4 | G#5-8 F#5-4 E5-4 | D#5-4 E5-4 F#5-4 D#5-4 | E5-16',
    chords:'E B A E A E B E' },
  { id:'largo', title:'Largo Lasershow', composer:'Antonín Dvořák', piece:'Sinfonie Nr. 9 „Aus der Neuen Welt“', bpm:126, style:'house', lead:'brass', bass:'bass', pad:'ep', orch:'str', oct:12, pack:1,
    mel:'E4-6 G4-2 G4-8 | E4-6 D4-2 C4-8 | D4-4 E4-4 G4-4 E4-4 | D4-16 | E4-6 G4-2 G4-8 | E4-6 D4-2 C4-8 | D4-4 E4-4 D4-4 C4-4 | C4-16',
    chords:'C Am F G C Am G C' },
  { id:'tell', title:'Galopp Turbo', composer:'Gioachino Rossini', piece:'Wilhelm-Tell-Ouvertüre', bpm:150, style:'skapunk', lead:'brass', bass:'bass', pad:'skank', oct:0, pack:1,
    mel:'G4-1 G4-1 G4-2 G4-1 G4-1 G4-2 G4-1 G4-1 C5-2 D5-2 E5-2 | G4-1 G4-1 G4-2 C5-1 C5-1 E5-2 D5-1 D5-1 B4-2 G4-4 | G4-1 G4-1 G4-2 G4-1 G4-1 G4-2 G4-1 G4-1 C5-2 D5-2 E5-2 | G4-1 G4-1 C5-2 E5-1 E5-1 G5-2 F5-1 D5-1 B4-2 C5-4 | E5-1 E5-1 E5-2 E5-1 E5-1 E5-2 E5-1 E5-1 A5-2 G5-2 F5-2 | E5-1 E5-1 E5-2 D5-1 D5-1 D5-2 C5-1 C5-1 B4-2 G4-4 | G4-1 G4-1 G4-2 G4-1 G4-1 G4-2 G4-1 G4-1 C5-2 D5-2 E5-2 | G4-1 G4-1 C5-2 E5-1 E5-1 G5-2 F5-1 D5-1 B4-2 C5-4',
    chords:'C G C G C G C C' },
  { id:'bergkoenig', title:'Bergkönig-Bassline', composer:'Edvard Grieg', piece:'In der Halle des Bergkönigs', bpm:138, style:'metal', lead:'guitar', bass:'pick', pad:'power', oct:-12, pack:1,
    mel:'A4-2 B4-2 C5-2 D5-2 E5-2 C5-2 E5-4 | D#5-2 B4-2 D#5-4 D5-2 Bb4-2 D5-4 | A4-2 B4-2 C5-2 D5-2 E5-2 C5-2 E5-2 A5-2 | G5-2 E5-2 C5-2 E5-2 G5-8 | E5-2 F#5-2 G#5-2 A5-2 B5-2 G#5-2 B5-4 | A#5-2 F#5-2 A#5-4 A5-2 F5-2 A5-4 | E5-2 F#5-2 G#5-2 A5-2 B5-2 G#5-2 B5-2 E6-2 | D6-2 B5-2 G#5-2 B5-2 D6-8',
    chords:'Am E Am C E B E E' },
  { id:'1812', title:'Ouvertüre 1812 Kaboom', composer:'Pjotr Tschaikowski', piece:'Ouvertüre 1812', bpm:128, style:'bigbeat', lead:'brass', bass:'bass', pad:'power', orch:'full', oct:0, pack:1,
    mel:'Bb5-4 Ab5-4 G5-4 F5-4 | Eb5-4 D5-4 C5-4 Bb4-4 | C5-2 D5-2 Eb5-2 F5-2 G5-4 Eb5-4 | F5-2 G5-2 Ab5-2 F5-2 Bb5-8 | Bb5-4 Ab5-4 G5-4 F5-4 | Eb5-4 F5-4 G5-4 Ab5-4 | Bb5-2 Bb5-2 C6-2 Bb5-2 Ab5-2 G5-2 F5-4 | Eb5-12 R-4',
    chords:'Eb Bb Ab Bb Eb Ab Bb Eb', cannon:true },
  { id:'walkueren', title:'Walküren-Warp', composer:'Richard Wagner', piece:'Walkürenritt', bpm:132, style:'metal', lead:'brass', bass:'pick', pad:'power', orch:'full', oct:0, pack:1,
    mel:'F#4-1 B4-3 F#4-1 B4-3 D5-4 B4-4 | B4-1 D5-3 B4-1 D5-3 F#5-4 D5-4 | D5-1 F#5-3 D5-1 F#5-3 A5-4 A4-4 | A4-1 D5-3 A4-1 D5-3 F#5-8 | F#4-1 B4-3 F#4-1 B4-3 D5-4 B4-4 | B4-1 D5-3 B4-1 D5-3 F#5-4 D5-4 | E5-1 G5-3 E5-1 G5-3 B5-4 G5-4 | F#5-2 E5-2 D5-2 C#5-2 F#5-8',
    chords:'Bm Bm D D Bm Bm Em F#' },
  { id:'mondschein', title:'Mondschein-Synthwave', composer:'Ludwig van Beethoven', piece:'Mondscheinsonate', bpm:116, style:'bigbeat', lead:'ep', bass:'bass', pad:'arp', orch:'str', oct:12, pack:1,
    mel:'G#4-3 G#4-1 G#4-12 | G#4-3 G#4-1 G#4-12 | A4-8 G#4-8 | F#4-4 B4-4 E4-8 | G#4-3 G#4-1 G#4-12 | G#4-3 G#4-1 C#5-12 | B4-4 A4-4 G#4-4 F#4-4 | G#4-16',
    chords:'C#m C#m A E C#m C#m F#m G#' },
  { id:'carmen', title:'Habanera Hi-Fi', composer:'Georges Bizet', piece:'Carmen (Habanera & Torero-Lied)', bpm:112, style:'latin', lead:'brass', bass:'bass', pad:'ep', oct:12, pack:1,
    mel:'D5-3 C#5-1 C5-2 C5-2 B4-3 Bb4-1 A4-2 A4-2 | Ab4-2 G4-2 F4-3 E4-1 F4-2 G4-2 F4-2 E4-2 | D5-3 C#5-1 C5-2 C5-2 B4-3 Bb4-1 A4-2 A4-2 | Ab4-2 G4-2 F4-3 E4-1 D4-8 | C5-3 D5-1 C5-4 A4-8 | A4-3 A4-1 G4-2 A4-2 Bb4-4 A4-4 | Bb4-3 G4-1 C5-4 A4-4 F4-2 D4-2 | G4-4 C4-4 F4-8',
    chords:'Dm A Dm Dm F C Bb F' },
  { id:'schicksal', title:'Schicksals-Shuffle', composer:'Ludwig van Beethoven', piece:'Sinfonie Nr. 5', bpm:136, style:'rock', lead:'guitar', bass:'pick', pad:'power', orch:'str', oct:0, pack:1,
    mel:'R-2 G4-2 G4-2 G4-2 Eb4-8 | R-2 F4-2 F4-2 F4-2 D4-8 | R-2 G4-2 G4-2 G4-2 Eb4-2 Ab4-2 Ab4-2 Ab4-2 | G4-2 Eb5-2 Eb5-2 Eb5-2 C5-8 | R-2 G4-2 G4-2 G4-2 D4-2 Ab4-2 Ab4-2 Ab4-2 | G4-2 F5-2 F5-2 F5-2 D5-8 | R-2 G5-2 G5-2 F5-2 Eb5-2 Eb5-2 D5-2 C5-2 | B4-2 B4-2 C5-2 D5-2 C5-8',
    chords:'Cm G Cm Cm G G Cm G' },
  { id:'toccata', title:'Orgel-Funk Toccata', composer:'Johann Sebastian Bach', piece:'Toccata und Fuge d-Moll', bpm:120, style:'funk', lead:'organ', bass:'slap', pad:'brass', oct:0, pack:1,
    mel:'A5-1 G5-1 A5-6 R-4 G5-1 F5-1 E5-1 D5-1 | C#5-4 D5-8 R-4 | A4-1 G4-1 A4-6 R-4 E4-2 F4-2 | C#4-4 D4-8 R-4 | A4-1 C#5-1 E5-1 G5-1 Bb5-1 G5-1 E5-1 C#5-1 A4-1 C#5-1 E5-1 G5-1 Bb5-1 G5-1 E5-1 C#5-1 | D5-1 F5-1 A5-1 D6-1 A5-1 F5-1 D5-1 A4-1 D5-1 F5-1 A5-1 D6-1 A5-4 | E5-2 F5-2 G5-2 A5-2 Bb5-2 A5-2 G5-2 F5-2 | E5-2 D5-2 C#5-4 D5-8',
    chords:'Dm A Dm A A Dm Gm A' },
  // ---- Bonus-Pack (wie das Rock Pack im Original: 5 weitere Stücke) ----
  { id:'hummel', title:'Hummel-Hyperdrive', composer:'Nikolai Rimski-Korsakow', piece:'Hummelflug', bpm:128, style:'surf', lead:'guitar', bass:'pick', pad:'power', oct:-12, pack:2,
    mel:'E6-1 D#6-1 D6-1 C#6-1 C6-1 F6-1 E6-1 D#6-1 D6-1 C#6-1 C6-1 B5-1 C6-1 C#6-1 D6-1 D#6-1 | E6-1 D#6-1 D6-1 C#6-1 C6-1 F6-1 E6-1 D#6-1 E6-1 D#6-1 D6-1 C#6-1 C6-1 B5-1 A#5-1 A5-1 | A5-1 G#5-1 G5-1 F#5-1 F5-1 A#5-1 A5-1 G#5-1 G5-1 F#5-1 F5-1 E5-1 F5-1 F#5-1 G5-1 G#5-1 | A5-1 G#5-1 G5-1 F#5-1 F5-1 A#5-1 A5-1 G#5-1 A5-4 E5-4 | E6-1 D#6-1 D6-1 C#6-1 C6-1 F6-1 E6-1 D#6-1 D6-1 C#6-1 C6-1 B5-1 C6-1 C#6-1 D6-1 D#6-1 | E6-1 D#6-1 D6-1 C#6-1 C6-1 F6-1 E6-1 D#6-1 E6-1 D#6-1 D6-1 C#6-1 C6-1 B5-1 A#5-1 A5-1 | A5-1 G#5-1 G5-1 F#5-1 F5-1 A#5-1 A5-1 G#5-1 G5-1 F#5-1 F5-1 E5-1 F5-1 F#5-1 G5-1 G#5-1 | A5-1 B5-1 C6-1 D6-1 E6-4 E5-4 A5-4',
    chords:'Am E Dm E Am E Dm Am' },
  { id:'freude', title:'Freude, Funken!', composer:'Ludwig van Beethoven', piece:'Ode an die Freude (Sinfonie Nr. 9)', bpm:140, style:'ska', lead:'brass', bass:'walk', pad:'skank', oct:12, pack:2,
    mel:'F#4-4 F#4-4 G4-4 A4-4 | A4-4 G4-4 F#4-4 E4-4 | D4-4 D4-4 E4-4 F#4-4 | F#4-6 E4-2 E4-8 | F#4-4 F#4-4 G4-4 A4-4 | A4-4 G4-4 F#4-4 E4-4 | D4-4 D4-4 E4-4 F#4-4 | E4-6 D4-2 D4-8 | E4-4 E4-4 F#4-4 D4-4 | E4-4 F#4-2 G4-2 F#4-4 D4-4 | E4-4 F#4-2 G4-2 F#4-4 E4-4 | D4-4 E4-4 A3-8 | F#4-4 F#4-4 G4-4 A4-4 | A4-4 G4-4 F#4-4 E4-4 | D4-4 D4-4 E4-4 F#4-4 | E4-6 D4-2 D4-8',
    chords:'D A D A D A D D A D A A D A D D' },
  { id:'zuckerfee', title:'Zuckerfee Zap', composer:'Pjotr Tschaikowski', piece:'Tanz der Zuckerfee (Nussknacker)', bpm:118, style:'house', lead:'bell', bass:'bass', pad:'ep', oct:12, pack:2,
    mel:'B4-2 G4-2 B4-2 A#4-2 G4-2 F#4-2 F#4-2 F#4-2 | E4-2 E4-2 E4-2 D#4-2 E4-2 D#4-2 E4-4 | E5-2 C5-2 E5-2 D#5-2 C5-2 B4-2 B4-2 B4-2 | A4-2 A4-2 A4-2 G4-2 F#4-4 B4-4 | B4-2 G4-2 B4-2 A#4-2 G4-2 F#4-2 F#4-2 F#4-2 | E4-2 E4-2 E4-2 D#4-2 E4-2 D#4-2 E4-4 | E5-2 C5-2 E5-2 D#5-2 C5-2 B4-2 B4-2 B4-2 | A4-2 G4-2 F#4-2 D#4-2 E4-8',
    chords:'Em Em Am B Em Em Am Em' },
  { id:'nachtmusik', title:'Kleine Nacht-Rakete', composer:'Wolfgang Amadeus Mozart', piece:'Eine kleine Nachtmusik', bpm:126, style:'disco', lead:'strings', bass:'octave', pad:'chicken', orch:'str', oct:12, pack:2,
    mel:'G4-4 R-2 D4-2 G4-4 R-2 D4-2 | G4-2 D4-2 G4-2 B4-2 D5-8 | C5-4 R-2 A4-2 C5-4 R-2 A4-2 | C5-2 A4-2 F#4-2 A4-2 D4-8 | G4-4 G4-2 B4-2 A4-2 G4-2 G4-2 F#4-2 | F#4-4 A4-2 C5-2 F#4-2 A4-2 G4-4 | G4-4 B4-2 A4-2 G4-2 G4-2 F#4-2 F#4-2 | F#4-2 A4-2 C5-2 F#4-2 G4-8',
    chords:'G G D D G D G G' },
  { id:'kanon', title:'Kanonen-Kanon', composer:'Johann Pachelbel', piece:'Kanon in D', bpm:124, style:'rock', lead:'guitar', bass:'pick', pad:'power', orch:'str', oct:0, pack:2, cannon:true,
    mel:'F#5-8 E5-8 | D5-8 C#5-8 | B4-8 A4-8 | B4-8 C#5-8 | D5-4 C#5-4 B4-4 A4-4 | G4-4 F#4-4 G4-4 E4-4 | D4-2 F#4-2 A4-2 G4-2 F#4-2 D4-2 F#4-2 E4-2 | D4-2 B3-2 D4-2 A4-2 G4-2 B4-2 A4-2 G4-2 | F#4-2 D4-2 E4-2 C#5-2 D5-2 F#5-2 A5-2 A4-2 | B4-2 G4-2 A4-2 F#4-2 D4-2 D5-2 D5-4 | G4-2 B4-2 A4-2 G4-2 F#4-2 A4-2 G4-2 E4-2 | D4-4 A4-4 D5-8',
    chords:'D,A Bm,F#m G,D G,A D,A Bm,F#m G,D G,A D,A Bm,F#m G,D G,A' },
];

// Elektro-Fassung (Standard): gleiche Melodien, aber Techno/Trance/Electro-Produktion wie im Original-Spiel üblich
const ELEKTRO={
  blumen:    {style:'deep',   bpm:112, lead:'supersaw', bass:'reese',   pad:'synpad', orch:null},
  largo:     {style:'trance', bpm:132, lead:'supersaw', bass:'rolling', pad:'synpad', orch:'str'},
  tell:      {style:'techno', bpm:145, lead:'hoover',   bass:'acid',    pad:'stab',   orch:null},
  bergkoenig:{style:'hardtek',bpm:140, lead:'hoover',   bass:'reese',   pad:'power',  orch:null},
  '1812':    {style:'breaks', bpm:128, lead:'supersaw', bass:'reese',   pad:'stab',   orch:'full'},
  walkueren: {style:'trance', bpm:136, lead:'supersaw', bass:'rolling', pad:'synpad', orch:'str'},
  mondschein:{style:'electro',bpm:112, lead:'supersaw', bass:'reese',   pad:'synpad', orch:null},
  carmen:    {style:'electro',bpm:120, lead:'acidlead', bass:'acid',    pad:'stab',   orch:null},
  schicksal: {style:'hardtek',bpm:138, lead:'hoover',   bass:'rolling', pad:'power',  orch:'str'},
  toccata:   {style:'techno', bpm:128, lead:'organ',    bass:'acid',    pad:'stab',   orch:null},
  hummel:    {style:'techno', bpm:132, lead:'acidlead', bass:'rolling', pad:'stab',   orch:null},
  freude:    {style:'trance', bpm:138, lead:'supersaw', bass:'rolling', pad:'synpad', orch:null},
  zuckerfee: {style:'deep',   bpm:122, lead:'pluck',    bass:'reese',   pad:'synpad', orch:null},
  nachtmusik:{style:'techno', bpm:128, lead:'supersaw', bass:'rolling', pad:'stab',   orch:'str'},
  kanon:     {style:'trance', bpm:132, lead:'supersaw', bass:'rolling', pad:'synpad', orch:'str'},
};
SONGS.forEach(s=>{ if(ELEKTRO[s.id]) s.elektro=ELEKTRO[s.id]; });
const NOTE_BASE = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function noteMidi(name){
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if(!m) throw new Error('Bad note '+name);
  return 12*(+m[3]+1) + NOTE_BASE[m[1]] + (m[2]==='#'?1:m[2]==='b'?-1:0);
}
function mtof(m){ return 440*Math.pow(2,(m-69)/12); }
function parseMelody(str, oct){
  const bars=[]; let notes=[], step=0, barStart=0;
  const toks=str.trim().split(/\s+/);
  for(const tok of toks){
    if(tok==='|'){ bars.push(step-barStart); barStart=step; continue; }
    const i=tok.lastIndexOf('-'); const n=tok.slice(0,i), len=+tok.slice(i+1);
    if(n!=='R') notes.push({step, len, midi:noteMidi(n)+(oct||0)});
    step+=len;
  }
  bars.push(step-barStart);
  return {notes, steps:step, bars};
}
function parseChord(tok){
  const m=/^([A-G])([#b]?)(.*)$/.exec(tok);
  const pc=(NOTE_BASE[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)+12)%12;
  const q=m[3];
  let iv=[0,4,7];
  if(q==='m') iv=[0,3,7]; else if(q==='7') iv=[0,4,7,10]; else if(q==='m7') iv=[0,3,7,10]; else if(q==='dim') iv=[0,3,6];
  return {pc, iv};
}
function parseChords(str){ // -> array per bar of [{chord, startFrac}]
  return str.trim().split(/\s+/).map(t=>t.split(',').map(parseChord));
}
function prepareSong(s){
  if(s._p) return s._p;
  const mel=parseMelody(s.mel, s.oct);
  const chords=parseChords(s.chords);
  let lo=999, hi=0; for(const n of mel.notes){ lo=Math.min(lo,n.midi); hi=Math.max(hi,n.midi); }
  s._p={mel, chords, nBars:mel.bars.length, lo, hi};
  return s._p;
}
