/* One draft per browser, separate from the durable submission queue. */
(function(root){
  function create(storage){
    let chain=Promise.resolve();
    return {
      read:()=>chain.then(()=>storage.read()),
      save(value){const copy=structuredClone(value);chain=chain.catch(()=>{}).then(()=>storage.write(copy));return chain;},
      clear(){chain=chain.catch(()=>{}).then(()=>storage.write(null));return chain;}
    };
  }
  function browserStorage(){
    const ready=new Promise((resolve,reject)=>{const r=indexedDB.open('fornalha-rascunho',1);r.onupgradeneeded=()=>r.result.createObjectStore('draft');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    async function run(write,value){const db=await ready;return new Promise((resolve,reject)=>{const tx=db.transaction('draft',write?'readwrite':'readonly'),store=tx.objectStore('draft');const r=write?(value===null?store.delete('current'):store.put(value,'current')):store.get('current');tx.oncomplete=()=>resolve(r.result);tx.onabort=tx.onerror=()=>reject(tx.error||new Error('Falha ao salvar rascunho.'));});}
    return {read:()=>run(false),write:v=>run(true,v)};
  }
  const api={create,browserStorage};if(typeof module!=='undefined')module.exports=api;else root.FornalhaDrafts=api;
})(typeof window==='undefined'?globalThis:window);
