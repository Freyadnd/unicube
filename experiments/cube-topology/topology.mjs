// Development-only topology: lattice locations on the boundary of [0,n-1]^3.
// Origins below are in units of m=n-1; row/column vectors are unit steps.
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
export const frames = freeze({
  front:  {origin:[0,1,1], row:[0,-1,0], column:[1,0,0], normal:[0,0,1]},
  back:   {origin:[1,1,0], row:[0,-1,0], column:[-1,0,0], normal:[0,0,-1]},
  left:   {origin:[0,1,0], row:[0,-1,0], column:[0,0,1], normal:[-1,0,0]},
  right:  {origin:[1,1,1], row:[0,-1,0], column:[0,0,-1], normal:[1,0,0]},
  top:    {origin:[0,1,0], row:[0,0,1], column:[1,0,0], normal:[0,1,0]},
  bottom: {origin:[0,0,1], row:[0,0,-1], column:[1,0,0], normal:[0,-1,0]},
});
export const faces = Object.freeze(Object.keys(frames));
export const sides = Object.freeze(['top','right','bottom','left']);

export function createTopology(n=7) {
  if (!Number.isSafeInteger(n) || n<2) throw new Error('n must be an integer >= 2');
  const m=n-1, byId=new Map(), edgeLookup=new Map();
  const checkFace=face=>{if (!faces.includes(face)) throw new Error('Unknown face');};
  const checkIndex=i=>{if (!Number.isInteger(i)||i<0||i>=n) throw new Error('Coordinate outside face');};
  function faceCellToPhysical(face,row,col) {
    checkFace(face); checkIndex(row); checkIndex(col);
    const f=frames[face];
    return f.origin.map((o,k)=>o*m+row*f.row[k]+col*f.column[k]).join(',');
  }
  function getCell(id) {
    if (!byId.has(id)) throw new Error('Unknown physical cell ID');
    return byId.get(id);
  }
  function physicalToFaceCells(id) { return getCell(id).faceCells; }
  function edgeCell(face,side,index) {
    checkFace(face); checkIndex(index);
    if (!sides.includes(side)) throw new Error('Unknown side');
    const [row,col]=side==='top'?[0,index]:side==='bottom'?[m,index]:side==='left'?[index,0]:[index,m];
    return {face,row,col};
  }
  for (const face of faces) for(let row=0;row<n;row++) for(let col=0;col<n;col++) {
    const id=faceCellToPhysical(face,row,col);
    if(!byId.has(id)) byId.set(id,{id,coordinates:id.split(',').map(Number),faceCells:[]});
    byId.get(id).faceCells.push({face,row,col});
  }
  const physicalCells=freeze([...byId.values()].sort((a,b)=>{
    for(let k=0;k<3;k++) if(a.coordinates[k]!==b.coordinates[k]) return a.coordinates[k]-b.coordinates[k];
    return 0;
  }));
  // Group the 24 local sides by their two geometric endpoints, not a seam table.
  const groups=new Map();
  for(const face of faces) for(const side of sides) {
    const cells=Array.from({length:n},(_,index)=>{
      const r=edgeCell(face,side,index); return faceCellToPhysical(r.face,r.row,r.col);
    });
    const key=[cells[0],cells[m]].sort().join('|');
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push({face,side,cells});
  }
  const edges=[];
  for(const [id,pair] of groups) {
    if(pair.length!==2) throw new Error('Physical edge must join two sides');
    const [a,b]=pair, reversed=a.cells[0]!==b.cells[0];
    if(!a.cells.every((cell,i)=>cell===b.cells[reversed?m-i:i])) throw new Error('Inconsistent edge');
    const edge=freeze({id,a:{face:a.face,side:a.side},b:{face:b.face,side:b.side},
      orientation:reversed?'reversed':'preserved',cells:a.cells,interiorCells:a.cells.slice(1,-1)});
    edges.push(edge);
    edgeLookup.set(`${a.face}:${a.side}`,{edge,target:edge.b});
    edgeLookup.set(`${b.face}:${b.side}`,{edge,target:edge.a});
  }
  // Re-express the SAME shared cell in the neighboring face; this is not a step.
  function mapEdge(face,side,index) {
    edgeCell(face,side,index); // Validate before lookup.
    const {edge,target}=edgeLookup.get(`${face}:${side}`);
    const targetIndex=edge.orientation==='reversed'?m-index:index;
    return {...edgeCell(target.face,target.side,targetIndex),side:target.side,index:targetIndex,orientation:edge.orientation};
  }
  // Physical grid adjacency is the union of orthogonal local steps after gluing.
  const adjacent=new Map(physicalCells.map(c=>[c.id,new Set()]));
  for(const cell of physicalCells) for(const {face,row,col} of cell.faceCells)
    for(const [r,c] of [[row-1,col],[row+1,col],[row,col-1],[row,col+1]])
      if(r>=0&&r<n&&c>=0&&c<n) adjacent.get(cell.id).add(faceCellToPhysical(face,r,c));
  for(const [id,set] of adjacent) adjacent.set(id,Object.freeze([...set].sort()));
  function physicalNeighbors(id) {getCell(id); return adjacent.get(id);}
  const corners=Object.freeze(physicalCells.filter(c=>c.faceCells.length===3));
  return Object.freeze({n,frames,faces,physicalCells,edges:Object.freeze(edges),corners,
    faceCellToPhysical,physicalToFaceCells,edgeCell,mapEdge,physicalNeighbors});
}

export const topology=createTopology();
export const {faceCellToPhysical,physicalToFaceCells,mapEdge,physicalNeighbors,edges,corners,physicalCells}=topology;
