// Face orientations use the renderer's existing Ry * Rx rotation convention.
export const faceAngles={front:{x:0,y:0},right:{x:0,y:-Math.PI/2},back:{x:0,y:Math.PI},left:{x:0,y:Math.PI/2},top:{x:Math.PI/2,y:0},bottom:{x:-Math.PI/2,y:0}};
export function cameraTarget(face,currentY=0){
  const a=faceAngles[face];if(!a)throw Error('Unknown camera face');
  return {x:a.x,y:currentY+Math.atan2(Math.sin(a.y-currentY),Math.cos(a.y-currentY))};
}
export function frontFacing(frames,x,y){
  const sx=Math.sin(x),cx=Math.cos(x),sy=Math.sin(y),cy=Math.cos(y);
  return Object.keys(frames).sort((a,b)=>{
    const z=f=>{const n=frames[f].normal;return -sy*n[0]+sx*cy*n[1]+cx*cy*n[2];};return z(b)-z(a);
  })[0];
}
export const dragPitch=(start,dy,invert=false)=>Math.max(-Math.PI,Math.min(Math.PI,start+dy*.008*(invert?-1:1)));
