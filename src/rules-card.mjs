export function setupRulesCard({dialog,button,close,storage,first=false}){
  const key='unicube.rules.seen';let seen=false;
  try{seen=storage?.getItem(key)==='1';}catch{}
  button.textContent='Rules';
  function open(play=false){close.textContent=play?'Play':'Close';close.setAttribute('aria-label',play?'Play':'Close rules');dialog.showModal();}
  function dismiss(){dialog.close();try{storage?.setItem(key,'1');}catch{}}
  button.onclick=()=>open();close.onclick=dismiss;
  dialog.addEventListener('cancel',()=>{try{storage?.setItem(key,'1');}catch{}});
  if(first&&!seen)open(true);
}
