// ===== Feuerwerk über die Grafikkarte (WebGL2) =====
// Funken als leuchtende Spuren, HDR-Puffer mit echtem Überstrahlen (Bloom), Rauch, der von den
// Explosionen angeleuchtet wird, Spiegelung im Hafenbecken. Fällt auf das alte 2D-Zeichnen zurück,
// wenn WebGL2 fehlt.
const GFX={ok:false, gl:null, cv:null, dpr:1, w:0, h:0, inst:null, buf:null, n:0, cap:0, lights:[], dens:1};
const GFX_STRIDE=12;
const GFX_VS=`#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 iPosVel;   // x,y,vx,vy (CSS-Pixel)
layout(location=2) in vec4 iSzKind;   // size, kind, extra1, extra2
layout(location=3) in vec4 iCol;      // r,g,b,a (linear, HDR erlaubt)
uniform vec2 uRes; uniform vec3 uCam;
out vec2 vL; out vec4 vCol; out vec4 vP; out vec2 vWorld;
void main(){
  vec2 p=iPosVel.xy, v=iPosVel.zw; float sz=iSzKind.x, kind=iSzKind.y;
  vec2 world;
  if(kind<0.5){ // Funke: Quad entlang der Flugbahn gestreckt (Leuchtspur)
    vec2 d=-v*0.05; float len=length(d); vec2 ax=len>0.001?d/len:vec2(1.0,0.0); vec2 nx=vec2(-ax.y,ax.x);
    float R=sz*3.0; float hl=len*0.5;
    vec2 c=p+d*0.5; float u=aCorner.x*(hl+R), w=aCorner.y*R;
    world=c+ax*u+nx*w; vL=vec2(u,w); vP=vec4(hl,R,iSzKind.z,0.0);
  } else { // Lichtblitz, Ring, Rauch, Glühen: Quad um den Mittelpunkt
    float R=sz*(kind>2.5&&kind<3.5?1.25:1.0);
    world=p+aCorner*R; vL=aCorner; vP=vec4(R,iSzKind.z,iSzKind.w,0.0);
  }
  vCol=iCol; vWorld=world;
  vec2 s=(world-uRes*0.5)*uCam.x+uRes*0.5+uCam.yz;
  gl_Position=vec4(s.x/uRes.x*2.0-1.0, 1.0-s.y/uRes.y*2.0, 0.0, 1.0);
  gl_Position.w=1.0; vCol.a=iCol.a; vP.w=kind;
}`;
const GFX_FS=`#version 300 es
precision highp float;
in vec2 vL; in vec4 vCol; in vec4 vP; in vec2 vWorld;
uniform vec4 uLp[8]; uniform vec3 uLc[8]; uniform int uLn;
out vec4 o;
void main(){
  float kind=vP.w; vec3 col=vCol.rgb; float a=vCol.a;
  if(kind<0.5){ // Funke mit Spur: heller Kern am Kopf, Schweif verblasst
    float hl=vP.x, R=vP.y; float u=vL.x+hl; // 0 = Kopf
    float dx=max(abs(vL.x)-hl,0.0); float dist=length(vec2(dx,vL.y));
    float tail=hl>0.5? clamp(1.0-(u/(2.0*hl+0.0001))*0.85,0.15,1.0) : 1.0;
    if(vL.x<-hl) tail=1.0;
    float core=exp(-dist*dist/(R*R*0.03));
    float halo=exp(-dist*dist/(R*R*0.22));
    vec3 c=(mix(col,vec3(1.0),core*0.22)*core*1.25+col*halo*0.75)*tail;
    o=vec4(c*a,0.0);
  } else if(kind<1.5){ // Lichtblitz der Explosion
    float r=length(vL); float f=exp(-r*r*3.2)*(1.0-smoothstep(0.85,1.0,r));
    o=vec4(col*a*f,0.0);
  } else if(kind<2.5){ // Druckring
    float r=length(vL); float th=vP.y; float f=exp(-pow((r-0.86)/max(th,0.01),2.0))+exp(-r*r*14.0)*vP.z;
    o=vec4(col*a*f,0.0);
  } else if(kind<3.5){ // Rauch: deckt etwas ab und wird von nahen Explosionen angeleuchtet
    float r=length(vL); float n=sin(vWorld.x*0.045+vP.z)*sin(vWorld.y*0.05-vP.z*1.3)*0.18;
    float f=smoothstep(1.0,0.15,r+n); float al=a*f;
    vec3 lit=vec3(0.03,0.034,0.055);
    for(int i=0;i<8;i++){ if(i>=uLn) break; vec2 d=vWorld-uLp[i].xy; float L=uLp[i].w/(1.0+dot(d,d)/(uLp[i].z*uLp[i].z)); lit+=uLc[i]*L*0.28; }
    lit+=col*vP.y*0.35; // eigene Farbe der Explosion, aus der der Rauch stammt
    lit=min(lit,vec3(0.9));
    o=vec4(lit*al,al*0.8);
  } else { // weiches Glühen (Raketenkopf)
    float r=length(vL); float f=exp(-r*r*6.0)*1.6+exp(-r*r*40.0)*2.0; o=vec4(col*a*f,0.0);
  }
}`;
const GFX_QUAD_VS=`#version 300 es
layout(location=0) in vec2 aCorner; out vec2 vUv;
void main(){ vUv=aCorner*0.5+0.5; gl_Position=vec4(aCorner,0.0,1.0); }`;
// Bloom: Herunterrechnen mit Schwelle (erste Stufe) und weichem 5-Punkt-Filter
const GFX_DOWN_FS=`#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uT; uniform vec2 uPx; uniform float uThr; out vec4 o;
vec3 pre(vec3 c){ float m=max(c.r,max(c.g,c.b)); return c*max(m-uThr,0.0)/max(m,1e-4); }
vec3 tx(vec2 u){ return min(texture(uT,u).rgb,vec3(uThr>0.0?2.5:1e4)); }
void main(){ vec3 c=tx(vUv)*4.0;
  c+=tx(vUv+vec2(-uPx.x,-uPx.y)); c+=tx(vUv+vec2(uPx.x,-uPx.y)); c+=tx(vUv+vec2(-uPx.x,uPx.y)); c+=tx(vUv+vec2(uPx.x,uPx.y));
  c/=8.0; if(uThr>0.0) c=pre(c); o=vec4(c,1.0); }`;
