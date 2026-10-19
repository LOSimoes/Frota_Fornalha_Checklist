(function(root){
  const day=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  function merge(vehicle,record){
    if(!vehicle||vehicle.id!==Number(record.vehicle)||record.type!=='Saída'||record.cancelled)return;
    const old=vehicle.lastDeparture;
    if(!old||Date.parse(record.inspectedAt)>Date.parse(old.inspectedAt)||(record.inspectedAt===old.inspectedAt&&(record.receivedAt||'')>=(old.receivedAt||'')))vehicle.lastDeparture={id:record.id,inspectedAt:record.inspectedAt,receivedAt:record.receivedAt||null,driverId:record.driverId,driver:record.driver};
  }
  function status(vehicle,today=day(Date.now())){
    if(!vehicle.active)return 'inactive';
    const last=vehicle.lastDeparture;if(!last)return 'first';
    return day(last.inspectedAt)>=today?'checked':'due';
  }
  const api={day,merge,status};if(typeof module!=='undefined')module.exports=api;else root.FornalhaDaily=api;
})(typeof window==='undefined'?globalThis:window);
