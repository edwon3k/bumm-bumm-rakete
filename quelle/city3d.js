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
        vec3 hor=vec3(0.2,0.06,0.15), mid=vec3(0.06,0.03,0.11), top=vec3(0.006,0.008,0.035);
        vec3 c=mix(hor,mid,smoothstep(0.0,0.16,e)); c=mix(c,top,smoothstep(0.12,0.65,e));
        c+=vec3(0.55,0.17,0.12)*exp(-max(e,0.0)*24.0)*0.34;        // warmer Schein am Horizont
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
      // romantische Nachtstimmung: dunkler, Schatten violett, Lichter warm-rosé
      vec3 grade(vec3 c){ c*=0.78; float l=dot(c,vec3(0.3,0.59,0.11));
        c=mix(c*vec3(0.92,0.88,1.12), c*vec3(1.1,0.93,0.9), smoothstep(0.02,0.3,l));
        c+=vec3(0.012,0.0,0.01)*(1.0-smoothstep(0.0,0.1,l)); return c; }
      vec3 fogIt(vec3 c, vec3 w){ vec3 d=w-uCam; float f=1.0-exp(-length(d)*0.0004); vec3 dn=normalize(d); return mix(c,skyCol(vec3(dn.x,max(dn.y,0.0),dn.z),false)*0.7+uFlash*0.12,f); }`;
    // --- Himmel: große Kugel um die Kamera ---
    const sky=new THREE.Mesh(new THREE.SphereGeometry(8000,48,24), new THREE.ShaderMaterial({uniforms:uni, side:THREE.BackSide, depthWrite:false,
      vertexShader:`varying vec3 vD; void main(){ vD=position; vec4 wp=modelMatrix*vec4(position,1.0); gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader:common+`varying vec3 vD; void main(){ vec3 d=normalize(vD); vec3 c=skyCol(d,true); c+=uFlash*0.22*smoothstep(-0.05,0.4,d.y); gl_FragColor=vec4(grade(c),1.0); }`}));
    sky.renderOrder=-10; scene.add(sky);
    // --- Hochhäuser: drei Fassadentypen (Glas, Beton, Backstein) mit Fensterraster passend zur Kante ---
    const bm=new THREE.ShaderMaterial({uniforms:uni, extensions:{derivatives:true},
      vertexShader:`
        varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec4 vS;
        void main(){
          mat4 im=mat4(1.0);
          #ifdef USE_INSTANCING
            im=instanceMatrix;
          #endif
          vec4 wp=modelMatrix*im*vec4(position,1.0);
          vW=wp.xyz; vN=normalize(mat3(modelMatrix*im)*normal);
          vC=(modelMatrix*im*vec4(0.0,0.0,0.0,1.0)).xyz;
          vS=vec4(length(im[0].xyz),length(im[1].xyz),length(im[2].xyz),vC.y);   // Breite, Höhe, Tiefe, Sockel
          gl_Position=projectionMatrix*viewMatrix*wp;
        }`,
      fragmentShader:common+`
        varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec4 vS;
        float aaStep(float e, float x, float w){ return smoothstep(e-w,e+w,x); }
        float box2(vec2 f, vec2 lo, vec2 hi, vec2 w){ return aaStep(lo.x,f.x,w.x)*(1.0-aaStep(hi.x,f.x,w.x))*aaStep(lo.y,f.y,w.y)*(1.0-aaStep(hi.y,f.y,w.y)); }
        void main(){
          vec3 n=normalize(vN); float seed=h21(floor(vC.xz*0.37)+0.5);
          float top=vS.w+vS.y, y=vW.y-vS.w;
          int typ = seed<0.34?0 : seed<0.72?1 : 2;          // 0 Glas, 1 Beton, 2 Backstein
          vec3 col;
          vec3 v=normalize(vW-uCam);
          if(abs(n.y)<0.5){
            bool sx=abs(n.x)>0.5; float wid=sx?vS.z:vS.x;
            float u=(sx?vW.z-vC.z:vW.x-vC.x)*(sx?sign(n.x):-sign(n.z))+wid*0.5;      // 0..Breite entlang der Fassade
            float cw = typ==0?3.0 : typ==1?3.6 : 3.1;
            float fh = typ==0?3.7 : typ==1?4.0 : 3.3;
            float nc=max(1.0,floor(wid/cw)); cw=wid/nc;
            vec2 cell=vec2(u/cw,y/fh); vec2 f=fract(cell); vec2 id=floor(cell)+vec2(sx?37.0:0.0,0.0)+sign(n.x+n.z)*5.0;
            vec2 fw=fwidth(cell)*0.9+0.002; float far=clamp(max(fw.x,fw.y)*2.0-0.4,0.0,1.0);
            // Fassadenmaterial
            vec2 tp=vec2(u,y);
            float grime=fbm(tp*vec2(0.15,0.05)+seed*40.0);                         // Schmutzschlieren von oben nach unten
            float streak=vnoise(vec2(u*1.3,y*0.04+seed*9.0));
            vec3 wall;
            if(typ==0){ wall=mix(vec3(0.07,0.08,0.1),vec3(0.1,0.1,0.12),seed*2.0); }
            else if(typ==1){ wall=mix(vec3(0.06,0.057,0.062),vec3(0.095,0.088,0.085),fract(seed*7.3))*(0.75+0.35*grime)*(0.92+0.08*streak); }
            else { vec2 bk=vec2(tp.x/0.62+step(0.5,fract(tp.y/0.26*0.5))*0.5,tp.y/0.26); vec2 bf=fract(bk);
              float mort=1.0-box2(bf,vec2(0.06),vec2(0.94),fwidth(bk)*0.8+0.01); float bfar=clamp(length(fwidth(bk))*1.5-0.3,0.0,1.0);
              vec3 brick=mix(vec3(0.16,0.065,0.045),vec3(0.2,0.1,0.06),h21(floor(bk)))*(0.8+0.3*grime);
              wall=mix(mix(brick,vec3(0.11,0.1,0.09),mort*0.7),brick*0.9,bfar); }
            wall*=0.5;                                                              // Türme fast schwarz, nur Fenster leuchten
            // Fenster
            vec2 lo = typ==0?vec2(0.04,0.08) : typ==1?vec2(0.2,0.22) : vec2(0.24,0.2);
            vec2 hi = typ==0?vec2(0.96,0.92) : typ==1?vec2(0.8,0.82) : vec2(0.76,0.78);
            float win=box2(f,lo,hi,fw);
            float frame=typ==0?0.0:box2(f,lo-0.04,hi+0.04,fw)*(1.0-win);         // Fensterlaibung
            float r=h21(id+seed*91.7), r2=h21(id*1.71+seed), r3=h21(id*0.37+7.0+seed);
            float ratio=0.12+0.3*seed+0.06*sin(seed*20.0);
            float lit=step(r,ratio);
            vec3 wc=mix(vec3(1.0,0.62,0.32),vec3(1.0,0.8,0.55),r2);
            if(r2>0.93) wc=vec3(0.62,0.8,1.0);
            if(seed>0.9) wc=mix(wc,neon(h21(vec2(seed,1.0))),0.45);
            // Innenraum: Deckenlicht oben heller, Vorhänge, ab und zu flackernder Fernseher
            vec2 q=(f-lo)/(hi-lo);
            float inner=(0.7+0.75*q.y)*(0.8+0.6*h21(id+3.1));
            float curt=r3<0.35? smoothstep(0.0,0.12,q.x)*smoothstep(1.0,0.88,q.x)*0.6+0.4 : r3<0.55? mix(1.0,0.45,step(0.5,q.x)) : 1.0;
            vec3 tv=vec3(0.35,0.5,1.0)*(0.6+0.4*sin(uTime*7.0+r*50.0)*sin(uTime*2.3+r*13.0));
            vec3 room=lit*(r3>0.92? tv*0.8 : wc*inner*curt);
            // dunkles Glas spiegelt Himmel und Feuerwerk
            vec3 rf=reflect(v,n); rf.y=abs(rf.y);
            float fr=0.08+0.6*pow(1.0-max(dot(-v,n),0.0),3.0);
            vec3 glassRef=skyCol(rf,false)*(typ==0?1.5:0.7)*(0.8+0.4*r2)+uFlash*0.6;
            vec3 tint=typ==0?mix(vec3(0.02,0.035,0.06),vec3(0.03,0.05,0.05),step(0.5,fract(seed*13.0))):vec3(0.012,0.015,0.025);
            vec3 glass=mix(tint*(0.8+0.5*r3),glassRef,typ==0?min(1.0,fr+0.25):fr)+room*(typ==0?0.75:0.95);
            // Glasfassade: durchgehende Brüstungsbänder und feine Pfosten
            if(typ==0){ float band=1.0-box2(f,vec2(-1.0,0.12),vec2(2.0,1.0),fw); wall=mix(wall,vec3(0.07,0.08,0.11),band); }
            vec3 fac=mix(wall,glass,win)+frame*vec3(0.03,0.03,0.035);
            // Gesimse alle paar Etagen, Eckpfeiler, Dachkante
            float ledge=(typ==1)?(1.0-aaStep(0.06,fract(y/(fh*4.0)),fw.y*0.25)):0.0;
            float corner=1.0-aaStep(0.7,min(u,wid-u),0.15);
            fac=mix(fac,wall*1.35+0.02,max(ledge*0.8,corner*0.5));
            float cap=aaStep(top-1.6,vW.y,0.2); fac=mix(fac,wall*1.5+0.025,cap);
            // Ladenzeilen im Erdgeschoss (nicht bei Aufbauten)
            if(vS.w<1.0 && typ!=0 && y<4.8){
              float shop=box2(vec2(fract(u/7.0),y),vec2(0.08,0.4),vec2(0.92,3.6),vec2(fwidth(u/7.0),fwidth(y))+0.01);
              float sh=h21(vec2(floor(u/7.0),seed*13.0));
              vec3 sc=sh<0.2?neon(fract(sh*17.0)):mix(vec3(1.0,0.78,0.5),vec3(0.9,0.95,1.0),step(0.6,sh));
              fac=mix(wall*0.8,sc*(0.5+0.4*smoothstep(0.4,3.6,y))*step(0.15,sh),shop);
              fac+=sc*0.5*exp(-pow(y-4.2,2.0)*6.0)*step(0.15,sh);              // Leuchtschild über der Tür
            }
            // Ferne: Mittelwert statt flimmerndes Raster
            vec3 avg=mix(wall,vec3(0.012,0.016,0.03)+wc*ratio*0.42,typ==0?0.85:0.42);
            col=mix(fac,avg,far);
            // Neon-Krone auf manchen Türmen
            if(seed>0.83 && top-vW.y>0.6 && top-vW.y<2.0 && vS.y>30.0) col+=neon(fract(seed*7.0))*1.1*(1.0+uBeat*0.6);
            // Mondlicht, Bodenschatten
            col+=wall*1.2*max(dot(n,MOON),0.0)*0.5;
            col*=0.55+0.45*smoothstep(0.0,10.0,vW.y);
            col+=vec3(1.0,0.62,0.3)*0.05*exp(-vW.y*0.25);                    // Straßenlicht von unten
          } else {
            // Dach: Kies mit Flecken, hellere Brüstung
            vec2 lp=vW.xz-vC.xz; vec2 e=vS.xz*0.5-abs(lp); float edge=1.0-aaStep(0.6,min(e.x,e.y),0.12);
            float gr=vnoise(vW.xz*2.3)*0.5+fbm(vW.xz*0.25+seed*9.0)*0.7;
            col=mix(vec3(0.045,0.045,0.055),vec3(0.07,0.065,0.07),gr)*(0.9+0.2*seed);
            col=mix(col,vec3(0.11,0.105,0.11),edge);
            if(vS.y>120.0){ float d=length(lp); col+=vec3(1.0,0.05,0.05)*smoothstep(0.45,0.15,d)*step(0.5,fract(uTime*0.6+seed))*3.0; }
            // Hubschrauberlandeplatz auf den höchsten Türmen
            if(vS.y>215.0 && seed>0.5){ float d=length(lp); col=mix(col,vec3(0.25,0.24,0.22),aaStep(5.5,d,0.15)*(1.0-aaStep(6.0,d,0.15)));
              vec2 hq=abs(lp); float H=max(step(abs(hq.x-1.5),0.3)*step(hq.y,2.2), step(hq.x,1.5)*step(hq.y,0.3)); col=mix(col,vec3(0.3,0.29,0.26),clamp(H,0.0,1.0)); }
          }
          vec3 L=normalize(uFlashPos-vW);
          float diff=max(dot(n,L),0.0)*0.85+0.15;
          col+=uFlash*diff*(n.y>0.5?0.45:0.5)*(0.4+0.6*clamp(vW.y/120.0,0.0,1.0));
          gl_FragColor=vec4(grade(fogIt(col,vW)),1.0);
        }`});
    const lots=[], trees=[], park=(gx,gz)=>{ if(gx===0&&gz===0) return false; const r=Math.abs(Math.sin(gx*12.9898+gz*78.233)*43758.5453)%1; return (r<0.24 && !(Math.abs(gx+0.5)<=1.5 && gz>=-15 && gz<=-1)) || (gz===SHORE && Math.abs(gx)<=2); };
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
        // Häuserschlucht unter der Kamera: entlang der Mittelstraße stehen hohe Türme
        const canyon=Math.abs(gx+0.5)<=2.5 && gz>=-15 && gz<=-1 ? Math.exp(-Math.pow((Math.abs(gx+0.5)-0.5)/1.6,2)) : 0;
        if(canyon>0) h=Math.max(h, 70+canyon*(30+Math.random()*80));
        lots.push([x0+s*px+w/2+1.25, z0+s*pz+dd/2+1.25, w*(0.8+Math.random()*0.2), dd*(0.8+Math.random()*0.2), Math.min(h,230)]);
      }
    }
    const geo=new THREE.BoxGeometry(1,1,1); geo.translate(0,0.5,0);
    // hohe Türme bekommen Rücksprünge (gestufte Aufbauten), Dächer Technik: Lüfter, Wassertanks, Antennen
    const boxes=[], props=[], tanks=[], ants=[];
    for(const l of lots){ const [x,z,w,d,h]=l;
      if(h>70 && Math.random()<0.7){ const h1=h*(0.55+Math.random()*0.15); boxes.push([x,z,w,d,h1,0]);
        const w2=w*(0.62+Math.random()*0.18), d2=d*(0.62+Math.random()*0.18), h2=h-h1; boxes.push([x,z,w2,d2,h2,h1]);
        if(Math.random()<0.5){ boxes.push([x,z,w2*0.55,d2*0.55,Math.min(14,h2*0.3),h]); } }
      else boxes.push([x,z,w,d,h,0]); }
    for(const bx of boxes){ const [x,z,w,d,h,y0]=bx, tp=y0+h; if(w<7||d<7) continue;
      const nAC=1+Math.floor(Math.random()*4);
      for(let k=0;k<nAC;k++){ const aw=1.5+Math.random()*3, ad=1.5+Math.random()*3; props.push([x+(Math.random()-0.5)*(w-aw-2),z+(Math.random()-0.5)*(d-ad-2),aw,ad,1+Math.random()*1.8,tp]); }
      if(tp>18 && tp<80 && Math.random()<0.3) tanks.push([x+(Math.random()-0.5)*(w-6),z+(Math.random()-0.5)*(d-6),tp]);
      if(tp>95 && Math.random()<0.55) ants.push([x+(Math.random()-0.5)*w*0.3,z+(Math.random()-0.5)*d*0.3,8+Math.random()*22,tp]); }
    const im=new THREE.InstancedMesh(geo,bm,boxes.length); const M=new THREE.Matrix4();
    boxes.forEach((l,i)=>{ M.makeScale(l[2],l[4],l[3]); M.setPosition(l[0],l[5],l[1]); im.setMatrixAt(i,M); });
    scene.add(im);
    const pm=new THREE.ShaderMaterial({uniforms:uni,
      vertexShader:`varying vec3 vW; varying vec3 vN; varying vec4 vS;
        void main(){ mat4 im=mat4(1.0);
          #ifdef USE_INSTANCING
            im=instanceMatrix;
          #endif
          vec4 wp=modelMatrix*im*vec4(position,1.0); vW=wp.xyz; vN=normalize(mat3(modelMatrix*im)*normal);
          vS=vec4(length(im[0].xyz),length(im[1].xyz),im[3].x+im[3].z,im[3].y); gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader:common+`varying vec3 vW; varying vec3 vN; varying vec4 vS;
        void main(){ vec3 n=normalize(vN); float s=fract(vS.z*0.173);
          vec3 col=mix(vec3(0.07,0.07,0.08),vec3(0.12,0.115,0.11),s)*(0.85+0.3*vnoise(vW.xz*3.0+vW.y*2.0));
          if(abs(n.y)<0.5) col*=0.75+0.25*step(0.5,fract(vW.y*2.2));   // Lamellen
          col+=vec3(0.06,0.07,0.11)*max(dot(n,MOON),0.0);
          bool ant=vS.x<1.0 && vS.y>6.0;
          if(ant){ col=vec3(0.08); float tp=vS.w+vS.y; col+=vec3(1.0,0.08,0.05)*3.0*step(tp-1.2,vW.y)*step(0.45,fract(uTime*0.7+s)); }
          vec3 L=normalize(uFlashPos-vW); col+=uFlash*(max(dot(n,L),0.0)*0.7+0.2)*0.6;
          gl_FragColor=vec4(grade(fogIt(col,vW)),1.0); }`});
    const pgeo=new THREE.BoxGeometry(1,1,1); pgeo.translate(0,0.5,0);
    const allP=props.map(p=>[p[0],p[1],p[2],p[3],p[4],p[5]]).concat(ants.map(a=>[a[0],a[1],0.5,0.5,a[2],a[3]]));
    const pi=new THREE.InstancedMesh(pgeo,pm,Math.max(1,allP.length));
    allP.forEach((p,i)=>{ M.makeScale(p[2],p[4],p[3]); M.setPosition(p[0],p[5],p[1]); pi.setMatrixAt(i,M); });
    scene.add(pi);
    if(tanks.length){ const tg2=new THREE.CylinderGeometry(1.6,1.6,4,10); tg2.translate(0,3.6,0); const ci=new THREE.InstancedMesh(tg2,pm,tanks.length);
      tanks.forEach((t,i)=>{ M.makeScale(1,1,1); M.setPosition(t[0],t[2],t[1]); ci.setMatrixAt(i,M); }); scene.add(ci); }
    // --- Bäume in den Parks ---
    const tm=new THREE.ShaderMaterial({uniforms:uni,
      vertexShader:`varying vec3 vW; varying vec3 vN; varying float vS;
        void main(){ mat4 im=mat4(1.0);
          #ifdef USE_INSTANCING
            im=instanceMatrix;
          #endif
          vec4 wp=modelMatrix*im*vec4(position,1.0); vW=wp.xyz; vN=normalize(mat3(modelMatrix*im)*normal); vS=fract((im[3].x+im[3].z)*0.137); gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader:common+`varying vec3 vW; varying vec3 vN; varying float vS;
        void main(){ vec3 n=normalize(vN);
          float leaf=vnoise(vW.xz*1.7+vW.y*1.9)*0.6+vnoise(vW.xy*4.3+vW.z*3.1)*0.4;          // Blätterbüschel
          vec3 col=mix(vec3(0.015,0.05,0.03),vec3(0.05,0.13,0.06),vS)*(0.55+0.9*leaf);
          if(vS>0.88) col=mix(col,vec3(0.16,0.07,0.03)*(0.6+0.8*leaf),0.7);              // ein paar Herbstbäume
          col*=0.6+0.4*smoothstep(-0.6,0.8,n.y);
          col+=vec3(0.9,0.6,0.25)*0.14*clamp(1.0-vW.y/8.0,0.0,1.0);            // Laternenschein von unten
          col+=vec3(0.05,0.07,0.1)*max(dot(n,MOON),0.0);
          vec3 L=normalize(uFlashPos-vW); col+=uFlash*(max(dot(n,L),0.0)*0.6+0.15)*0.6;
          gl_FragColor=vec4(grade(fogIt(col,vW)),1.0); }`});
    const tg=new THREE.IcosahedronGeometry(1,1);
    const ti=new THREE.InstancedMesh(tg,tm,trees.length);
    trees.forEach((t,i)=>{ M.makeScale(t[2],t[2]*1.25,t[2]); M.setPosition(t[0],t[2]*1.1,t[1]); ti.setMatrixAt(i,M); });
    scene.add(ti);
    // --- Boden: Straßen mit Laternen, Parks, Uferpromenade (keine Autos) ---
    const gm=new THREE.ShaderMaterial({uniforms:uni, extensions:{derivatives:true},
      vertexShader:`varying vec3 vW; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader:common+`
        varying vec3 vW;
        float ln(float x, float c, float w){ float aa=fwidth(x)+0.02; return smoothstep(w+aa,w-aa,abs(x-c)); }
        void main(){
          float B=${B.toFixed(1)}, S=${ST.toFixed(1)}, SZ=${shoreZ.toFixed(1)};
          vec2 p=vW.xz; vec2 f=mod(p,B); vec2 id=floor(p/B);
          float sx=step(f.x,S), sz=step(f.y,S); float street=max(sx,sz);
          float farK=clamp(length(fwidth(p))*1.2-0.3,0.0,1.0);
          // Asphalt mit Körnung und Flicken, nass glänzend
          float grain=vnoise(p*3.1)*0.5+vnoise(p*0.35)*0.5;
          vec3 asph=vec3(0.03,0.031,0.04)*(0.75+0.5*grain)*(0.85+0.3*step(0.72,vnoise(p*0.09)));
          // Gehweg mit Plattenfugen und Bordstein
          vec2 fb=f-S; float inner=min(min(fb.x,fb.y),min(B-f.x,B-f.y)+0.0);
          vec2 tl=fract(p/1.6); float joint=max(ln(tl.x,0.0,0.03),ln(tl.y,0.0,0.03))*(1.0-farK);
          vec3 walk=vec3(0.07,0.068,0.075)*(0.85+0.3*vnoise(p*1.4))*(1.0-0.35*joint);
          float side=step(0.0,inner)*step(inner,1.8);
          vec3 col=street>0.5?asph:mix(vec3(0.03,0.03,0.038),walk,side);
          col+=vec3(0.03)*ln(inner,0.0,0.12)*(1.0-street);                          // Bordsteinkante
          if(street>0.5){
            float inter=sx*sz;
            // Mittellinie gestrichelt, Fahrbahnränder
            float cxl=ln(f.x,S*0.5,0.09)*step(0.5,fract(p.y/6.0))*(1.0-sz);
            float czl=ln(f.y,S*0.5,0.09)*step(0.5,fract(p.x/6.0))*(1.0-sx);
            float edge=(ln(f.x,0.7,0.06)+ln(f.x,S-0.7,0.06))*(1.0-sz)+(ln(f.y,0.7,0.06)+ln(f.y,S-0.7,0.06))*(1.0-sx);
            // Zebrastreifen vor den Kreuzungen
            float zx=step(S+0.5,f.y)*step(f.y,S+3.0)+step(B-3.0,f.y)*step(f.y,B-0.5); zx*=sx*step(0.5,fract(f.x/1.1))*step(0.8,f.x)*step(f.x,S-0.8);
            float zz=step(S+0.5,f.x)*step(f.x,S+3.0)+step(B-3.0,f.x)*step(f.x,B-0.5); zz*=sz*step(0.5,fract(f.y/1.1))*step(0.8,f.y)*step(f.y,S-0.8);
            float paint=clamp(cxl*0.9+edge*0.5+zx+zz,0.0,1.0)*(0.7+0.3*grain)*(1.0-farK*0.8);
            col=mix(col,vec3(0.2,0.19,0.16)+vec3(0.12,0.1,0.0)*cxl,paint*0.8);
            col=mix(col,vec3(0.2,0.19,0.16)+vec3(0.12,0.1,0.0)*czl,clamp(czl,0.0,1.0)*0.75*(1.0-farK*0.8));
          }
          float pr=fract(abs(sin(id.x*12.9898+id.y*78.233)*43758.5453));
          bool isPark=((pr<0.24 && !(abs(id.x+0.5)<=1.5 && id.y>=-15.0 && id.y<=-1.0)) || (id.y==${SHORE.toFixed(1)} && abs(id.x)<=2.0)) && !(id.x==0.0&&id.y==0.0);
          vec2 q=f-vec2(S+(B-S)*0.5);
          if(isPark && street<0.5 && inner>1.8){
            // Rasen mit Mähstreifen und Blumenbeeten, Kieswege, in manchen Parks ein Teich
            float gr=fbm(p*0.6)*0.7+vnoise(p*4.0)*0.3;
            vec3 grass=mix(vec3(0.008,0.028,0.014),vec3(0.025,0.06,0.025),gr)*(0.9+0.15*step(0.5,fract(p.x/2.4+0.2*sin(p.y*0.1))));
            float path=max(max(ln(q.x,0.0,0.9),ln(q.y,0.0,0.9)),ln(length(q),9.0,0.75));
            vec3 gravel=vec3(0.08,0.07,0.055)*(0.8+0.4*vnoise(p*5.0));
            col=mix(grass,gravel,path);
            float bed=smoothstep(2.6,2.2,length(q))*(1.0-path);
            col=mix(col,mix(vec3(0.16,0.03,0.06),vec3(0.18,0.12,0.02),step(0.5,vnoise(p*3.0)))*(0.5+0.6*vnoise(p*7.0)),bed);
            if(pr<0.09 && length(q)<6.5){ float d=length(q); vec3 dv=normalize(vW-uCam); vec3 rf=reflect(dv,vec3(0.0,1.0,0.0));
              vec3 wtr=skyCol(rf,false)*0.6+vec3(1.0,0.75,0.4)*0.12*sin(d*3.0-uTime*1.5)*0.3+uFlash*0.6; col=mix(col,wtr,smoothstep(6.5,6.0,d)); }
            float lamp=0.0; for(int i=0;i<4;i++){ float a=float(i)*1.5708+0.785; vec2 lq=q-vec2(cos(a),sin(a))*9.0; lamp+=exp(-dot(lq,lq)*0.12); }
            col+=vec3(1.0,0.75,0.4)*0.45*lamp;
          }
          // Platz vor den Häusern: gepflasterter Innenhof
          if(!isPark && street<0.5 && inner>1.8){ col=vec3(0.035,0.034,0.042)*(0.8+0.4*vnoise(p*2.0)); }
          // Laternen: Lichtkegel am Gehwegrand
          float lx=exp(-pow(f.x-0.6,2.0)*0.8)+exp(-pow(f.x-S+0.6,2.0)*0.8);
          float lz=exp(-pow(f.y-0.6,2.0)*0.8)+exp(-pow(f.y-S+0.6,2.0)*0.8);
          float spx=0.5+0.5*cos(p.y*6.2832/(B*0.5)), spz=0.5+0.5*cos(p.x*6.2832/(B*0.5));
          col+=vec3(1.0,0.6,0.25)*0.2*(lx*sx*(1.0-sz)*(0.35+0.9*pow(spx,6.0))+lz*sz*(1.0-sx)*(0.35+0.9*pow(spz,6.0)));
          // Nässe: Spiegelung der Laternen auf dem Asphalt
          vec3 vv=normalize(vW-uCam); float fres=pow(1.0-abs(vv.y),4.0)*street;
          col+=vec3(1.0,0.65,0.3)*0.08*fres*(0.5+grain);
          // Uferpromenade mit Holzplanken und Lichterkette
          float dz=SZ-p.y; float prom=step(0.0,dz)*step(dz,10.0);
          vec3 wood=vec3(0.09,0.06,0.04)*(0.75+0.35*vnoise(vec2(p.x*0.4,floor(dz/0.8)*3.0)))*(1.0-0.5*ln(fract(dz/0.8),0.0,0.05));
          col=mix(col,wood,prom);
          col+=vec3(1.0,0.8,0.5)*0.9*exp(-pow(dz-1.5,2.0)*0.9)*pow(0.5+0.5*sin(p.x*0.42),18.0);
          col+=vec3(1.0,0.7,0.4)*0.08*exp(-pow(dz-1.5,2.0)*0.05);
          // Platz in der Mitte mit Neon-Ring und Pflaster
          float d=length(p-vec2(B*0.5+S*0.5));
          if(d<18.0 && street<0.5){ col=mix(col,vec3(0.06,0.058,0.065)*(0.8+0.3*vnoise(p*1.5)),smoothstep(18.0,17.0,d)); col+=vec3(0.03)*ln(fract(d/2.0),0.0,0.04); }
          col+=neon(0.3)*0.7*exp(-pow(d-12.0,2.0)*0.4);
          col*=0.6; col+=uFlash*(0.17+0.12*fres);
          gl_FragColor=vec4(grade(fogIt(col,vW)),1.0);
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
          float dist=length(vW-uCam), fine=1.0-smoothstep(150.0,900.0,dist);
          g+=(vec2(vnoise(p*0.45+t*0.5),vnoise(p*0.45-t*0.4+3.0))-0.5)*0.07*fine;      // feine Kräuselung nah an der Kamera
          g+=(vec2(vnoise(p*1.6+t*0.9),vnoise(p*1.6-t*0.8+9.0))-0.5)*0.04*(1.0-smoothstep(60.0,300.0,dist));
          vec3 n=normalize(vec3(-g.x,1.0,-g.y));
          vec3 v=normalize(vW-uCam); vec3 r=reflect(v,n); r.y=abs(r.y);
          float fr=0.04+0.96*pow(1.0-max(dot(-v,n),0.0),5.0);
          vec3 col=vec3(0.005,0.018,0.04)+vec3(0.02,0.04,0.07)*max(dot(n,MOON),0.0)*0.6;
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
          float cap=smoothstep(0.78,0.95,vnoise(p*0.06+vec2(t*0.05,0.0))*vnoise(p*0.5-t*0.3))*(1.0-smoothstep(200.0,1400.0,dist));
          col+=vec3(0.35,0.38,0.48)*cap*0.35;                                            // Schaumkronen
          // Feuerwerk spiegelt sich im Wasser
          col+=uFlash*(0.25+1.1*fr)*(0.6+0.4*n.x);
          // Strand mit Gischt vor der Promenade
          float sl=13.0+sin(p.x*0.045+t*0.7)*1.3+vnoise(vec2(p.x*0.08,t*0.3))*2.5;
          if(ds<sl){ vec3 sand=mix(vec3(0.16,0.12,0.09),vec3(0.07,0.06,0.06),smoothstep(sl-5.0,sl,ds));
            sand+=vec3(1.0,0.7,0.4)*0.18*exp(-ds*0.25)+uFlash*0.3+vec3(0.04,0.045,0.07)*0.6; col=sand; }
          col+=vec3(0.55,0.6,0.7)*0.55*exp(-pow(ds-sl,2.0)*0.35)*(0.55+0.45*vnoise(vec2(p.x*0.25,t*1.3)));
          col+=vec3(0.4,0.45,0.55)*0.25*exp(-pow(ds-sl-6.0-sin(t*0.9+p.x*0.03)*2.0,2.0)*0.2)*vnoise(vec2(p.x*0.2,t));
          // weicher Horizont: weit draußen geht das Wasser in den Himmelsschein über
          vec3 dv=vW-uCam; vec3 dn=normalize(dv); float fh=1.0-exp(-length(dv)*0.00042);
          col=mix(col,skyCol(vec3(dn.x,0.004,dn.z),false)*0.95+uFlash*0.1,fh);
          gl_FragColor=vec4(grade(col),1.0);
        }`});
    const sea=new THREE.Mesh(new THREE.PlaneGeometry(16000,8000),sm); sea.rotation.x=-Math.PI/2; sea.position.set(0,-0.6,shoreZ+4000); scene.add(sea);

    // --- Hügel und Küstenorte am Horizont (lassen das Meer nicht mehr abgeschnitten wirken) ---
    const hillMat=new THREE.ShaderMaterial({uniforms:uni,
      vertexShader:`varying vec3 vW; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader:common+`varying vec3 vW;
        void main(){ float fo=fbm(vec2(vW.x*0.02,vW.y*0.05))*0.8+vnoise(vW.xy*0.15)*0.3; vec3 col=(vec3(0.016,0.016,0.035)+vec3(0.03,0.03,0.06)*smoothstep(0.0,120.0,vW.y))*(0.6+0.7*fo);
          vec2 c=vec2(vW.x/7.0,vW.y/5.0); vec2 id=floor(c); vec2 f=fract(c)-0.5;
          float on=step(0.86,h21(id+floor(vW.z/500.0)))*smoothstep(28.0,4.0,vW.y);
          col+=mix(vec3(1.0,0.75,0.45),vec3(0.7,0.85,1.0),step(0.7,h21(id*3.1)))*on*smoothstep(0.35,0.0,length(f))*1.4;
          col+=uFlash*0.25;
          vec3 dv=vW-uCam; vec3 dn=normalize(dv); float fh=1.0-exp(-length(dv)*0.00028);
          col=mix(col,skyCol(vec3(dn.x,0.004,dn.z),false)*0.95,fh*0.82);
          gl_FragColor=vec4(grade(col),1.0); }`});
    const hill=(z,x0,x1,hs,seed)=>{ const N=260, pos=[], idx=[];
      for(let i=0;i<=N;i++){ const x=x0+(x1-x0)*i/N; let h=0, a=1, f=1/700;
        for(let o=0;o<4;o++){ h+=a*(Math.sin(x*f+seed*(o+1))*0.5+0.5); a*=0.5; f*=2.1; }
        const edge=Math.min(1,Math.min(i,N-i)/14); h=h*hs*edge; pos.push(x,-2,z+Math.sin(x*0.0011+seed)*160, x,h,z+Math.sin(x*0.0011+seed)*160); }
      for(let i=0;i<N;i++){ const a=i*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); }
      const gg=new THREE.BufferGeometry(); gg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); gg.setIndex(idx);
      const m=new THREE.Mesh(gg,hillMat); m.frustumCulled=false; scene.add(m); };
    hill(shoreZ+3600,-7000,7000,150,1.3);
    hill(shoreZ+1700,-4200,-650,95,4.1);
    hill(shoreZ+2100,900,4600,110,7.7);
    // --- Schiffe mit erleuchteten Fenstern ---
    const ships=[[320,shoreZ+620,110,13,20,0.25],[-520,shoreZ+1050,150,17,24,-0.15],[900,shoreZ+1500,90,11,16,0.4]];
    const si=new THREE.InstancedMesh(geo,bm,ships.length); const Q=new THREE.Quaternion(), SV=new THREE.Vector3(), PV=new THREE.Vector3();
    ships.forEach((sh,i)=>{ Q.setFromAxisAngle(new THREE.Vector3(0,1,0),sh[5]); SV.set(sh[2],sh[3],sh[4]); PV.set(sh[0],-1,sh[1]); M.compose(PV,Q,SV); si.setMatrixAt(i,M); });
    scene.add(si);
    // --- Steg mit Laternen und Leuchtturm ---
    const pierMat=new THREE.ShaderMaterial({uniforms:uni,
      vertexShader:`varying vec3 vW; varying vec3 vN; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader:common+`varying vec3 vW; varying vec3 vN;
        void main(){ vec3 n=normalize(vN); vec3 col=vec3(0.05,0.04,0.04)+vec3(0.05,0.05,0.08)*max(dot(n,MOON),0.0);
          float lamp=pow(0.5+0.5*cos(vW.z*0.2),40.0)*step(0.5,n.y); col+=vec3(1.0,0.75,0.4)*lamp*(exp(-pow(abs(vW.x+60.0)-4.0,2.0)*0.6))*2.0;
          float rings=step(0.5,fract(vW.y/9.0)); if(vW.y>4.5){ col=mix(vec3(0.75,0.72,0.7),vec3(0.6,0.06,0.08),rings)*(0.25+0.4*max(dot(n,MOON),0.0)); }
          col+=uFlash*0.4; gl_FragColor=vec4(grade(fogIt(col,vW)),1.0); }`});
    const pierL=280, pier=new THREE.Mesh(new THREE.BoxGeometry(9,3,pierL),pierMat); pier.position.set(-60,0.8,shoreZ+pierL/2); scene.add(pier);
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(3.2,5,44,16),pierMat); tower.position.set(-60,24,shoreZ+pierL); scene.add(tower);
    const beamMat=new THREE.ShaderMaterial({uniforms:uni, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide,
      vertexShader:`varying float vL; void main(){ vL=uv.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader:`varying float vL; void main(){ gl_FragColor=vec4(vec3(1.0,0.93,0.75)*0.16*pow(vL,1.5),1.0); }`});
    const beamG=new THREE.ConeGeometry(30,700,24,1,true); beamG.translate(0,-350,0); beamG.rotateZ(Math.PI/2);
    const beam=new THREE.Mesh(beamG,beamMat); beam.position.set(-60,47,shoreZ+pierL); scene.add(beam);
    const lampG=new THREE.Mesh(new THREE.SphereGeometry(3.2,12,8),new THREE.MeshBasicMaterial({color:0xfff2c0})); lampG.position.set(-60,47,shoreZ+pierL); scene.add(lampG);
    CITY.beam=beam;
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
  // Blick steil von oben in die Häuserschlucht: Kamera schwebt über der Mittelstraße zwischen den Türmen,
  // gleitet langsam die Straße entlang, schwenkt leicht und wippt im Takt
  const a=CITY.ang, sz=CITY.shoreZ, cam=CITY.cam, port=W<H;
  const px=4.5+Math.sin(a*0.9)*4, pz=-400+Math.sin(a*0.35)*130, py=(port?230:205)+Math.sin(a*1.3)*12+BEAT.p*3;
  const tx=px+Math.sin(a*0.7+0.6)*22, tz=pz+(port?120:150), ty=0;
  const push=CAM.punch*22;
  cam.position.set(px+CAM.sx*2, py-push+ie*260+CAM.sy*2, pz-ie*120);
  const roll=Math.max(-0.08,Math.min(0.08,Math.cos(a*0.9)*0.06));
  cam.up.set(Math.sin(roll),Math.cos(roll),0);
  cam.lookAt(tx, ty, tz);
  const sw=Math.sin(a);
  u.uCam.value.copy(cam.position); CITY.sky.position.copy(cam.position);
  const L=FX.light; const k=Math.min(1.4,L.v)*0.42;
  u.uFlash.value.setRGB(L.r/255*k, L.g/255*k, L.b/255*k);
  u.uFlashPos.value.set(sw*60, 320, sz+260);
  u.uBloom.value=bloom?1:0; u.uBeat.value=BEAT.p; if(CITY.beam) CITY.beam.rotation.y=u.uTime.value*0.6;
  CITY.R.render(CITY.scene,cam);
}
