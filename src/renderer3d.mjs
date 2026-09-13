import {cameraTarget,frontFacing,dragPitch} from './face-camera.mjs';
import {createStarTransition} from './star-transition.mjs';
import {createGesture} from './celestial-input.mjs';
import {topology as defaultTopology} from '../experiments/cube-topology/topology.mjs';
import {UNKNOWN,EXCLUDED,UNICORN} from './player.mjs';

const palette=[[.82,.25,.38],[.9,.48,.18],[.92,.78,.28],[.3,.65,.48],[.25,.55,.82],[.32,.28,.58],[.68,.42,.72]];
const sub=(a,b)=>a.map((x,i)=>x-b[i]), add=(a,b)=>a.map((x,i)=>x+b[i]), mul=(a,s)=>a.map(x=>x*s);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const neg=a=>a.map(x=>-x);
// Render frames share the verified logical orientation: U follows columns,
// V points toward the visual top (opposite the logical row direction), and N
// is the outward normal. Geometry never depends on canonical cell coordinates.
export function makeRenderFrames(topology){
  return Object.fromEntries(topology.faces.map(face=>{const f=topology.frames[face];return [face,{center:f.normal.slice(),u:f.column.slice(),v:neg(f.row),normal:f.normal.slice()}];}));
}
export function faceQuad(frame,row,col,n=7,offset=0){const s=2/n,u0=-1+col*s,u1=u0+s,v1=1-row*s,v0=v1-s,center=add(frame.center,mul(frame.normal,offset)),p=(u,v)=>add(add(center,mul(frame.u,u)),mul(frame.v,v));return [p(u0,v0),p(u1,v0),p(u1,v1),p(u0,v1)];}
function gridVertices(frame,n=7,offset=.001){const s=2/n,center=add(frame.center,mul(frame.normal,offset)),p=(u,v)=>add(add(center,mul(frame.u,u)),mul(frame.v,v)),out=[];for(let i=0;i<=n;i++){const x=-1+i*s;out.push(...p(x,-1),...p(x,1),...p(-1,x),...p(1,x));}return out;}
export function regionLines(frame,map,n){
  const out=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const q=faceQuad(frame,r,c,n,.001),i=r*n+c,edge=(a,b)=>out.push(...q[a],...q[b]);
    if(r===0)edge(2,3);if(c===0)edge(3,0);
    if(r===n-1||map[i]!==map[i+n])edge(0,1);
    if(c===n-1||map[i]!==map[i+1])edge(1,2);
  }
  return out;
}
function identity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
function multiply(a,b){const o=Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),q=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*q,-1,0,0,2*far*near*q,0];}
function rotation(x,y){const cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y);return [cy,0,-sy,0,sx*sy,cx,sx*cy,0,cx*sy,-sx,cx*cy,0,0,0,0,1];}
function transform(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14],m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15]];}
const transformNormal=(m,n)=>transform(m,[...n,0]).slice(0,3);
function inverse(a){const b00=a[0]*a[5]-a[1]*a[4],b01=a[0]*a[6]-a[2]*a[4],b02=a[0]*a[7]-a[3]*a[4],b03=a[1]*a[6]-a[2]*a[5],b04=a[1]*a[7]-a[3]*a[5],b05=a[2]*a[7]-a[3]*a[6],b06=a[8]*a[13]-a[9]*a[12],b07=a[8]*a[14]-a[10]*a[12],b08=a[8]*a[15]-a[11]*a[12],b09=a[9]*a[14]-a[10]*a[13],b10=a[9]*a[15]-a[11]*a[13],b11=a[10]*a[15]-a[11]*a[14],det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!det)return null;const d=1/det;return [(a[5]*b11-a[6]*b10+a[7]*b09)*d,(-a[1]*b11+a[2]*b10-a[3]*b09)*d,(a[13]*b05-a[14]*b04+a[15]*b03)*d,(-a[9]*b05+a[10]*b04-a[11]*b03)*d,(-a[4]*b11+a[6]*b08-a[7]*b07)*d,(a[0]*b11-a[2]*b08+a[3]*b07)*d,(-a[12]*b05+a[14]*b02-a[15]*b01)*d,(a[8]*b05-a[10]*b02+a[11]*b01)*d,(a[4]*b10-a[5]*b08+a[7]*b06)*d,(-a[0]*b10+a[1]*b08-a[3]*b06)*d,(a[12]*b04-a[13]*b02+a[15]*b00)*d,(-a[8]*b04+a[9]*b02-a[11]*b00)*d,(-a[4]*b09+a[5]*b07-a[6]*b06)*d,(a[0]*b09-a[1]*b07+a[2]*b06)*d,(-a[12]*b03+a[13]*b01-a[14]*b00)*d,(a[8]*b03-a[9]*b01+a[10]*b00)*d];}
export function toNdc(rect,x,y){return [(x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2];}
export const classifyGesture=distance=>distance<=5?'click':'drag';

export function createRenderer(canvas,{topology=defaultTopology,maps,player,overlay=null,activeFaces=topology.faces,celestial=false,cubePreview=false,campaign=false,reveal=false,startFace=null,invertY=false,onFocusFace,guidance=()=>null,onPick,onHover,onInput,onError,diagnostic=false}={}){
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false});if(!gl)throw Error('WebGL is unavailable');
  const vs=`attribute vec3 p;uniform mat4 mvp;void main(){gl_Position=mvp*vec4(p,1.0);}`;
  const fs=`precision mediump float;uniform vec3 color;void main(){gl_FragColor=vec4(color,1.0);}`;
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(`WebGL link failed: ${gl.getProgramInfoLog(program)}`);
  const pos=gl.getAttribLocation(program,'p'),mvp=gl.getUniformLocation(program,'mvp'),color=gl.getUniformLocation(program,'color');if(pos<0||!mvp||!color)throw Error(`WebGL locations missing (attribute p=${pos}, mvp=${Boolean(mvp)}, color=${Boolean(color)})`);
  const buffer=gl.createBuffer();if(!buffer)throw Error('WebGL buffer creation failed');const initError=gl.getError();if(initError!==gl.NO_ERROR)throw Error(`WebGL initialization error 0x${initError.toString(16)}`);let rx=cubePreview?.30:campaign&&activeFaces.length>1?.25:-.08,ry=cubePreview?-.40:campaign&&activeFaces.length>1?-.32:.12,drag=null,hover=null,reportedError=false;
  const frames=makeRenderFrames(topology),epsilon=.001,active=new Set(activeFaces);
  const pastels=['#cfa9b6','#e6c1ad','#e6d8a9','#b7c7b4','#b6ccdc','#aaaec8','#c8b8d4'].map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255));
  let disposed=false,frameRequest,rotationStart,unicornTimes=new Map(),previous=new Map();
  const starTransition=createStarTransition();
  const openedAt=performance.now();let revealing=reveal;let guideKey=null,guideEntered=0,cameraTween=null,lastFocus=null;
  if(startFace){const to=cameraTarget(startFace,ry);if(startFace==='top'){to.x-=.30;to.y-=.20;}else if(startFace==='bottom'){to.x+=.30;to.y-=.20;}else{to.x+=.25;to.y-=.32;}rx=to.x-.08;ry=to.y+.10;cameraTween={from:{x:rx,y:ry},to,start:performance.now(),duration:400};}
  function faceTo(face){if(!active.has(face))return;revealing=false;cameraTween={from:{x:rx,y:ry},to:cameraTarget(face,ry),start:performance.now(),duration:350};}

  const starSize=cubePreview?.18:campaign?({3:.28,4:.25,5:.22,7:.18}[topology.n]||.18):.28;
  const unicornSize=cubePreview?.966:campaign?({3:.78,4:.80,5:.86,7:1.18}[topology.n]||1.18):1.38;
  const listeners=[];
  function listen(type,fn){canvas.addEventListener(type,fn);listeners.push([type,fn]);}

  function cellQuad(face,row,col,layer=0){return faceQuad(frames[face],row,col,topology.n,epsilon*layer);}
  function draw(vertices,rgba,mode=gl.TRIANGLES,matrix){if(!vertices.length)return;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pos);gl.uniformMatrix4fv(mvp,false,matrix);gl.uniform3fv(color,rgba);gl.drawArrays(mode,0,vertices.length/3);}
  const emoji=overlay?.getContext('2d');function resize(){const d=Math.min(devicePixelRatio||1,2),w=Math.max(1,canvas.clientWidth*d),h=Math.max(1,canvas.clientHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}if(overlay&&emoji&&(overlay.width!==w||overlay.height!==h)){overlay.width=w;overlay.height=h;}gl.viewport(0,0,w,h);}
  function viewMatrix(){const view=identity();view[14]=-Math.max(5,1+4.6*canvas.clientHeight/canvas.clientWidth);return view;}
  function render(){if(disposed)return;
    const help=guidance(),time=performance.now();
    if(help?.key!==undefined&&help.key!==guideKey){guideKey=help.key;guideEntered=time;if(help.camera)cameraTween={from:{x:rx,y:ry},to:help.camera,start:time};}
    if(cameraTween){const u=Math.min(1,(time-cameraTween.start)/(cameraTween.duration||500)),s=u*u*(3-2*u);rx=cameraTween.from.x+(cameraTween.to.x-cameraTween.from.x)*s;ry=cameraTween.from.y+(cameraTween.to.y-cameraTween.from.y)*s;if(u===1)cameraTween=null;}
const focus=frontFacing(frames,rx,ry);if(focus!==lastFocus){lastFocus=focus;onFocusFace?.(focus);}
if(revealing){const t=Math.min(1,(performance.now()-openedAt)/400),ease=t*t*(3-2*t);rx=.06+.19*ease;ry=-.04-.28*ease;if(t===1)revealing=false;}resize();if(emoji)emoji.clearRect(0,0,overlay.width,overlay.height);gl.useProgram(program);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.clearColor(...(celestial?[.902,.898,.925,1]:[.018,.022,.04,1]));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const proj=perspective(Math.PI/4,canvas.width/canvas.height,.1,100),rot=rotation(rx,ry),mv=multiply(viewMatrix(),rot),matrix=multiply(proj,mv),diagnosticPalette=[[.9,.25,.3],[.95,.55,.18],[.9,.85,.2],[.25,.7,.4],[.2,.55,.9],[.4,.3,.75]];if(celestial&&active.size===1){for(const face of topology.faces){if(face==='front')continue;const q=faceQuad(frames[face],0,0,1).map(p=>[p[0],p[1],.94+p[2]*.06]);draw([...q[0],...q[1],...q[2],...q[0],...q[2],...q[3]],[.79,.77,.83],gl.TRIANGLES,matrix);}}
    for(const [faceIndex,face] of topology.faces.entries())if(active.has(face))for(let r=0;r<topology.n;r++)for(let c=0;c<topology.n;c++){const q=cellQuad(face,r,c),region=maps[face][r*topology.n+c],verts=[...q[0],...q[1],...q[2],...q[0],...q[2],...q[3]],normal=transformNormal(rot,frames[face].normal),light=.68+.32*Math.max(0,normal[2]),base=diagnostic?diagnosticPalette[faceIndex]:(celestial?pastels:palette)[region];draw(verts,base.map(v=>v*(celestial?((cubePreview||campaign)?.84+.16*Math.max(0,normal[2]):.94+.06*Math.max(0,normal[2])):light)),gl.TRIANGLES,matrix);}for(const face of topology.faces)if(active.has(face)){const normal=transformNormal(rot,frames[face].normal),light=.68+.32*Math.max(0,normal[2]);draw(celestial&&campaign&&topology.n===7?regionLines(frames[face],maps[face],topology.n):gridVertices(frames[face],topology.n),celestial?(cubePreview?[.79,.77,.81]:[.77,.75,.79]):[.06*light,.07*light,.1*light],gl.LINES,matrix);}
    if(celestial&&time-guideEntered<700&&(help?.edge||help?.corner)){
      const pulse=.90+.10*Math.sin((time-guideEntered)/700*Math.PI),ink=[pulse,pulse*.98,pulse];
      if(help.edge){const [a,b]=help.edge.map(face=>frames[face].normal),center=mul(add(a,b),1.002),direction=cross(a,b);draw([...sub(center,direction),...add(center,direction)],ink,gl.LINES,matrix);}
      if(help.corner){const refs=topology.physicalToFaceCells(help.corner),p=refs.reduce((sum,r)=>add(sum,frames[r.face].normal),[0,0,0]),v=[];
        for(const ref of refs)v.push(...mul(p,1.002),...sub(mul(p,1.002),mul(frames[ref.face].normal,.14)));
        draw(v,ink,gl.LINES,matrix);
      }
    }
    if(!diagnostic&&!celestial){const glyph=[],excluded=[];for(const cell of topology.physicalCells){const state=player.get(cell.id);if(state===UNKNOWN)continue;for(const ref of cell.faceCells){const q=cellQuad(ref.face,ref.row,ref.col,3),center=q.reduce((a,p)=>add(a,p),[0,0,0]).map(x=>x/4),f=frames[ref.face],u=mul(f.u,.055),v=mul(f.v,.055),p=center;if(state===UNICORN){const a=add(p,mul(u,-1)),b=add(p,mul(v,-1)),c=add(p,u),d=add(p,v),horn=add(p,mul(v,.9));glyph.push(...a,...b,...c,...a,...c,...d,...d,...horn,...c);}else{excluded.push(...add(add(p,mul(u,-1)),mul(v,-1)),...add(add(p,u),v),...add(add(p,u),mul(v,-1)),...add(add(p,mul(u,-1)),v));}}}draw(glyph,[.96,.98,1],gl.TRIANGLES,matrix);gl.lineWidth(2);draw(excluded,[.25,.27,.34],gl.LINES,matrix);if(hover) {for(const ref of topology.physicalToFaceCells(hover)){const q=cellQuad(ref.face,ref.row,ref.col,2),vtx=[...q[0],...q[1],...q[1],...q[2],...q[2],...q[3],...q[3],...q[0]];draw(vtx,[1,.92,.48],gl.LINES,matrix);}}}if(emoji&&!diagnostic&&!celestial){emoji.textAlign='center';emoji.textBaseline='middle';for(const cell of topology.physicalCells){if(player.get(cell.id)!==UNICORN)continue;for(const ref of cell.faceCells){if(!active.has(ref.face))continue;const f=frames[ref.face],q=faceQuad(f,ref.row,ref.col,topology.n,0),p=q.reduce((a,v)=>add(a,v),[0,0,0]).map(v=>v/4),z=transform(matrix,[...p,1]);if(z[3]<=0)continue;const x=(z[0]/z[3]*.5+.5)*overlay.width,y=(1-z[1]/z[3]*.5-.5)*overlay.height;emoji.font=`${Math.max(12,overlay.width/55)}px serif`;emoji.globalAlpha=player.fixed.has(cell.id)?.95:1;emoji.fillText('🦄',x,y);}}emoji.globalAlpha=1;}if(celestial&&emoji){
      const now=performance.now(),guide=help;
      const screen=p=>{const q=transform(matrix,p);return [(q[0]/q[3]*.5+.5)*overlay.width,(.5-q[1]/q[3]*.5)*overlay.height];};
      // Screen-space sticker axes come from the projected face U/V vectors.
      // Facing test prevents stars on the far side bleeding through the tile.
      for(const face of activeFaces){const f=frames[face],eye=transform(mv,f.center),normal=transformNormal(rot,f.normal);
        if(dot(normal,eye)>=0)continue;
        for(let r=0;r<topology.n;r++)for(let c=0;c<topology.n;c++){
          const id=topology.faceCellToPhysical(face,r,c),state=player.get(id),index=r*topology.n+c;
          if(state===2&&previous.get(id)!==2&&!player.fixed.has(id))unicornTimes.set(id,now);
          previous.set(id,state);
          const extinguished=starTransition(id,state,now);
          const q=cellQuad(face,r,c),center=q.reduce((a,p)=>add(a,p),[0,0,0]).map(v=>v/4),p=screen(center),u=screen(add(center,mul(f.u,1/topology.n))),v=screen(add(center,mul(f.v,-1/topology.n)));
          const unit=(!guide?.face||guide.face===face)&&(guide?.unit?.includes(index)||guide?.physical?.includes(id)),target=guide?.targets?.includes(index)||(guide?.targetsPhysical||guide?.physical)?.includes(id),pulse=1+.06*Math.sin(now/240);
          if(unit){emoji.save();emoji.beginPath();q.map(screen).forEach((xy,i)=>i?emoji.lineTo(...xy):emoji.moveTo(...xy));emoji.closePath();emoji.strokeStyle=target?'#fffaf0':'#f8f3e7';emoji.lineWidth=target?2:1;emoji.stroke();emoji.restore();}
          emoji.save();emoji.setTransform(u[0]-p[0],u[1]-p[1],v[0]-p[0],v[1]-p[1],p[0],p[1]);
          const age=now-(unicornTimes.get(id)??-1000),pop=age<90?.75+.35*age/90:age<220?1.1-.1*(age-90)/130:1;
          if(state===2){emoji.scale(pop,pop);if(player.fixed.has(id)){emoji.beginPath();emoji.arc(0,0,.48,0,Math.PI*2);emoji.strokeStyle='#fffdf4';emoji.lineWidth=.035;emoji.stroke();}emoji.font=`${unicornSize}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;emoji.textAlign='center';emoji.textBaseline='middle';emoji.fillText('🦄',0,.04);}
          else {
            const remnant=(cubePreview||topology.n===7)?.07:.065,star=starSize;
            const scale=(star+(remnant-star)*extinguished)*(target?pulse:1)*(id===hover?1.15:1);
            if(extinguished<1){
              emoji.save();emoji.scale(scale,scale);emoji.globalAlpha=1-extinguished;
              emoji.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,d=i%2?.28:1;const x=Math.cos(a)*d,y=Math.sin(a)*d;i?emoji.lineTo(x,y):emoji.moveTo(x,y);}
              emoji.closePath();emoji.fillStyle='#fffdf4';emoji.fill();emoji.strokeStyle=cubePreview?'#b0a4bc':'#8e829d';emoji.lineWidth=cubePreview?.055:.1;emoji.stroke();emoji.restore();
            }
            if(extinguished>0){
              emoji.globalAlpha=.85*extinguished;emoji.beginPath();emoji.arc(0,0,remnant*(id===hover?1.25:1),0,Math.PI*2);emoji.fillStyle='#94879f';emoji.fill();
            }
          }
          emoji.restore();
        }
      }
    }
    const frameError=gl.getError();if(frameError!==gl.NO_ERROR&&!reportedError){reportedError=true;onError?.(`WebGL frame error 0x${frameError.toString(16)}`);return;}frameRequest=requestAnimationFrame(render);}
  function pick(x,y){const ndc=toNdc(canvas.getBoundingClientRect(),x,y),proj=perspective(Math.PI/4,canvas.width/canvas.height,.1,100),m=inverse(multiply(proj,multiply(viewMatrix(),rotation(rx,ry))));if(!m)return null;const a=transform(m,[ndc[0],ndc[1],-1,1]),b=transform(m,[ndc[0],ndc[1],1,1]);const ro=a.slice(0,3).map((v,i)=>v/a[3]),rd=sub(b.slice(0,3).map((v,i)=>v/b[3]),ro);let best=null,bestD=Infinity;for(const face of topology.faces)if(active.has(face)){const f=frames[face],den=dot(rd,f.normal);if(Math.abs(den)<1e-6)continue;const d=dot(sub(f.center,ro),f.normal)/den;if(d<=0||d>=bestD)continue;const hit=add(ro,mul(rd,d)),u=dot(sub(hit,f.center),f.u),v=dot(sub(hit,f.center),f.v);if(u<-1||u>1||v<-1||v>1)continue;const col=Math.min(topology.n-1,Math.max(0,Math.floor((u+1)*topology.n/2))),row=Math.min(topology.n-1,Math.max(0,Math.floor((1-v)*topology.n/2)));best=topology.faceCellToPhysical(face,row,col);bestD=d;}return best;}
  const gesture=createGesture({pick,double:celestial,rotate:(dx,dy)=>{ry=rotationStart.y+dx*.008;rx=dragPitch(rotationStart.x,dy,invertY);},click:(id,action)=>{onPick?.(id,0,action);onInput?.({text:`${action}: ${id}`});}});
  listen('contextmenu',e=>e.preventDefault());
  listen('pointerdown',e=>{if(gesture.start(e)){revealing=false;cameraTween=null;rotationStart={x:rx,y:ry};canvas.setPointerCapture(e.pointerId);}});
  listen('pointermove',e=>{gesture.move(e);const id=pick(e.clientX,e.clientY);if(id!==hover){hover=id;onHover?.(id);}});
  listen('pointerup',e=>{try{gesture.end(e);}finally{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}});
  listen('pointercancel',()=>gesture.cancel());
  // Normal release also sends lostpointercapture. Preserve double-tap timing
  // only if pointerup already returned the gesture to idle.
  listen('lostpointercapture',()=>{if(!gesture.idle)gesture.cancel();});
  render();return {pick,render,faceTo,get frontFace(){return frontFacing(frames,rx,ry);},dispose(){disposed=true;gesture.cancel();cancelAnimationFrame(frameRequest);listeners.forEach(([type,fn])=>canvas.removeEventListener(type,fn));gl.deleteBuffer(buffer);gl.deleteProgram(program);emoji?.clearRect(0,0,overlay.width,overlay.height);},get rotation(){return {x:rx,y:ry};},set rotation(v){rx=v.x;ry=v.y;}};
}
