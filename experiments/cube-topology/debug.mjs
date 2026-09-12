import {topology} from './topology.mjs';
const axis=v=>{const k=v.findIndex(x=>x!==0);return `${v[k]>0?'+':'-'}${'xyz'[k]}`;};
export function formatNet(t=topology) {
 const m=t.n-1,width=33;
 const block=face=>{
   const f=t.frames[face],id=(r,c)=>t.faceCellToPhysical(face,r,c);
   const line=s=>'|'+s.padEnd(width-2)+'|';
   const border='+'+'-'.repeat(width-2)+'+';
   return [border,line(` ${face.toUpperCase()}`),line(` c+ --> ${axis(f.column)}`),
     line(` r+ down ${axis(f.row)}`),line(` (0,0)=${id(0,0)}`),line(` (0,${m})=${id(0,m)}`),
     line(` (${m},0)=${id(m,0)}`),line(` (${m},${m})=${id(m,m)}`),border];
 };
 const rows=[[null,'top',null,null],['left','front','right','back'],[null,'bottom',null,null]];
 return rows.flatMap(row=>{
   const blocks=row.map(f=>f?block(f):Array(9).fill(' '.repeat(width)));
   return Array.from({length:9},(_,i)=>blocks.map(b=>b[i]).join(' ').trimEnd());
 }).join('\n')+'\n';
}
