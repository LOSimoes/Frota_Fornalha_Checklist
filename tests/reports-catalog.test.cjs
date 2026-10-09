const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {openStore}=require('../inspections.cjs');
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fornalha-report-'));const store=openStore(dir);t.after(()=>{store.close();assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('fornalha-report-'));fs.rmSync(dir,{recursive:true,force:true});});return store;}
function record(date,vehicle=0){return {version:1,id:crypto.randomUUID(),driver:'Motorista 01 · exemplo',vehicle,type:'Saída',km:100,temperature:-16,inspectedAt:date,answers:Object.fromEntries(['pneus','freios','luzes','oleo','motor','avarias','seguranca','frio'].map(id=>[id,'OK'])),notes:{},levels:{}};}
const now=Date.parse('2026-12-01T12:00:00Z');
test('intervalo inclusivo, dias distintos, defeitos e itens não verificados separados',t=>{
 const s=setup(t);
 for(const date of ['2026-10-01T03:00:00Z','2026-10-01T18:00:00Z','2026-10-15T20:00:00Z','2026-10-16T02:59:59Z','2026-10-16T03:00:00Z']){
  const r=record(date);r.driver='Teste '+date;r.answers.freios='Problema';r.notes.freios='Ruído';r.answers.oleo='Não verifiquei';r.temperature=-9;s.save(r,now);
 }
 const report=s.list('2026-10-01','2026-10-15');assert.equal(report.total,4);assert.equal(report.defects,4);assert.equal(report.maintenanceAlerts,4);assert.equal(report.unverified.length,4);
 const brakes=report.frequency.find(g=>g.item==='Freios e direção');assert.equal(brakes.count,4);assert.equal(brakes.days,2);assert.deepEqual(brakes.dates,['2026-10-01','2026-10-15']);
 assert.throws(()=>s.list('2026-10-15','2026-10-01'));assert.throws(()=>s.list('2026-02-30'));
 assert.equal(s.list('2026-11-01','2026-11-30').total,0);
});
test('relatório completo não corta na centésima vistoria',t=>{
 const s=setup(t);for(let i=0;i<105;i++)s.save({...record('2026-10-01T12:00:00Z'),driver:'Teste '+i},now);assert.equal(s.list('2026-10-01').records.length,105);
});
test('cadastros, vínculo manual, hábito e histórico após renomear',t=>{
 const s=setup(t);s.save(record('2026-10-01T12:00:00Z',0),now);s.save({...record('2026-10-02T12:00:00Z',0),type:'Retorno'},now);s.save(record('2026-10-03T12:00:00Z',1),now);
 let driver=s.catalog().drivers[0];assert.equal(driver.suggestedVehicleId,0);
 s.saveCatalog({kind:'driver',id:driver.id,name:'João',active:true,defaultVehicleId:null});assert.equal(s.catalog().drivers[0].suggestedVehicleId,0);
 s.saveCatalog({kind:'driver',id:driver.id,name:'João',active:true,defaultVehicleId:1});assert.equal(s.catalog().drivers[0].suggestedVehicleId,1);
 s.saveCatalog({kind:'vehicle',id:0,name:'Frota 2021',active:true,refrigerated:true});assert.equal(s.list('2026-10-01').records[0].vehicleName,'Master curta 01');
 const c=s.saveCatalog({kind:'vehicle',name:'Frota 07',active:true,refrigerated:false});const v=c.vehicles.find(v=>v.name==='Frota 07');assert.ok(v.id>5);
 s.save({...record('2026-10-03T13:00:00Z',1),type:'Retorno'},now);
 const r={...record('2026-10-04T12:00:00Z',v.id),version:2,driver:'João',driverId:driver.id,refrigerated:false,vehicleName:v.name,temperature:null};s.save(r,now);
 s.saveCatalog({kind:'vehicle',id:v.id,name:'Frota 08',active:false,refrigerated:false});assert.equal(s.list('2026-10-04').records[0].vehicleName,'Frota 07');assert.equal(s.save(r,now).duplicate,true);
 assert.ok(s.catalog().vehicles.some(x=>x.id===v.id&&!x.active)); // Ainda disponível para o retorno pendente.
 s.save({...r,id:crypto.randomUUID(),type:'Retorno',inspectedAt:'2026-10-04T13:00:00Z'},now);assert.ok(!s.catalog().vehicles.some(x=>x.id===v.id));assert.ok(s.catalog(true).vehicles.some(x=>x.id===v.id));
 assert.throws(()=>s.saveCatalog({kind:'driver',name:'João',active:true}));
});
