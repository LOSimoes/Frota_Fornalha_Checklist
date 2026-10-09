(function(root) {
  function browserStorage() {
    const ready = new Promise((resolve,reject)=>{
      const request = indexedDB.open('fornalha-vistorias',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('outbox',{keyPath:'id'});
      request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error);
    });
    async function transact(mode, action) {
      const db=await ready;
      return new Promise((resolve,reject)=>{
        const tx=db.transaction('outbox',mode), request=action(tx.objectStore('outbox'));
        tx.oncomplete=()=>resolve(request.result); tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error || new Error('Falha ao salvar no aparelho.'));
      });
    }
    return {all:()=>transact('readonly',store=>store.getAll()),put:row=>transact('readwrite',store=>store.put(row))};
  }
  function create({storage,send,onChange=()=>{}}) {
    let running;
    async function notify(){onChange(await storage.all());}
    return {
      all:()=>storage.all(),
      async enqueue(payload){
        const previous=(await storage.all()).find(row=>row.id===payload.id);
        if(previous) return previous;
        const row={id:payload.id,payload,status:'pending'};
        await storage.put(row);await notify();return row;
      },
      sync(){
        if(running)return running;
        running=(async()=>{
          for(const row of await storage.all()){
            if(row.status!=='pending')continue;
            try{
              const receipt=await send(row.payload);
              if(receipt.id!==row.id || !receipt.receivedAt)throw new Error('Confirmação inválida.');
              const payload={...row.payload};
              if(payload.photos)payload.photos=payload.photos.map(({data,...photo})=>photo);
              await storage.put({...row,payload,status:'sent',receivedAt:receipt.receivedAt,message:''});
            }catch(error){
              if(error.permanent)await storage.put({...row,status:'rejected',message:error.message});
              else break;
            }
          }
          await notify();
        })().finally(()=>{running=null;});
        return running;
      }
    };
  }
  if(typeof module!=='undefined')module.exports={create};
  else root.FrotaOutbox={create,browserStorage};
})(typeof window==='undefined'?globalThis:window);
