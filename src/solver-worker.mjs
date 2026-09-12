import {countGlobal} from '../experiments/rainbow-cube/model.mjs';
self.onmessage=({data})=>{try{const {count,exact,status}=countGlobal(data.maps,data.marks);self.postMessage({revision:data.revision,count,exact,status});}catch(error){self.postMessage({revision:data.revision,error:error.message});}};
