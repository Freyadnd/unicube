// Saved seed-10 map: region 2 is the singleton at row 2, column 3.
// Its required unicorn excludes the other two stars in that row even before
// it is placed. The guide never commits exclusions or solves anything.
export function t1Guide(get){
  if(get(5)===2)return {text:'one 🦄 per row',unit:[3,4,5],targets:[],done:true};
  const remaining=[3,4].filter(i=>get(i)!==1);
  if(remaining.length)return {text:remaining.length===2?'one 🦄 in every rainbow':'not here',unit:[3,4,5],targets:remaining,region:[5]};
  return {text:'only one star left',unit:[5],targets:[5],region:[5]};
}

export function createT1Presentation(){
  let previous=null,since=0;
  return (get,now)=>{
    const g=t1Guide(get),key=g.done?'done':g.targets.join(',');
    if(key!==previous){previous=key;since=now;}
    if(g.done&&now-since>1400)return {...g,text:'your turn',unit:[],targets:[]};
    if(!g.done&&g.targets.length===1&&g.targets[0]===5&&now-since>1100)return {...g,text:'double-tap it'};
    if(!g.done&&g.targets.length===2&&now-since>1600)return {...g,text:'not here'};
    return g;
  };
}