const GFX_UP_FS=`#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uT; uniform vec2 uPx; out vec4 o;
void main(){ vec3 c=vec3(0.0);
  c+=texture(uT,vUv+vec2(-uPx.x*2.0,0.0)).rgb; c+=texture(uT,vUv+vec2(uPx.x*2.0,0.0)).rgb; c+=texture(uT,vUv+vec2(0.0,-uPx.y*2.0)).rgb; c+=texture(uT,vUv+vec2(0.0,uPx.y*2.0)).rgb;
  c+=texture(uT,vUv+vec2(-uPx.x,uPx.y)).rgb*2.0; c+=texture(uT,vUv+vec2(uPx.x,uPx.y)).rgb*2.0; c+=texture(uT,vUv+vec2(-uPx.x,-uPx.y)).rgb*2.0; c+=texture(uT,vUv+vec2(uPx.x,-uPx.y)).rgb*2.0;
  o=vec4(c/12.0,1.0); }`;
// Zusammensetzen: Szene + Bloom, Tonwert-Abbildung, durchsichtiger Hintergrund, Spiegelung im Wasser
const GFX_COMP_FS=`#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uHdr; uniform sampler2D uBloom; uniform float uBloomK; uniform vec3 uWater; uniform float uTime; out vec4 o;
vec3 tm(vec3 c){ c*=1.05; vec3 pc=c/(1.0+c*0.6)*1.25;
  // farbtreu: nach dem hellsten Kanal komprimieren, damit dichte Feuerwerke nicht zu weißen Flecken ausbrennen
  float L=max(c.r,max(c.g,c.b)); float Lt=L/(1.0+L*0.6)*1.25; vec3 hp=c*(Lt/max(L,1e-4)); hp=mix(hp,vec3(Lt),smoothstep(1.5,4.0,L)*0.4);
  return mix(pc,hp,0.6); }
vec4 look(vec2 uv){ vec4 h=texture(uHdr,uv); vec3 b=texture(uBloom,uv).rgb; vec3 c=tm(min(h.rgb,vec3(2.2))+b*uBloomK); return vec4(c,h.a); }
void main(){
  vec2 uv=vUv; vec4 s=look(uv); vec3 c=s.rgb; float al=s.a;
  if(uWater.x>0.5){ float wy=uWater.y; // Bildschirm-y von oben: 1-uv.y
    float y=1.0-uv.y; if(y>wy){ float dy=y-wy; float sy=wy-dy*4.0; float k=1.0-dy/(1.0-wy);
      if(sy>0.0){ float wob=sin(uTime*1.7+dy*90.0)*(0.0015+dy*0.02); vec4 r=look(vec2(uv.x+wob,1.0-sy)); c+=r.rgb*0.5*k*(0.75+0.25*sin(dy*400.0+uTime*3.0)); } } }
  float m=max(c.r,max(c.g,c.b)); float A=clamp(max(m,al),0.0,1.0);
  o=vec4(min(c,vec3(A)),A);
}`;
function gfxShader(gl,type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function gfxProgram(gl,vs,fs){ const p=gl.createProgram(); gl.attachShader(p,gfxShader(gl,gl.VERTEX_SHADER,vs)); gl.attachShader(p,gfxShader(gl,gl.FRAGMENT_SHADER,fs)); gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u={}; const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS); for(let i=0;i<n;i++){ const info=gl.getActiveUniform(p,i); const nm=info.name.replace(/\[0\]$/,''); u[nm]=gl.getUniformLocation(p,info.name); } return {p,u}; }
function gfxInit(){
  try{
    if(new URLSearchParams(location.search).has('alt')) return false;
    const cv=document.getElementById('cvg'); if(!cv) return false;
    const gl=cv.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
    if(!gl) return false;
    GFX.half=!!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    gl.getExtension('OES_texture_float_linear');
    GFX.gl=gl; GFX.cv=cv;
    GFX.pPart=gfxProgram(gl,GFX_VS,GFX_FS);
    GFX.pDown=gfxProgram(gl,GFX_QUAD_VS,GFX_DOWN_FS);
    GFX.pUp=gfxProgram(gl,GFX_QUAD_VS,GFX_UP_FS);
    GFX.pComp=gfxProgram(gl,GFX_QUAD_VS,GFX_COMP_FS);
    // Grundquad
    GFX.vaoP=gl.createVertexArray(); gl.bindVertexArray(GFX.vaoP);
    const qb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,qb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    GFX.ib=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,GFX.ib);
    const st=GFX_STRIDE*4;
    for(let k=0;k<3;k++){ gl.enableVertexAttribArray(1+k); gl.vertexAttribPointer(1+k,4,gl.FLOAT,false,st,k*16); gl.vertexAttribDivisor(1+k,1); }
    gl.bindVertexArray(null);
    GFX.vaoQ=gl.createVertexArray(); gl.bindVertexArray(GFX.vaoQ); gl.bindBuffer(gl.ARRAY_BUFFER,qb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0); gl.bindVertexArray(null);
    gfxEnsure(8000);
    cv.addEventListener('webglcontextlost',e=>{ e.preventDefault(); GFX.ok=false; gfxFallback(); });
    GFX.ok=true; cv.style.display='block';
    return true;
  }catch(e){ console.warn('Grafikkarten-Feuerwerk nicht verfügbar',e); GFX.ok=false; return false; }
}
function gfxFallback(){ if(GFX.cv) GFX.cv.style.display='none'; const b=document.getElementById('cvb'); if(b){ const x=b.getContext('2d'); x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,b.width,b.height); } }
function gfxEnsure(n){ if(n<=GFX.cap) return; GFX.cap=Math.ceil(n*1.3); GFX.inst=new Float32Array(GFX.cap*GFX_STRIDE); const gl=GFX.gl; gl.bindBuffer(gl.ARRAY_BUFFER,GFX.ib); gl.bufferData(gl.ARRAY_BUFFER,GFX.inst.byteLength,gl.DYNAMIC_DRAW); }
function gfxTarget(w,h){
  const gl=GFX.gl; const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
  if(GFX.half) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);
  else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const f=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,f); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){ if(GFX.half){ GFX.half=false; gl.deleteTexture(t); gl.deleteFramebuffer(f); return gfxTarget(w,h); } }
  return {t,f,w,h};
}
function gfxResize(){
  if(!GFX.ok) return;
  const gl=GFX.gl;
  GFX.dpr=Math.min(window.devicePixelRatio||1, PERF.low?1:1.5);
  const w=Math.max(1,Math.round(W*GFX.dpr)), h=Math.max(1,Math.round(H*GFX.dpr));
  GFX.cv.width=w; GFX.cv.height=h; GFX.cv.style.width=W+'px'; GFX.cv.style.height=H+'px'; GFX.w=w; GFX.h=h;
  for(const t of (GFX.targets||[])){ gl.deleteTexture(t.t); gl.deleteFramebuffer(t.f); }
  const T=[gfxTarget(w,h)]; let bw=w, bh=h;
  const levels=PERF.low?4:6;
  for(let i=0;i<levels;i++){ bw=Math.max(1,bw>>1); bh=Math.max(1,bh>>1); T.push(gfxTarget(bw,bh)); }
  GFX.targets=T;
  GFX.dens=PERF.low?1:2;
  FX.maxParts=PERF.low?5000:16000;
}
// Lichter für den Rauch: die hellsten aktuellen Blitze
function gfxLights(){
  const L=GFX.lights; L.length=0;
  for(const f of FX.flashes){ const k=f.life/f.max; L.push([f.x,f.y,f.r*0.9,k*k*f.str*1.6,f.c]); }
  for(const r of freeRockets){ if(r.x===undefined) continue; L.push([r.x,r.y,(r.far?40:70)*FX.scale,0.5,C.gold]); }
  L.sort((a,b)=>b[3]-a[3]); if(L.length>8) L.length=8;
  return L;
}
const GFX_LIN=COLORS.map(h=>{ const f=v=>{ v/=255; return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4); }; return [f(parseInt(h.slice(1,3),16)),f(parseInt(h.slice(3,5),16)),f(parseInt(h.slice(5,7),16))]; });
function gfxPush(x,y,vx,vy,size,kind,e1,e2,c,a){
  const i=GFX.n*GFX_STRIDE, d=GFX.inst; const rgb=Array.isArray(c)?c:GFX_LIN[c];
  d[i]=x; d[i+1]=y; d[i+2]=vx; d[i+3]=vy; d[i+4]=size; d[i+5]=kind; d[i+6]=e1; d[i+7]=e2; d[i+8]=rgb[0]; d[i+9]=rgb[1]; d[i+10]=rgb[2]; d[i+11]=a; GFX.n++;
}
function gfxRender(water){
  const gl=GFX.gl; if(!gl||!GFX.targets) return;
  gfxEnsure(FX.parts.length+FX.smoke.length+FX.flashes.length+FX.shocks.length+freeRockets.length+64);
  GFX.n=0;
  const t=FX.time;
  // 1) Rauch (normal gemischt) zuerst
  const smoke0=GFX.n;
  for(const m of FX.smoke){
    const a=Math.min(1,m.life/m.max*1.4)*Math.min(1,(m.max-m.life)*2);
    const lv=Math.min(1,m.lit+(m.tint||0)*(m.life/m.max));
    gfxPush(m.x,m.y,0,0,m.r*1.15,3,lv*0.5,(m.seed||(m.seed=Math.random()*20)),m.c,a*0.3);
  }
  const nSmoke=GFX.n-smoke0;
  // 2) Leuchtendes: Blitze, Ringe, Funken, Raketenköpfe (addiert)
  for(const f of FX.flashes){ const k=f.life/f.max; gfxPush(f.x,f.y,0,0,f.r*0.8,1,0,0,f.c,k*k*0.14*f.str); }
  for(const k of FX.shocks){ const u=1-k.life/k.max; const r=(16+u*150*FX.scale)*k.s; gfxPush(k.x,k.y,0,0,r,2,0.05+0.08*(1-u),u<0.3?(1-u/0.3)*0.8:0,k.c,(1-u)*1.2); }
  for(const p of FX.parts){
    let a=Math.min(1,(p.life/p.max)*1.7);
    if(p.fl&F_STROBE) a*= (Math.sin(t*38+p.seed*7)>0.2)?1.6:0.03;
    if(p.fl&F_TWINKLE) a*= 0.55+0.45*Math.sin(t*25+p.seed*9);
    if(a<=0.02) continue;
    const lf=p.life/p.max;
    let c=(p.fl&F_SHIFT && lf<0.5 && p.c2>=0)?p.c2:p.c;
    if(lf>0.9 && !(p.fl&F_STROBE)){ c=C.white; a*=0.6; }
    else if(lf<0.22 && !(p.fl&(F_STROBE|F_SHIFT))){ a*=0.55+0.45*Math.random(); if(lf<0.12 && c!==C.white && c!==C.silver) c=C.ember; }
    const streak=(p.fl&F_STREAK)?1.6:1.0;
    gfxPush(p.x,p.y,p.vx*streak,p.vy*streak,p.size*(0.7+0.3*lf),0,0,0,c,a*1.15);
  }
  for(const r of freeRockets){ if(r.x===undefined) continue; gfxPush(r.x,r.y,0,0,r.far?10:18,4,0,0,C.gold,1); }
  const n=GFX.n;
  gl.bindBuffer(gl.ARRAY_BUFFER,GFX.ib); gl.bufferSubData(gl.ARRAY_BUFFER,0,GFX.inst,0,n*GFX_STRIDE);
  const T=GFX.targets, P=GFX.pPart;
  gl.bindFramebuffer(gl.FRAMEBUFFER,T[0].f); gl.viewport(0,0,T[0].w,T[0].h);
  gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(P.p); gl.bindVertexArray(GFX.vaoP);
  gl.uniform2f(P.u.uRes,W,H); gl.uniform3f(P.u.uCam,CAM.z,CAM.sx,CAM.sy);
  const L=gfxLights(); const lp=new Float32Array(32), lc=new Float32Array(24);
  L.forEach((l,i)=>{ lp.set([l[0],l[1],l[2],l[3]],i*4); const c=GFX_LIN[l[4]]; lc.set([c[0],c[1],c[2]],i*3); });
  gl.uniform4fv(P.u.uLp,lp); gl.uniform3fv(P.u.uLc,lc); gl.uniform1i(P.u.uLn,L.length);
  gl.enable(gl.BLEND);
  if(nSmoke){ gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA); gfxDrawRange(smoke0,nSmoke); }
  gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ZERO,gl.ONE);
  if(n-nSmoke>0) gfxDrawRange(nSmoke,n-nSmoke);
  gl.bindVertexArray(null);
  // Bloom-Kette
  gl.disable(gl.BLEND); gl.bindVertexArray(GFX.vaoQ);
  const D=GFX.pDown; gl.useProgram(D.p); gl.activeTexture(gl.TEXTURE0); gl.uniform1i(D.u.uT,0);
  for(let i=1;i<T.length;i++){ const s=T[i-1], d=T[i]; gl.bindFramebuffer(gl.FRAMEBUFFER,d.f); gl.viewport(0,0,d.w,d.h); gl.bindTexture(gl.TEXTURE_2D,s.t); gl.uniform2f(D.u.uPx,1/s.w,1/s.h); gl.uniform1f(D.u.uThr,i===1?0.6:0); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); }
  const U=GFX.pUp; gl.useProgram(U.p); gl.uniform1i(U.u.uT,0); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE);
  for(let i=T.length-1;i>1;i--){ const s=T[i], d=T[i-1]; gl.bindFramebuffer(gl.FRAMEBUFFER,d.f); gl.viewport(0,0,d.w,d.h); gl.bindTexture(gl.TEXTURE_2D,s.t); gl.uniform2f(U.u.uPx,1/s.w,1/s.h); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); }
  gl.disable(gl.BLEND);
  // Zusammensetzen auf den sichtbaren Canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,GFX.w,GFX.h); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
  const Cp=GFX.pComp; gl.useProgram(Cp.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,T[0].t); gl.uniform1i(Cp.u.uHdr,0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,T[1].t); gl.uniform1i(Cp.u.uBloom,1);
  const bloomBoost=(G&&G.players&&G.players.some(p=>p.bloomOn))?1.35:1;
  gl.uniform1f(Cp.u.uBloomK,(PERF.low?0.4:0.55)*bloomBoost);
  gl.uniform3f(Cp.u.uWater,water?1:0,0.8,0); gl.uniform1f(Cp.u.uTime,camT);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.activeTexture(gl.TEXTURE0); gl.bindVertexArray(null);
}
function gfxDrawRange(first,count){
  // Instanz-Attribute ab "first" neu zeigen lassen (WebGL2 kennt kein baseInstance)
  const gl=GFX.gl, st=GFX_STRIDE*4; gl.bindBuffer(gl.ARRAY_BUFFER,GFX.ib);
  for(let k=0;k<3;k++) gl.vertexAttribPointer(1+k,4,gl.FLOAT,false,st,first*st+k*16);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,count);
}
// Mehr Funken pro Explosion, wenn die Grafikkarte zeichnet: jede Kugel bekommt leicht versetzte Geschwister
const _addP=addP;
addP=function(x,y,vx,vy,o){
  const p=_addP(x,y,vx,vy,o); if(!p||!GFX.ok||!GFX.cloning||GFX.dens<=1) return p;
  let extra=GFX.dens-1; while(extra>0){ if(extra<1 && Math.random()>extra) break; extra--;
    const j=0.06; const q=_addP(x,y,vx*(1+(Math.random()-0.5)*j)+(Math.random()-0.5)*14,vy*(1+(Math.random()-0.5)*j)+(Math.random()-0.5)*14,Object.assign({},o,{size:(o.size||2.2)*0.8}));
    if(!q) break; }
  return p;
};
const _launchBurst=launchBurst;
launchBurst=function(x,y,type,c,c2,s){ GFX.cloning=true; try{ _launchBurst(x,y,type,c,c2,s); } finally{ GFX.cloning=false; } };
