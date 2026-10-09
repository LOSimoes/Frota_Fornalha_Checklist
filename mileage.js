(function(root){
  function reading(record){return {id:record.id,km:record.km,type:record.type,inspectedAt:record.inspectedAt,receivedAt:record.receivedAt||null};}
  function merge(vehicle,record){
    if(!vehicle||Number(vehicle.id)!==Number(record.vehicle)||!Number.isSafeInteger(record.km))return;
    const next=reading(record);
    const newer=old=>!old||Date.parse(next.inspectedAt)>Date.parse(old.inspectedAt)||(next.inspectedAt===old.inspectedAt&&(!old.receivedAt||!next.receivedAt||next.receivedAt>=old.receivedAt));
    if(newer(vehicle.lastReading))vehicle.lastReading=next;
    if(record.type==='Retorno'&&newer(vehicle.lastReturn))vehicle.lastReturn=next;
  }
  function reference(vehicle){return vehicle?.lastReturn||vehicle?.lastReading||null;}
  const api={merge,reference};
  if(typeof module!=='undefined')module.exports=api;else root.FornalhaMileage=api;
})(typeof window==='undefined'?globalThis:window);
