import test from 'node:test';
import assert from 'node:assert/strict';
import {topology} from '../experiments/cube-topology/topology.mjs';
import {makeRenderFrames,faceQuad} from '../src/renderer3d.mjs';

const frames=makeRenderFrames(topology), eps=1e-9;
const close=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<eps);

test('render frames produce six outward, planar 7x7 tiled squares',()=>{
  for(const face of topology.faces){
    const f=frames[face], quads=[];
    assert.ok(f.normal.every((v,i)=>Math.abs(v-(f.center[i]))<eps));
    assert.ok(f.u.every((v,i)=>Math.abs(v*f.normal[i])<eps));
    assert.ok(f.v.every((v,i)=>Math.abs(v*f.normal[i])<eps));
    assert.ok(f.normal.reduce((s,v,i)=>s+v*f.center[i],0)>0);
    for(let r=0;r<7;r++)for(let c=0;c<7;c++){
      const q=faceQuad(f,r,c); quads.push(q);
      for(const p of q){assert.ok(Math.abs(p.reduce((s,v,i)=>s+v*f.normal[i],0)-1)<eps); const u=p.reduce((s,v,i)=>s+v*f.u[i],0),v=p.reduce((s,x,i)=>s+x*f.v[i],0); assert.ok(u>=-1-eps&&u<=1+eps&&v>=-1-eps&&v<=1+eps);}
      if(c<6)assert.ok(close(q[1],faceQuad(f,r,c+1)[0]));
      if(r<6)assert.ok(close(q[0],faceQuad(f,r+1,c)[3]));
    }
    assert.equal(quads.length,49);
    assert.ok(close(faceQuad(f,0,0)[3],addExpected(f,-1,1)));
    assert.ok(close(faceQuad(f,6,6)[1],addExpected(f,1,-1)));
  }
});

function addExpected(f,u,v){return f.center.map((x,i)=>x+f.u[i]*u+f.v[i]*v);}

test('pointer gesture threshold and canvas NDC conversion are stable in CSS pixels', async()=>{
  const {classifyGesture,toNdc}=await import('../src/renderer3d.mjs');
  assert.equal(classifyGesture(0),'click'); assert.equal(classifyGesture(4.9),'click');
  assert.equal(classifyGesture(5.1),'drag');
  assert.deepEqual(toNdc({left:10,top:20,width:200,height:100},110,70),[0,0]);
});
