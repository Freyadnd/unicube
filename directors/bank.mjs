export function resolveConstellation(bank,search){
  if(!Array.isArray(bank)||!bank.length)throw Error('Verified constellation bank is empty');
  const requested=new URLSearchParams(search).get('s');
  return bank.find(x=>x.id===requested)||bank[0];
}
export function nextConstellation(bank,current){
  return bank[(bank.findIndex(x=>x.id===current.id)+1)%bank.length];
}
export function validateBank(bank){
  if(!Array.isArray(bank)||bank.length<1)throw Error('Empty constellation bank');
  const ids=new Set;
  for(const item of bank){
    if(!/^\d+$/.test(item.id)||ids.has(item.id)||item.metadata.globalSolutionCount!==1||item.maps&&Object.values(item.maps).length!==6)throw Error('Invalid constellation metadata');
    ids.add(item.id);
  }
  return bank;
}
