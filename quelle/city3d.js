// ===== 3D-Stadt (WebGL über three.js) =====
const CITY={ok:false};
function cityInit(){
  if(!window.THREE) return;
  try{
    const cv3=document.getElementById('cv3');
    const R=new THREE.WebGLRenderer({canvas:cv3, antialias:true, powerPreference:'high-performance'});
    R.setClearColor(0x03040c,1);
    const scene=new THREE.Scene();
    const cam=new THREE.PerspectiveCamera(58,1,2,4000);
    const B=40, ST=9, N=13;          // Blockgröße, Straßenbreite, Raster ±N
    const uni={uTime:{value:0},uFlash:{value:new THREE.Color(0,0,0)},uFlashPos:{value:new THREE.Vector3(0,400,0)},uFog:{value:new THREE.Color(0.012,0.016,0.045)},uCam:{value:new THREE.Vector3()},uBloom:{value:0}};
    const common=`
      uniform float uTime; uniform vec3 uFlash; uniform vec3 uFlashPos; uniform vec3 uFog; uniform vec3 uCam; uniform float uBloom;
      float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      vec3 neon(float s){ return s<0.25?vec3(1.0,0.15,0.75):s<0.5?vec3(0.1,0.9,1.0):s<0.75?vec3(0.6,0.25,1.0):vec3(1.0,0.45,0.1); }
      vec3 fogIt(vec3 c, vec3 w){ float d=length(w-uCam); float f=1.0-exp(-d*0.0009); return mix(c,uFog,f); }`;
    // --- Hochhäuser: ein InstancedMesh, Fenster prozedural im Shader ---
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
          vec3 base=mix(vec3(0.022,0.026,0.045),vec3(0.05,0.045,0.065),seed);
          vec3 col=base;
          if(n.y<0.5){
            float u=abs(n.x)>0.5?vW.z:vW.x;
            vec2 cell=vec2(u/3.4,vW.y/4.2); vec2 f=fract(cell); vec2 id=floor(cell);
            float win=step(0.16,f.x)*step(f.x,0.84)*step(0.2,f.y)*step(f.y,0.8);
            float r=h21(id+seed*91.7+(abs(n.x)>0.5?17.0:3.0)+sign(n.x+n.z)*5.0);
            float ratio=0.08+0.3*seed;
            float lit=step(r,ratio);
            vec3 wc=mix(vec3(1.0,0.7,0.36),vec3(0.55,0.78,1.0),step(0.75,h21(id*1.7+seed)));
            if(seed>0.86) wc=mix(wc,neon(h21(vec2(seed,1.0))),0.6);
            vec3 wcol=win*(lit*wc*(0.35+0.55*h21(id+3.1))+(1.0-lit)*vec3(0.015,0.02,0.035));
            // weit entfernte Fenster zu einem weichen Schimmer mitteln (kein Flimmern)
            vec2 fw=fwidth(cell); float aa=clamp(max(fw.x,fw.y)*2.2-0.35,0.0,1.0);
            col+=mix(wcol, wc*ratio*0.36*0.6+vec3(0.006,0.008,0.015), aa);
            // Neon-Kronen an manchen Türmen
            float top=vH-vW.y;
            if(seed>0.62 && top>0.6 && top<2.2) col+=neon(fract(seed*7.0))*2.2;
            if(seed>0.9 && fract(u/6.0)<0.06) col+=neon(fract(seed*3.0))*1.2*step(vW.y,vH-2.5);
          } else {
            col=base*0.7;
            if(vH>140.0){ float d=length(vW.xz-vC.xz); col+=vec3(1.0,0.05,0.05)*step(d,0.7)*step(0.5,fract(uTime*0.7+seed))*3.0; }
          }
          // Licht der Feuerwerke
          vec3 L=normalize(uFlashPos-vW);
          float diff=max(dot(n,L),0.0)*0.85+0.15;
          col+=uFlash*diff*(n.y>0.5?0.4:0.45)*(0.4+0.6*clamp(vW.y/120.0,0.0,1.0));
          gl_FragColor=vec4(fogIt(col,vW),1.0);
        }`});
    const lots=[];
    for(let gx=-N;gx<=N;gx++) for(let gz=-N;gz<=N;gz++){
      const x0=gx*B+ST, z0=gz*B+ST, s=B-ST;
      const d=Math.hypot(gx,gz)*B; const boost=1+3.2*Math.exp(-Math.pow(d/260,2));
      const k=Math.random();
      const parts = k<0.35?[[0,0,1,1]] : k<0.7?[[0,0,0.5,1],[0.5,0,0.5,1]] : [[0,0,0.5,0.5],[0.5,0,0.5,0.5],[0,0.5,0.5,0.5],[0.5,0.5,0.5,0.5]];
      if(gx===0&&gz===0) continue; // Platz in der Mitte
      for(const [px,pz,pw,pd] of parts){
        const w=s*pw-2.5, dd=s*pd-2.5; if(w<4||dd<4) continue;
        let h=(10+Math.pow(Math.random(),2.2)*70)*boost; if(Math.random()<0.04) h*=1.8;
        lots.push([x0+s*px+w/2+1.25, z0+s*pz+dd/2+1.25, w*(0.8+Math.random()*0.2), dd*(0.8+Math.random()*0.2), Math.min(h,320)]);
      }
    }
    const geo=new THREE.BoxGeometry(1,1,1); geo.translate(0,0.5,0);
    const im=new THREE.InstancedMesh(geo,bm,lots.length); const M=new THREE.Matrix4();
    lots.forEach((l,i)=>{ M.makeScale(l[2],l[4],l[3]); M.setPosition(l[0],0,l[1]); im.setMatrixAt(i,M); });
    scene.add(im);
    // --- Boden mit Straßenlicht und Verkehr ---
    const gm=new THREE.ShaderMaterial({uniforms:uni,
      vertexShader:`varying vec3 vW; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader:common+`
        varying vec3 vW;
        float cars(float along, float lane, float id, float dir, float speed){
          float x=along*0.11+dir*uTime*speed*(0.6+h21(vec2(id,lane)));
          return pow(max(0.0,sin(x+h21(vec2(id,lane*3.0))*40.0)),60.0);
        }
        void main(){
          float B=${B.toFixed(1)}, S=${ST.toFixed(1)};
          vec2 p=vW.xz+vec2(0.0); vec2 f=mod(p,B);
          float sx=step(f.x,S), sz=step(f.y,S);
          float street=max(sx,sz);
          vec3 col=mix(vec3(0.018,0.02,0.03),vec3(0.035,0.035,0.045),street);
          // Straßenlaternen
          float lx=exp(-pow(f.x-0.6,2.0)*0.8)+exp(-pow(f.x-S+0.6,2.0)*0.8);
          float lz=exp(-pow(f.y-0.6,2.0)*0.8)+exp(-pow(f.y-S+0.6,2.0)*0.8);
          col+=vec3(1.0,0.55,0.18)*0.18*(lx*sx*(1.0-sz)+lz*sz*(1.0-sx));
          // Verkehr: weiße Scheinwerfer in die eine, rote Rücklichter in die andere Richtung
          float idz=floor(p.y/B), idx=floor(p.x/B);
          float tz=sz*(1.0-sx), tx=sx*(1.0-sz);
          col+=vec3(1.0,0.95,0.85)*1.6*tz*exp(-pow(f.y-3.0,2.0)*1.5)*cars(p.x,1.0,idz,1.0,22.0);
          col+=vec3(1.0,0.1,0.08)*1.4*tz*exp(-pow(f.y-6.0,2.0)*1.5)*cars(p.x,2.0,idz,-1.0,22.0);
          col+=vec3(1.0,0.95,0.85)*1.6*tx*exp(-pow(f.x-3.0,2.0)*1.5)*cars(p.y,3.0,idx,1.0,22.0);
          col+=vec3(1.0,0.1,0.08)*1.4*tx*exp(-pow(f.x-6.0,2.0)*1.5)*cars(p.y,4.0,idx,-1.0,22.0);
          // Platz in der Mitte mit Neon-Ring
          float d=length(p-vec2(B*0.5+S*0.5));
          col+=neon(0.3)*0.9*exp(-pow(d-12.0,2.0)*0.4);
          col+=uFlash*0.2;
          gl_FragColor=vec4(fogIt(col,vW),1.0);
        }`});
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),gm); ground.rotation.x=-Math.PI/2; scene.add(ground);
    CITY.R=R; CITY.scene=scene; CITY.cam=cam; CITY.uni=uni; CITY.ang=Math.random()*6; CITY.center=new THREE.Vector3(B*0.5+ST*0.5,0,B*0.5+ST*0.5);
    CITY.ok=true;
    cityResize();
    document.body.classList.add('city3d');
  }catch(e){ console.warn('3D-Stadt nicht verfügbar',e); CITY.ok=false; }
}
function cityResize(){
  if(!CITY.ok) return;
  CITY.R.setPixelRatio(Math.min(window.devicePixelRatio||1, PERF.low?1:1.5));
  CITY.R.setSize(W,H,false);
  CITY.cam.aspect=W/H; CITY.cam.fov = W<H? 72:58; CITY.cam.updateProjectionMatrix();
}
function cityRender(dt,bloom){
  if(!CITY.ok) return;
  const u=CITY.uni; u.uTime.value+=dt;
  CITY.ang+=dt*0.035*(bloom?2.2:1);
  const c=CITY.center, r=W<H?190:270, hgt=W<H?440:390;
  const cam=CITY.cam;
  cam.position.set(c.x+Math.cos(CITY.ang)*r+CAM.sx*2, hgt+Math.sin(u.uTime.value*0.2)*8+CAM.sy*2, c.z+Math.sin(CITY.ang)*r);
  cam.lookAt(c.x-Math.cos(CITY.ang)*60, 30, c.z-Math.sin(CITY.ang)*60);
  u.uCam.value.copy(cam.position);
  const L=FX.light; const k=Math.min(1.4,L.v)*0.42;
  u.uFlash.value.setRGB(L.r/255*k, L.g/255*k, L.b/255*k);
  u.uFlashPos.value.set(c.x+Math.cos(CITY.ang)*40, 300, c.z+Math.sin(CITY.ang)*40);
  u.uBloom.value=bloom?1:0;
  CITY.R.render(CITY.scene,cam);
}
