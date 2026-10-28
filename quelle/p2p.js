// ===== Online ohne Claude: Räume direkt von Browser zu Browser (PeerJS) =====
// Der Gastgeber ist der Knoten in der Mitte: Gäste schicken ihm ihren Zustand, er verteilt die Liste an alle.
// Gleiche Form wie claude.use('room'): join() liefert presence/peers/onPeers/leave, dazu fetchFile für eigene Lieder.
const P2P_PREFIX='bumm-bumm-rakete-v1-';
function p2pAvailable(){ return typeof Peer==='function'; }
function p2pOpen(id){
  return new Promise((res,rej)=>{
    const opts=Object.assign({debug:0}, window.PEER_OPTS||{});
    const p=id?new Peer(id,opts):new Peer(opts);
    const to=setTimeout(()=>{ try{ p.destroy(); }catch(e){} rej({msg:'Keine Verbindung zum Online-Dienst.'}); },12000);
    p.on('open',()=>{ clearTimeout(to); res(p); });
    p.on('error',e=>{ clearTimeout(to); try{ p.destroy(); }catch(x){}
      rej({code:e&&e.type, msg:e&&e.type==='unavailable-id'?'Diesen Raum-Code gibt es schon. Erstell einfach einen neuen.':'Keine Verbindung zum Online-Dienst.'}); });
  });
}
async function p2pJoin(name, asHost){
  const hostId=P2P_PREFIX+name;
  const S={peers:{}, subs:new Set(), errs:new Set(), conns:new Map(), mine:{}, peer:null, hostConn:null, files:{}, closed:false};
  let myKey=null;
  const list=()=>Object.entries(S.peers).map(([k,v])=>({id:k, kind:'viewer', sameTab:k===myKey, isMe:k===myKey, guest:false, presence:(v&&v.presence)||{}}));
  const fire=()=>{ const l=list(); S.subs.forEach(f=>{ try{ f(l); }catch(e){ console.warn(e); } }); };
  const fail=(msg)=>{ if(S.closed) return; S.errs.forEach(f=>{ try{ f({msg}); }catch(e){} }); };
  const send=(c,m)=>{ try{ if(c && c.open) c.send(m); }catch(e){ console.warn(e); } };
  const broadcast=()=>{ const m={t:'peers', peers:S.peers}; for(const c of S.conns.values()) send(c,m); };
  const clean=o=>{ const r={}; if(o && typeof o==='object') for(const k of Object.keys(o).slice(0,40)) r[k]=o[k]; return r; };

  if(asHost){
    S.peer=await p2pOpen(hostId); myKey=hostId;
    S.peers[myKey]={presence:{}};
    S.peer.on('connection',c=>{
      if(S.conns.size>=11){ c.on('open',()=>{ send(c,{t:'full'}); setTimeout(()=>c.close(),300); }); return; }
      S.conns.set(c.peer,c);
      c.on('open',()=>{ send(c,{t:'peers', peers:S.peers}); });
      c.on('data',m=>{
        if(!m||typeof m!=='object') return;
        if(m.t==='pres'){ S.peers[c.peer]={presence:clean(m.p)}; broadcast(); fire(); }
        else if(m.t==='getsong'){ p2pServeSong(S,c,String(m.h||'')); }
      });
      const gone=()=>{ S.conns.delete(c.peer); delete S.peers[c.peer]; broadcast(); fire(); };
      c.on('close',gone); c.on('error',gone);
    });
    S.peer.on('disconnected',()=>{ if(!S.closed) try{ S.peer.reconnect(); }catch(e){} });
  } else {
    S.peer=await p2pOpen(null); myKey=S.peer.id;
    const c=S.peer.connect(hostId,{reliable:true});
    await new Promise((res,rej)=>{
      const to=setTimeout(()=>rej({msg:'Raum nicht gefunden. Stimmt der Code, und ist der Gastgeber noch drin?'}),10000);
      S.peer.on('error',e=>{ if(e&&e.type==='peer-unavailable'){ clearTimeout(to); rej({msg:'Raum nicht gefunden. Stimmt der Code?'}); } });
      c.on('open',()=>{ clearTimeout(to); res(); });
    }).catch(e=>{ try{ S.peer.destroy(); }catch(x){} throw e; });
    S.hostConn=c;
    c.on('data',m=>{
      if(!m||typeof m!=='object') return;
      if(m.t==='peers'){ S.peers=Object.assign({}, m.peers||{}); S.peers[myKey]={presence:Object.assign({},S.mine)}; fire(); }
      else if(m.t==='song'){ const f=S.files[m.h]; if(f) f.part(m); }
      else if(m.t==='nosong'){ const f=S.files[m.h]; if(f) f.fail(); }
      else if(m.t==='full'){ fail('Der Raum ist voll.'); }
    });
    c.on('close',()=>{ for(const k of Object.keys(S.peers)) if(k!==myKey) delete S.peers[k]; fire(); fail('Der Gastgeber hat den Raum verlassen.'); });
  }

  return {
    p2p:true,
    presence:async(patch)=>{
      for(const [k,v] of Object.entries(patch||{})){ if(v===null) delete S.mine[k]; else S.mine[k]=v; }
      S.peers[myKey]={presence:Object.assign({},S.mine)};
      if(asHost) broadcast(); else send(S.hostConn,{t:'pres', p:S.mine});
      setTimeout(fire,0);
    },
    peers:()=>list(),
    onPeers:(fn,onErr)=>{ S.subs.add(fn); if(onErr) S.errs.add(onErr); setTimeout(()=>fn(list()),0); return ()=>{ S.subs.delete(fn); if(onErr) S.errs.delete(onErr); }; },
    leave:async()=>{ S.closed=true; for(const c of S.conns.values()) try{ c.close(); }catch(e){} try{ S.hostConn&&S.hostConn.close(); }catch(e){} setTimeout(()=>{ try{ S.peer.destroy(); }catch(e){} },300); },
    // Eigenes Lied beim Gastgeber abholen
    fetchFile:(h,onP)=>new Promise((res,rej)=>{
      if(!S.hostConn||!S.hostConn.open) return rej({msg:'Keine Verbindung zum Gastgeber.'});
      const parts=[]; let got=0; let to;
      const arm=()=>{ clearTimeout(to); to=setTimeout(()=>{ delete S.files[h]; rej({msg:'Das Lied kam nicht an.'}); },20000); };
      S.files[h]={ part:m=>{ arm(); const i=+m.i, n=+m.n; if(!(i>=0&&i<n&&n<=4000)) return; if(!parts[i]){ parts[i]=new Uint8Array(m.d); got++; } onP&&onP(got/n);
          if(got===n){ clearTimeout(to); delete S.files[h]; let len=0; for(const p of parts) len+=p.length; const out=new Uint8Array(len); let o=0; for(const p of parts){ out.set(p,o); o+=p.length; } res(out.buffer); } },
        fail:()=>{ clearTimeout(to); delete S.files[h]; rej({msg:'Der Gastgeber hat das Lied nicht mehr.'}); } };
      arm(); send(S.hostConn,{t:'getsong', h});
    }),
  };
}
async function p2pServeSong(S,c,h){
  const s=await ownFindByHash(h);
  if(!s){ c.send({t:'nosong', h}); return; }
  const u=new Uint8Array(s.rec.bytes), CH=60000, n=Math.ceil(u.length/CH);
  for(let i=0;i<n;i++){
    if(!c.open) return;
    c.send({t:'song', h, i, n, d:u.slice(i*CH,(i+1)*CH).buffer});
    // nicht den Puffer der Verbindung überfluten
    const dc=c.dataChannel; while(c.open && dc && dc.bufferedAmount>1e6) await new Promise(r=>setTimeout(r,30));
  }
}
