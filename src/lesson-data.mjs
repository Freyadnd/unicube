// Cell indices are row * 4 + column. Each color is one connected face-local region.
const stripes=Array.from({length:16},(_,i)=>i%4);
export const lessons=[
  {
    id:'only-spot',title:'Only spot',
    board:{regions:stripes,unicorns:[0,5,11],excluded:[]},
    steps:[
      {caption:'One unicorn per rainbow.',regions:[2],candidates:[2,6,10,14]},
      {caption:'These rows already have unicorns.',rows:[0,1,2],regions:[2],candidates:[2,6,10,14]},
      {caption:'That row is filled.',regions:[2],candidates:[6,10,14],eliminated:[2]},
      {caption:'This row too.',regions:[2],candidates:[10,14],eliminated:[2,6]},
      {caption:'And this one.',regions:[2],candidates:[14],eliminated:[2,6,10]},
      {caption:'Only one spot left.',regions:[2],candidates:[14],eliminated:[2,6,10],focus:[14]},
      {caption:'This rainbow places its unicorn here.',regions:[2],eliminated:[2,6,10],placed:[14]}
    ],
    exercise:{caption:'Your turn. Tap the only spot.',regions:stripes,unicorns:[2,7,9],excluded:[],highlightRegions:[0],candidates:[0,4,8,12],answer:12,success:'You found it!'}
  },
  {
    id:'locked-pair',title:'Locked pair',
    board:{regions:stripes,unicorns:[3],excluded:[12,13]},
    steps:[
      {caption:'These two rainbows have two spots each.',regions:[0,1],candidates:[4,5,8,9],eliminated:[0,1,12,13]},
      {caption:'Both must use these two rows.',regions:[0,1],rows:[1,2],candidates:[4,5,8,9],eliminated:[0,1,12,13]},
      {caption:'Those rows are reserved.',regions:[0,1],rows:[1,2],candidates:[4,5,8,9],eliminated:[0,1,12,13]},
      {caption:'Rule out yellow in those rows.',regions:[2],rows:[1,2],candidates:[14],eliminated:[2,6,10],focus:[14]},
      {caption:'Yellow has one spot left.',regions:[2],eliminated:[2,6,10],placed:[14]}
    ],
    exercise:{caption:'Orange and yellow reserve rows 1 and 3. Where can red go?',regions:stripes,unicorns:[15],excluded:[5,6,13,14],highlightRegions:[0,1,2],rows:[0,2],pairCandidates:[1,2,9,10],candidates:[0,4,8],answer:4,success:'Pair spotted!'}
  }
];
