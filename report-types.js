(function(root){
 const damageKeys=new Set(['avarias']);
 function kind(record,item){
  if(record.type==='Ocorrência')return record.category==='Batida ou avaria'?'damage':['Defeito','Quebra na rua'].includes(record.category)?'maintenance':'review';
  return damageKeys.has(item)||item==='Carroceria e portas'?'damage':'maintenance';
 }
 function entries(record,items={}){
  const result=Object.entries(record.answers||{}).filter(([,v])=>v==='Problema').map(([key])=>({key,label:items[key]||key,kind:kind(record,key),severity:record.levels?.[key]||record.severity||'Não sei avaliar',note:record.notes?.[key]||record.description||''}));
  for(const a of record.alerts||[])if(a.kind==='Manutenção'&&!result.some(e=>e.label===a.item))result.push({key:'frio',label:a.item,kind:'maintenance',severity:a.kind,note:a.note});
  return result;
 }
 const api={kind,entries};if(typeof module!=='undefined')module.exports=api;else root.ReportTypes=api;
})(typeof globalThis!=='undefined'?globalThis:this);
