const {test}=require('node:test');const assert=require('node:assert/strict');const {summarize}=require('../fleet-overview.js');
test('prioridades distinguem crítico, manutenção em execução, agendamento e ausência de vistoria',()=>{
 const cars=[0,1,2,3,4].map(id=>({id,name:'Carro '+id,active:true}));
 const issue=(vehicle,kind,status)=>({vehicle,vehicleName:'Carro '+vehicle,kind,status,inspectedAt:'2026-10-23T10:00:00Z'});
 const report={records:[{vehicle:3,vehicleName:'Carro 3',type:'Saída'},{vehicle:4,vehicleName:'Carro 4',type:'Saída',cancelled:true}],occurrences:[issue(0,'Crítico','Aberto'),issue(1,'Atenção','Em manutenção'),issue(2,'Atenção','Manutenção agendada'),issue(3,'Crítico','Resolvido')]};
 const list=summarize(report,cars);assert.deepEqual(list.map(v=>v.id),[0,1,2,3,4]);assert.equal(list[0].critical,1);assert.equal(list[1].inProgress,1);assert.equal(list[2].scheduled,1);assert.equal(list[3].pending.length,0);assert.match(list[3].label,/Sem pendências/);assert.match(list[4].label,/Sem vistoria/);
 assert.deepEqual(summarize({records:[],occurrences:[],vehicleId:0},cars).map(v=>v.id),[0]);
});
