import {topology} from '../experiments/cube-topology/topology.mjs';
import {createTopology} from '../experiments/cube-topology/topology.mjs';
import {createPlayer} from './player.mjs';

export function makeCampaign(small, saved) {
  const titles=['FIRST STEPS','ONE OF EACH','YOUR TURN','FULL RAINBOW','THE EDGE','THE CORNER','UNICUBE'];
  const levels=small.map(level=>{
    const t=createTopology(level.n);
    return {...level,maps:Object.fromEntries(t.faces.map(face=>[face,level.map])),
      truth:level.truth.map((col,row)=>t.faceCellToPhysical('front',row,col)),activeFaces:['front'],fixed:[]};
  });
  levels.push(...['L1','L3','L4','L5'].map(id=>{
    const level=saved.find(l=>l.id===id);
    if(!level)throw Error(`Missing saved campaign fixture ${id}`);
    const visible=id=>topology.physicalToFaceCells(id).some(r=>level.activeFaces.includes(r.face));
    return {...level,n:7,truth:level.truth.filter(visible),fixed:level.fixed.filter(visible)};
  }));
  return levels.map((level,i)=>({...level,sourceId:level.id,id:`T${i+1}`,title:titles[i],
    message:['','one of each','','','edges are shared','corners too','solve the cube'][i],
    shared:i===4?'6,2,6':i===5?'6,6,6':null}));
}

// Saved true cube fixtures: all six faces at every size. Legacy stays separate.
export function makeCubeCampaign(cubes,saved){
  const final=saved.find(level=>level.id==='L5');
  if(!final)throw Error('Missing saved full cube');
  return [...cubes,{...final,n:7,excluded:[]}].map((level,i)=>({...level,
    id:`U${level.n}`,title:['FIRST STEPS','CONSTELLATION','DEEPER','UNICUBE'][i],
    message:'',startFace:['front','top','back','left'][i],activeFaces:topology.faces.slice()}));
}

// This is the same construction path used at startup and by the Next button.
export function openCampaignLevel(levels,index) {
  if(!Number.isInteger(index)||!levels[index])throw Error('Unknown campaign stage');
  const board=levels[index],t=board.n===7?topology:createTopology(board.n);
  return {index,board,topology:t,player:createPlayer(board.maps,t,board.fixed,board.activeFaces,board.excluded||[])};
}

export function advanceCampaign(levels,current) {
  if(!current.player.evaluate().solved||current.index===levels.length-1)return current;
  return openCampaignLevel(levels,current.index+1);
}

// Readable development level descriptors. Fixtures remain the single source
// of puzzle data; active faces only filter which constraints are enforced.
export function makeLevels(fixtures,t=topology){
  const tutorial=fixtures.tutorialLevels, c=fixtures.C,a=fixtures.A,b=fixtures.B;
  if(tutorial)return tutorial;
  return [
    {id:'L1',maps:a.maps,truth:a.truth,activeFaces:['front'],fixed:[],message:'one in every row, column & rainbow'},
    {id:'L2',maps:b.maps,truth:b.truth,activeFaces:['front'],fixed:[],message:'one in every row, column & rainbow'},
    {id:'L3',maps:c.maps,truth:c.truth,activeFaces:['front','right'],fixed:[],message:'edges are shared'},
    {id:'L4',maps:c.maps,truth:c.truth,activeFaces:['front','right','top'],fixed:[],message:'corners belong to three faces'},
    ...['L5','L6','L7','L8','L9','L10'].map((id,i)=>({id,maps:[a,b,c][i%3].maps,truth:[a,b,c][i%3].truth,activeFaces:t.faces.slice(),fixed:[],message:'solve the cube'}))
  ];
}

export function createProgress(storage=null){let highest=Number(storage?.getItem('unicube.highest')||0);return {get highest(){return highest;},complete(index){if(index>highest){highest=index;storage?.setItem('unicube.highest',String(highest));}},reset(){highest=0;storage?.removeItem('unicube.highest');}};}
