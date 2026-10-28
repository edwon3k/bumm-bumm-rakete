// ===== 3D-Stadt am Meer (WebGL über three.js) =====
// Blick über die Hafenstadt aufs Meer: Sternenhimmel mit Mond und Wolken, Parks mit Bäumen,
// Uferpromenade, ankernde Boote. Feuerwerk beleuchtet Wolken, Wasser und Häuser.
const CITY={ok:false};
function cityInit(){
  if(!window.THREE) return;
  try{
    const cv3=document.getElementById('cv3');
    const R=new THREE.WebGLRenderer({canvas:cv3, antialias:true, powerPreference:'high-performance'});
    R.setClearColor(0x05061a,1);
    const scene=new THREE.Scene();
    const cam=new THREE.PerspectiveCamera(58,1,2,9000);
    const B=40, ST=9, NX=24, NZ0=-22, SHORE=2;      // Blockgröße, Straßenbreite, Raster; Land bis Blockreihe SHORE
    const shoreZ=(SHORE+1)*B;                         // ab hier beginnt das Wasser
    const uni={uTime:{value:0},uFlash:{value:new THREE.Color(0,0,0)},uFlashPos:{value:new THREE.Vector3(0,400,600)},uCam:{value:new THREE.Vector3()},uBloom:{value:0},uBeat:{value:0}};
    const common=`
      uniform float uTime; uniform vec3 uFlash; uniform vec3 uFlashPos; uniform vec3 uCam; uniform float uBloom; uniform float uBeat;
      float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
      vec3 neon(float s){ return s<0.25?vec3(1.0,0.15,0.75):s<0.5?vec3(0.1,0.9,1.0):s<0.75?vec3(0.6,0.25,1.0):vec3(1.0,0.45,0.1); }
      const vec3 MOON=normalize(vec3(-0.42,0.2,1.0));
      vec3 skyGrad(float e){
        vec3 hor=vec3(0.15,0.07,0.19), mid=vec3(0.05,0.04,0.15), top=vec3(0.01,0.013,0.055);
        vec3 c=mix(hor,mid,smoothstep(0.0,0.16,e)); c=mix(c,top,smoothstep(0.12,0.65,e));
        c+=vec3(0.45,0.16,0.1)*exp(-max(e,0.0)*30.0)*0.3;        // warmer Schein am Horizont
        return c;
      }
      vec3 skyCol(vec3 d, bool detail){
        float e=d.y; vec3 c=skyGrad(e);
        float m=dot(d,MOON);
        c+=vec3(0.55,0.6,0.85)*pow(max(m,0.0),60.0)*0.35+vec3(0.3,0.32,0.5)*pow(max(m,0.0),8.0)*0.12;
        if(detail && e>0.0){
          c+=vec3(1.0,0.97,0.88)*smoothstep(0.99975,0.99985,m)*1.5;
          vec2 sc=vec2(atan(d.z,d.x),asin(clamp(e,-1.0,1.0)))*vec2(260.0,260.0);
          vec2 id=floor(sc), f=fract(sc)-0.5; float r=h21(id);
          float star=step(0.985,r)*smoothstep(0.3,0.0,length(f))*(0.6+0.4*sin(uTime*(1.5+r*3.0)+r*40.0));
          c+=vec3(0.85,0.9,1.0)*star*smoothstep(0.03,0.25,e)*(1.0-smoothstep(0.9993,0.9999,m));
          vec2 cp=d.xz/(e+0.08)*0.9+vec2(uTime*0.01,0.0);
          float cl=smoothstep(0.45,0.85,fbm(cp*1.3))*smoothstep(0.0,0.06,e)*(1.0-smoothstep(0.35,0.7,e));
          vec3 cc=vec3(0.10,0.07,0.16)+vec3(0.35,0.32,0.45)*pow(max(m,0.0),6.0)*0.6+uFlash*1.6;
          c=mix(c,cc,cl*0.85);
        }
        return c;
      }
      vec3 fogIt(vec3 c, vec3 w){ vec3 d=w-uCam; float f=1.0-exp(-length(d)*0.0004); vec3 dn=normalize(d); return mix(c,skyCol(vec3(dn.x,max(dn.y,0.0),dn.z),false)*0.7+uFlash*0.12,f); }`;
    // --- Himmel: große Kugel um die Kamera ---
    const sky=new THREE.Mesh(new THREE.SphereGeometry(8000,48,24), new THREE.ShaderMaterial({uniforms:uni, side:THREE.BackSide, depthWrite:false,
      vertexShader:`varying vec3 vD; void main(){ vD=position; vec4 wp=modelMatrix*vec4(position,1.0); gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader:common+`varying vec3 vD; void main(){ vec3 d=normalize(vD); vec3 c=skyCol(d,true); c+=uFlash*0.22*smoothstep(-0.05,0.4,d.y); gl_FragColor=vec4(c,1.0); }`}));
    sky.renderOrder=-10; scene.add(sky);
    // --- Hochhäuser ---
    const bm=new THREE.ShaderMaterial({uniforms:uni, extensions:{derivatives:true},
      vertexShader:`
        varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vH;
        void main(){
          mat4 im=mat4(1.0);
          #ifdef USE_INSTANCING
            im=instanceMatrix;
          #endif
          vec4 wp=modelMatrix*im*vec4(position,1.0);
          vW=wp.xyz; vN=normalize(mat3(modelMatrix*im)*normal);
          vC=(modelMatrix*im*vec4(0.0,0.0,0.0,1.0)).xyz; vH=length(im[1].xyz);
          gl_Position=projectionMatrix*viewMatrix*wp;
        }`,
      fragmentShader:common+`
        varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vH;
        void main(){
          vec3 n=normalize(vN); float seed=h21(vC.xz*0.37);
          vec3 base=mix(vec3(0.03,0.032,0.06),vec3(0.07,0.06,0.09),seed);
          vec3 col=base;
          if(n.y<0.5){
            float u=abs(n.x)>0.5?vW.z:vW.x;
            vec2 cell=vec2(u/3.4,vW.y/4.2); vec2 f=fract(cell); vec2 id=floor(cell);
            float win=step(0.16,f.x)*step(f.x,0.84)*step(0.2,f.y)*step(f.y,0.8);
            float r=h21(id+seed*91.7+(abs(n.x)>0.5?17.0:3.0)+sign(n.x+n.z)*5.0);
            float ratio=0.1+0.32*seed; float lit=step(r,ratio);
            vec3 wc=mix(vec3(1.0,0.72,0.4),vec3(0.6,0.8,1.0),step(0.78,h21(id*1.7+seed)));
            if(seed>0.88) wc=mix(wc,neon(h21(vec2(seed,1.0))),0.5);
            vec3 wcol=win*(lit*wc*(0.35+0.55*h21(id+3.1))+(1.0-lit)*vec3(0.02,0.025,0.045));
            vec2 fw=fwidth(cell); float aa=clamp(max(fw.x,fw.y)*2.2-0.35,0.0,1.0);
            col+=mix(wcol, wc*ratio*0.36*0.6+vec3(0.008,0.01,0.02), aa);
            float top=vH-vW.y;
            if(seed>0.7 && top>0.6 && top<2.0) col+=neon(fract(seed*7.0))*1.6*(1.0+uBeat*0.7);
            // Mondlicht auf den dem Meer zugewandten Seiten
            col+=vec3(0.06,0.07,0.12)*max(dot(n,MOON),0.0);
          } else {
            col=base*0.8;
            if(vH>120.0){ float d=length(vW.xz-vC.xz); col+=vec3(1.0,0.05,0.05)*step(d,0.7)*step(0.5,fract(uTime*0.6+seed))*3.0; }
          }
          vec3 L=normalize(uFlashPos-vW);
          float diff=max(dot(n,L),0.0)*0.85+0.15;
          col+=uFlash*diff*(n.y>0.5?0.45:0.5)*(0.4+0.6*clamp(vW.y/120.0,0.0,1.0));
          gl_FragColor=vec4(fogIt(col,vW),1.0);
        }`});
    const lots=[], trees=[], park=(gx,gz)=>{ if(gx===0&&gz===0) return false; const r=Math.abs(Math.sin(gx*12.9898+gz*78.233)*43758.5453)%1; return r<0.24 || (gz===SHORE && Math.abs(gx)<=2); };
    for(let gx=-NX;gx<=NX;gx++) for(let gz=NZ0;gz<=SHORE;gz++){
      const x0=gx*B+ST, z0=gz*B+ST, s=B-ST;
      if(gx===0&&gz===0) continue;
      if(park(gx,gz)){ // Park: lockere Baumgruppen
        for(let k=0;k<22;k++){ const tx=x0+2+Math.random()*(s-4), tz=z0+2+Math.random()*(s-4); if(Math.abs(tx-(x0+s/2))<1.6||Math.abs(tz-(z0+s/2))<1.6) continue; trees.push([tx,tz,1.8+Math.random()*1.8]); }
        continue; }
      // Hochhäuser an der Uferlinie und im Zentrum etwas höher, zum Rand hin flacher
      const dc=Math.hypot(gx*0.8,(gz-SHORE+1)*1.1), boost=(0.7+2.4*Math.exp(-Math.pow(dc/6,2)))*(Math.abs(gx)>16?0.6:1);
      const k=Math.random();
      const parts = k<0.35?[[0,0,1,1]] : k<0.7?[[0,0,0.5,1],[0.5,0,0.5,1]] : [[0,0,0.5,0.5],[0.5,0,0.5,0.5],[0,0.5,0.5,0.5],[0.5,0.5,0.5,0.5]];
      for(const [px,pz,pw,pd] of parts){
        const w=s*pw-2.5, dd=s*pd-2.5; if(w<4||dd<4) continue;
        let h=(8+Math.pow(Math.random(),2.2)*55)*boost; if(Math.random()<0.03) h*=1.7;
        lots.push([x0+s*px+w/2+1.25, z0+s*pz+dd/2+1.25, w*(0.8+Math.random()*0.2), dd*(0.8+Math.random()*0.2), Math.min(z0<-140?Math.min(h*0.75,78):h,230)]);
      }
    }
    const geo=new THREE.BoxGeometry(1,1,1); geo.translate(0,0.5,0);
    const im=new THREE.InstancedMesh(geo,bm,lots.length); const M=new THREE.Matrix4();
    lots.forEach((l,i)=>{ M.makeScale(l[2],l[4],l[3]); M.setPosition(l[0],0,l[1]); im.setMatrixAt(i,M); });
    scene.add(im);
    // --- Bäume in den Parks ---
    const tm=new THREE.ShaderMaterial({uniforms:uni,
      vertexShader:`varying vec3 vW; varying vec3 vN; varying float vS;
        void main(){ mat4 im=mat4(1.0);
          #ifdef USE_INSTANCING
            im=instanceMatrix;
          #endif
          vec4 wp=modelMatrix*im*vec4(position,1.0); vW=wp.xyz; vN=normalize(mat3(modelMatrix*im)*normal); vS=fract((im[3].x+im[3].z)*0.137); gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader:common+`varying vec3 vW; varying vec3 vN; varying float vS;
        void main(){ vec3 n=normalize(vN); vec3 col=mix(vec3(0.02,0.07,0.04),vec3(0.05,0.12,0.06),vS);
          col+=vec3(0.9,0.6,0.25)*0.14*clamp(1.0-vW.y/8.0,0.0,1.0);            // Laternenschein von unten
          col+=vec3(0.05,0.07,0.1)*max(dot(n,MOON),0.0);
          vec3 L=normalize(uFlashPos-vW); col+=uFlash*(max(dot(n,L),0.0)*0.6+0.15)*0.6;
          gl_FragColor=vec4(fogIt(col,vW),1.0); }`});
    const tg=new THREE.IcosahedronGeometry(1,1);
    const ti=new THREE.InstancedMesh(tg,tm,trees.length);
    trees.forEach((t,i)=>{ M.makeScale(t[2],t[2]*1.25,t[2]); M.setPosition(t[0],t[2]*1.1,t[1]); ti.setMatrixAt(i,M); });
    scene.add(ti);
    // --- Boden: Straßen mit Laternen, Parks, Uferpromenade (keine Autos) ---
    const gm=new THREE.ShaderMaterial({uniforms:uni,
      vertexShader:`varying vec3 vW; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader:common+`
        varying vec3 vW;
        void main(){
          float B=${B.toFixed(1)}, S=${ST.toFixed(1)}, SZ=${shoreZ.toFixed(1)};
          vec2 p=vW.xz; vec2 f=mod(p,B); vec2 id=floor(p/B);
          float sx=step(f.x,S), sz=step(f.y,S); float street=max(sx,sz);
          vec3 col=mix(vec3(0.022,0.024,0.034),vec3(0.04,0.04,0.05),street);
          float pr=fract(abs(sin(id.x*12.9898+id.y*78.233)*43758.5453));
          bool isPark=(pr<0.24 || (id.y==${SHORE.toFixed(1)} && abs(id.x)<=2.0)) && !(id.x==0.0&&id.y==0.0);
          if(isPark && street<0.5){
            vec2 q=f-vec2(S+(B-S)*0.5); float path=step(abs(q.x),0.9)+step(abs(q.y),0.9)+step(abs(length(q)-9.0),0.7);
            col=mix(vec3(0.012,0.035,0.02)*(0.8+0.4*vnoise(p*0.4)),vec3(0.07,0.06,0.05),clamp(path,0.0,1.0));
            float lamp=0.0; for(int i=0;i<4;i++){ float a=float(i)*1.5708+0.785; lamp+=exp(-dot(q-vec2(cos(a),sin(a))*9.0,q-vec2(cos(a),sin(a))*9.0)*0.12); }
            col+=vec3(1.0,0.75,0.4)*0.6*lamp;
          }
          float lx=exp(-pow(f.x-0.6,2.0)*0.8)+exp(-pow(f.x-S+0.6,2.0)*0.8);
          float lz=exp(-pow(f.y-0.6,2.0)*0.8)+exp(-pow(f.y-S+0.6,2.0)*0.8);
          col+=vec3(1.0,0.6,0.25)*0.16*(lx*sx*(1.0-sz)+lz*sz*(1.0-sx));
          // Uferpromenade mit Lichterkette
          float dz=SZ-p.y; float prom=step(0.0,dz)*step(dz,10.0);
          col=mix(col,vec3(0.06,0.055,0.06),prom);
          col+=vec3(1.0,0.8,0.5)*0.9*exp(-pow(dz-1.5,2.0)*0.9)*pow(0.5+0.5*sin(p.x*0.42),18.0);
          col+=vec3(1.0,0.7,0.4)*0.08*exp(-pow(dz-1.5,2.0)*0.05);
          // Platz in der Mitte mit Neon-Ring
          float d=length(p-vec2(B*0.5+S*0.5));
          col+=neon(0.3)*0.7*exp(-pow(d-12.0,2.0)*0.4);
          col+=uFlash*0.2;
          gl_FragColor=vec4(fogIt(col,vW),1.0);
        }`});
    const land=new THREE.Mesh(new THREE.PlaneGeometry(9000,3000),gm); land.rotation.x=-Math.PI/2; land.position.set(0,0,shoreZ-1500); scene.add(land);
    // --- Meer: Wellen spiegeln Himmel, Mond und Feuerwerk; ankernde Boote ---
    const boats=[[-180,380],[140,520],[-40,760],[300,980],[-360,1150],[60,1500]].map(b=>'vec2('+b[0].toFixed(1)+','+(b[1]+shoreZ).toFixed(1)+')').join(',');
    const sm=new THREE.ShaderMaterial({uniforms:uni,
      vertexShader:`varying vec3 vW; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader:common+`
        varying vec3 vW;
        const vec2 BOATS[6]=vec2[6](${boats});
        void main(){
          vec2 p=vW.xz; float t=uTime;
          vec2 g=vec2(0.0);
          g+=vec2(0.35,0.9)*cos(dot(p,vec2(0.035,0.09))+t*0.9)*0.06;
          g+=vec2(-0.7,0.6)*cos(dot(p,vec2(-0.07,0.06))+t*1.3)*0.04;
          g+=vec2(0.9,0.2)*cos(dot(p,vec2(0.16,0.04))+t*1.9)*0.025;
          g+=(vec2(vnoise(p*0.08+t*0.15),vnoise(p*0.08-t*0.12+7.0))-0.5)*0.08;
          vec3 n=normalize(vec3(-g.x,1.0,-g.y));
          vec3 v=normalize(vW-uCam); vec3 r=reflect(v,n); r.y=abs(r.y);
          float fr=0.04+0.96*pow(1.0-max(dot(-v,n),0.0),5.0);
          vec3 col=vec3(0.006,0.012,0.03);
          col=mix(col,skyCol(r,false)*0.75,clamp(fr*1.2,0.0,0.85));
          col+=vec3(1.0,0.95,0.85)*pow(max(dot(r,MOON),0.0),300.0)*1.3;                // Mondglitzern
          col+=vec3(0.55,0.6,0.8)*pow(max(dot(r,MOON),0.0),25.0)*0.12;
          // Spiegelung der Stadtlichter am Ufer
          float ds=p.y-${shoreZ.toFixed(1)};
          col+=vec3(1.0,0.72,0.4)*0.2*exp(-ds*0.02)*(0.5+0.5*sin(p.x*0.42+g.x*30.0))*smoothstep(0.0,6.0,ds);
          // Boote: kleines Licht und ein lang gezogener Lichtstreifen im Wasser
          for(int i=0;i<6;i++){ vec2 b=BOATS[i]+vec2(sin(t*0.3+float(i))*1.5,0.0); vec2 q=p-b;
            col+=vec3(1.0,0.85,0.6)*1.2*exp(-dot(q,q)*0.012)+vec3(1.0,0.3,0.2)*0.8*exp(-dot(q-vec2(6.0,0.0),q-vec2(6.0,0.0))*0.02)*step(0.5,fract(t*0.5+float(i)*0.37));
            col+=vec3(1.0,0.8,0.5)*0.35*exp(-q.x*q.x*0.05)*exp(-max(-q.y,0.0)*0.03)*step(q.y,0.0)*(0.6+0.4*sin(q.y*0.6+g.x*40.0)); }
          // Feuerwerk spiegelt sich im Wasser
          col+=uFlash*(0.25+1.1*fr)*(0.6+0.4*n.x);
          gl_FragColor=vec4(fogIt(col,vW),1.0);
        }`});
    const sea=new THREE.Mesh(new THREE.PlaneGeometry(16000,8000),sm); sea.rotation.x=-Math.PI/2; sea.position.set(0,-0.6,shoreZ+4000); scene.add(sea);
    CITY.R=R; CITY.scene=scene; CITY.cam=cam; CITY.uni=uni; CITY.sky=sky; CITY.ang=Math.random()*6; CITY.shoreZ=shoreZ;
    CITY.center=new THREE.Vector3(B*0.5+ST*0.5,0,B*0.5+ST*0.5);
    CITY.ok=true;
    cityResize();
    document.body.classList.add('city3d');
  }catch(e){ console.warn('3D-Stadt nicht verfügbar',e); CITY.ok=false; }
}
function cityResize(){
  if(!CITY.ok) return;
  CITY.R.setPixelRatio(Math.min(window.devicePixelRatio||1, PERF.low?1:1.5));
  CITY.R.setSize(W,H,false);
  CITY.cam.aspect=W/H; CITY.cam.fov = W<H? 72:56; CITY.cam.updateProjectionMatrix();
}
function cityRender(dt,bloom){
  if(!CITY.ok) return;
  const u=CITY.uni; u.uTime.value+=dt;
  CITY.ang+=dt*0.13*(bloom?1.6:1);
  const ik=CITY.introK||0, ie=ik*ik*(3-2*ik);
  // Kamerafahrt knapp über den Dächern: legt sich in die Kurven, wippt im Takt, zuckt bei Treffern nach vorn
  const a=CITY.ang, sz=CITY.shoreZ, cam=CITY.cam, port=W<H;
  const px=Math.sin(a)*260, pz=-290+Math.cos(a*0.7)*110, py=(port?130:112)+Math.sin(a*1.3)*16+BEAT.p*3;
  const tx=px+Math.sin(a*0.8+0.6)*360, tz=sz+160, ty=(port?30:42)-ie*40;
  const fx=tx-px, fz=tz-pz, fl=Math.hypot(fx,fz)||1, push=CAM.punch*22;
  cam.position.set(px+fx/fl*push+CAM.sx*2, py+ie*380+CAM.sy*2, pz+fz/fl*push-ie*260);
  const vx=Math.cos(a)*260, roll=Math.max(-0.12,Math.min(0.12,-vx*0.00045));
  cam.up.set(Math.sin(roll),Math.cos(roll),0);
  cam.lookAt(tx, ty, tz);
  const sw=Math.sin(a);
  u.uCam.value.copy(cam.position); CITY.sky.position.copy(cam.position);
  const L=FX.light; const k=Math.min(1.4,L.v)*0.42;
  u.uFlash.value.setRGB(L.r/255*k, L.g/255*k, L.b/255*k);
  u.uFlashPos.value.set(sw*60, 320, sz+260);
  u.uBloom.value=bloom?1:0; u.uBeat.value=BEAT.p;
  CITY.R.render(CITY.scene,cam);
}
