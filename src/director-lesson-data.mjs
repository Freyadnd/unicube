import {topology} from '../experiments/cube-topology/topology.mjs';
import {lessons} from './lesson-data.mjs';

const stripes=Array.from({length:16},(_,i)=>i%4);
const mosaic=[0,0,1,1,0,2,2,1,3,2,2,1,3,3,3,1];
const faces=['front','right'].map((face,region)=>({face,region,n:topology.n,cells:Array.from({length:49},(_,i)=>({row:Math.floor(i/7),col:i%7,id:topology.faceCellToPhysical(face,Math.floor(i/7),i%7)}))}));
const edge=row=>topology.faceCellToPhysical('front',row,6);
const rightRow=row=>Array.from({length:6},(_,i)=>`right:${row}:${i+1}`);
export const directorLessons=[...lessons,
  {
    id:'row-column',title:'Row & Column',
    board:{regions:stripes,unicorns:[0,6,11],excluded:[]},
    steps:[
      {caption:'One unicorn per row.',rows:[1],focus:[6]},
      {caption:'This row already has one.',rows:[1],focus:[6],lineEliminated:[4,5,7]},
      {caption:'One unicorn per column.',columns:[2],focus:[6],lineEliminated:[4,5,7]},
      {caption:'These spots are out too.',columns:[2],lineEliminated:[2,4,5,7,10,14]},
      {caption:'The last row has one spot.',rows:[3],candidates:[13],lineEliminated:[12,14,15],focus:[13]},
      {caption:'Place the unicorn.',rows:[3],placed:[13],lineEliminated:[12,14,15]}
    ],
    exercise:{caption:'Your turn. Which spot remains in the last row?',regions:stripes,unicorns:[1,7,8],excluded:[],rows:[3],candidates:[12,13,14,15],lineEliminated:[12,13,15],answer:14,success:'One per row and column!'}
  },
  {
    id:'rainbow-region',title:'Rainbow Region',
    board:{regions:mosaic,unicorns:[0,5,11,14],excluded:[]},
    steps:[
      {caption:'One unicorn per rainbow.',regions:[2],candidates:[5,6,9,10]},
      {caption:'This rainbow already has one.',regions:[2],focus:[5],candidates:[6,9,10]},
      {caption:'So the other spots are out.',regions:[2],focus:[5],regionEliminated:[6,9,10]}
    ],
    exercise:{caption:'Your turn. Rule out the other yellow spots.',regions:mosaic,unicorns:[0,7,10,13],excluded:[],highlightRegions:[2],answers:[5,6,9],mode:'eliminate',success:'Rainbow cleared!'}
  },
  {
    id:'intersection',title:'Intersection',
    board:{regions:mosaic,unicorns:[0,7,14],excluded:[]},
    steps:[
      {caption:'This row needs one unicorn.',rows:[2],candidates:[8,9,10,11]},
      {caption:'Columns rule these out.',rows:[2],lineEliminated:[8,10],candidates:[9,11]},
      {caption:'The rainbow rules this out.',rows:[2],regions:[1],lineEliminated:[8,10],regionEliminated:[11],candidates:[9]},
      {caption:'Only one spot survives.',rows:[2],lineEliminated:[8,10],regionEliminated:[11],focus:[9]},
      {caption:'Combine what you know.',rows:[2],lineEliminated:[8,10],regionEliminated:[11],placed:[9]}
    ],
    exercise:{caption:'Your turn. Combine the clues.',regions:mosaic,unicorns:[1,11,12],excluded:[],rows:[1],candidates:[4,5,6,7],lineEliminated:[4,5],regionEliminated:[7],answer:6,success:'Clues combined!'}
  },
  {
    id:'across-cube',title:'Across the Cube',final:true,
    board:{panels:faces,unicorns:[],excluded:[],sharedIds:[edge(3)]},
    steps:[
      {caption:'The faces are connected.',focusIds:[edge(3)]},
      {caption:'These edge spots are one cell.',focusIds:[edge(3)]},
      {caption:'Place a unicorn on the Front edge.',focusIds:[edge(3)],placedIds:[edge(3)]},
      {caption:'It appears on Right too.',focusIds:[edge(3)],placedIds:[edge(3)]},
      {caption:'That Right row is now filled.',focusIds:[edge(3)],placedIds:[edge(3)],eliminatedRefs:rightRow(3)}
    ],
    exercise:{caption:'Your turn. Tap its matching spot on Right.',panels:faces,unicorns:[edge(4)],excluded:[],hiddenFaces:['right'],focusRefs:['front:4:6'],answer:'right:4:0',successEliminatedRefs:rightRow(4),success:'One shared cell, two faces!'}
  }
];
