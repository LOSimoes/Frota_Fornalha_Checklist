(function(root){
  function error(state, record){
    const pending=state?.pending;
    if(record.type==='Saída'&&pending)return `Antes de uma nova saída, registre o retorno do veículo ${pending.vehicleName}. Há uma saída pendente deste motorista, mesmo que tenha sido em outro dia.`;
    if(record.type==='Retorno'&&!pending)return 'Não há saída pendente para este motorista. Registre primeiro a saída.';
    if(record.type==='Retorno'&&pending.vehicle!==Number(record.vehicle))return `Registre o retorno do veículo ${pending.vehicleName}, usado na saída pendente.`;
    if(state?.lastAt&&record.inspectedAt&&Date.parse(record.inspectedAt)<Date.parse(state.lastAt))return 'A data da vistoria é anterior ao último movimento. Confira o relógio do aparelho e sincronize os registros anteriores.';
    return '';
  }
  function advance(state, record){
    return {lastId:record.id,lastAt:record.inspectedAt,pending:record.type==='Saída'?{id:record.id,vehicle:Number(record.vehicle),vehicleName:record.vehicleName,inspectedAt:record.inspectedAt,km:record.km}:null};
  }
  const api={error,advance};
  if(typeof module!=='undefined')module.exports=api;else root.FornalhaTrips=api;
})(typeof window==='undefined'?globalThis:window);
