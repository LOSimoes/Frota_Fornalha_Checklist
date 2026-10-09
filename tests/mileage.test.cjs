const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const crypto=require('node:crypto');
const {openStore}=require('../inspections.cjs');const mileage=require('../mileage.js');
const now=Date.parse('2026-11-01T12:00:00Z');
function row(type,km,date,driverId=1,vehicle=0){return {version:2,id:crypto.randomUUID(),driverId,driver:'Motorista '+driverId,vehicle,vehicleName:'Carro '+vehicle,refrigerated:true,type,km,temperature:-16,inspectedAt:date,answers:Object.fromEntries(['pneus','freios','luzes','oleo','motor','avarias','seguranca','frio'].map(id=>[id,'OK'])),notes:{},levels:{}};}
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fornalha-mileage-'));const s=openStore(dir);t.after(()=>{s.close();assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('fornalha-mileage-'));fs.rmSync(dir,{recursive:true,force:true});});return s;}
test('quilometragem acompanha veículo, preserva último retorno e distingue diferença antes da saída',t=>{
 const s=setup(t);assert.equal(s.catalog().vehicles[0].lastReading,undefined);
 s.save(row('Saída',100,'2026-10-08T10:00:00Z'),now);s.save(row('Retorno',150,'2026-10-08T18:00:00Z'),now);
 let vehicle=s.catalog().vehicles[0];assert.equal(vehicle.lastReturn.km,150);
 s.save({...row('Saída',170,'2026-10-09T10:00:00Z',2),kmNote:'Outro uso antes da saída'},now);
 vehicle=s.catalog().vehicles[0];assert.equal(vehicle.lastReading.km,170);assert.equal(vehicle.lastReturn.km,150);assert.equal(mileage.reference(vehicle).km,150);
 const history=s.mileage(0);assert.equal(history.readings.length,3);assert.equal(history.readings[0].gapSinceReturn,20);assert.equal(history.readings[0].kmNote,'Outro uso antes da saída');assert.equal(history.readings[0].driver,'Motorista 2');
 assert.equal(s.catalog().vehicles[1].lastReading,undefined);assert.throws(()=>s.mileage(1000));
});
test('retorno antigo recebido depois não substitui leitura mais recente, mesmo com número maior',t=>{
 const s=setup(t);s.save(row('Saída',100,'2026-10-09T10:00:00Z'),now);s.save(row('Retorno',150,'2026-10-09T18:00:00Z'),now);
 s.save(row('Saída',500,'2026-10-08T10:00:00Z',2),now+100);s.save(row('Retorno',600,'2026-10-08T18:00:00Z',2),now+200);
 const v=s.catalog().vehicles[0];assert.equal(v.lastReading.km,150);assert.equal(v.lastReturn.km,150);
 s.saveCatalog({kind:'vehicle',id:0,name:'Frota renomeada',active:false,refrigerated:true});assert.equal(s.catalog(true).vehicles[0].lastReturn.km,150);
});
test('não altera leitura manual menor: preserva valor, observação e idempotência',t=>{
 const s=setup(t),a=row('Saída',100,'2026-10-08T10:00:00Z');s.save(a,now);
 const b={...row('Retorno',90,'2026-10-08T18:00:00Z'),kmNote:'Correção de leitura do painel'};s.save(b,now);assert.equal(s.save(b,now).duplicate,true);
 assert.equal(s.mileage(0).readings[0].km,90);assert.equal(s.mileage(0).readings[0].kmNote,b.kmNote);
 assert.throws(()=>s.save({...row('Saída',100,'2026-10-09T10:00:00Z'),kmNote:'x'.repeat(501)},now),/500/);
});
test('referência offline aceita retorno pendente local sem regredir por leitura antiga',()=>{
 const v={id:0};mileage.merge(v,row('Retorno',0,'2026-10-08T18:00:00Z'));assert.equal(mileage.reference(v).km,0);
 mileage.merge(v,row('Retorno',250,'2026-10-09T18:00:00Z'));mileage.merge(v,row('Retorno',100,'2026-10-08T18:00:00Z'));
 mileage.merge(v,row('Retorno',1000,'2026-10-10T18:00:00Z',1,1));assert.equal(mileage.reference(v).km,250);
});
