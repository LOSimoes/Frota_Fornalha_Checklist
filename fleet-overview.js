(function(root){
 function summarize(report,catalog=[]){
  const map=new Map();
  const ensure=(id,name)=>{if(!map.has(id))map.set(id,{id,name,inspections:0,pending:[],resolved:0,critical:0,scheduled:0,inProgress:0});return map.get(id);};
  for(const v of catalog)if(v.active&&(report.vehicleId==null||v.id===report.vehicleId))ensure(v.id,v.name);
  for(const r of report.records||[])if(!r.cancelled){const v=ensure(r.vehicle,r.vehicleName);if(r.type!=='Ocorrência')v.inspections++;}
  for(const o of report.occurrences||[]){const v=ensure(o.vehicle,o.vehicleName);if(o.status==='Resolvido'){v.resolved++;continue;}v.pending.push(o);if(o.kind==='Crítico')v.critical++;if(o.status==='Manutenção agendada')v.scheduled++;if(o.status==='Em manutenção')v.inProgress++;}
  for(const v of map.values()){
   v.priority=v.critical?4:v.inProgress?3:v.pending.some(o=>o.status!=='Manutenção agendada')?2:v.scheduled?1:0;
   v.label=v.critical?'Prioridade: avaliar item crítico':v.inProgress?'Em manutenção — informado pelo gestor':v.priority===2?'Pendências para avaliar':v.scheduled?'Manutenção agendada':v.inspections?'Sem pendências registradas no período':'Sem vistoria no período';
   v.pending.sort((a,b)=>(b.kind==='Crítico')-(a.kind==='Crítico')||a.inspectedAt.localeCompare(b.inspectedAt));
  }
  return [...map.values()].sort((a,b)=>b.priority-a.priority||b.pending.length-a.pending.length||a.name.localeCompare(b.name));
 }
 const api={summarize};if(typeof module!=='undefined')module.exports=api;else root.FleetOverview=api;
})(typeof globalThis!=='undefined'?globalThis:this);
