const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const crypto=require('node:crypto');
const {openStore}=require('../inspections.cjs');const {create}=require('../outbox.js');
const now=Date.parse('2026-11-01T12:00:00Z');
function fixture(type='Saída',vehicle=0,date='2026-10-10T10:00:00Z'){return {version:2,id:crypto.randomUUID(),driverId:1,driver:'Motorista 01 · exemplo',vehicle,vehicleName:'Master '+vehicle,refrigerated:true,type,km:100,temperature:-16,inspectedAt:date,answers:Object.fromEntries(['pneus','freios','luzes','oleo','motor','avarias','seguranca','frio'].map(id=>[id,'OK'])),notes:{},levels:{}};}
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fornalha-trips-'));let store=openStore(dir);t.after(()=>{store.close();assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('fornalha-trips-'));fs.rmSync(dir,{recursive:true,force:true});});return {get s(){return store;},restart(){store.close();store=openStore(dir);}};}
test('saídas consecutivas dispensam retorno, preservando idempotência e histórico',t=>{
 const {s}=setup(t),a=fixture();s.save(a,now);assert.equal(s.save(a,now).duplicate,true);
 s.save(fixture('Saída',0,'2026-10-11T10:00:00Z'),now);
 s.save(fixture('Saída',1,'2026-10-12T10:00:00Z'),now);
 assert.equal(s.catalog().tripRules,false);
 assert.equal(s.list('2026-10-10','2026-10-12').returns,0);
 assert.equal(s.catalog().vehicles[0].lastDeparture.inspectedAt,'2026-10-11T10:00:00.000Z');
});
test('inativos somem da captura e continuam no histórico após reinício',t=>{
 const c=setup(t);c.s.save(fixture(),now);c.restart();
 c.s.saveCatalog({kind:'vehicle',id:0,name:'Frota 01',active:false,refrigerated:true});
 assert.ok(!c.s.catalog().vehicles.some(v=>v.id===0));assert.ok(c.s.catalog(true).vehicles.some(v=>v.id===0));
 assert.throws(()=>c.s.save(fixture(),now));
 c.s.save(fixture('Retorno',0,'2026-10-10T18:00:00Z'),now); // Fila da versão anterior.
});
test('dois aparelhos podem registrar saídas e recibos repetidos não duplicam',t=>{
 const {s}=setup(t),a=fixture();s.save(a,now);s.save(fixture('Saída',2),now);assert.equal(s.save(a,now).duplicate,true);assert.equal(s.list('2026-10-10').total,2);
});

test('sincronização respeita ordem de saída e retorno apesar da ordem dos UUIDs',async t=>{
 const {s}=setup(t),rows=[];
 const storage={all:async()=>structuredClone([...rows].sort((a,b)=>a.id.localeCompare(b.id))),put:async row=>{const i=rows.findIndex(r=>r.id===row.id);if(i<0)rows.push(row);else rows[i]=row;}};
 const q=create({storage,send:async r=>s.save(r,now)});
 const a={...fixture(),id:'ffffffff-ffff-4fff-8fff-ffffffffffff'};
 const b={...fixture('Retorno',0,'2026-10-10T18:00:00Z'),id:'00000000-0000-4000-8000-000000000000'};
 await q.enqueue(a);await q.enqueue(b);await q.sync();
 assert.ok(rows.every(r=>r.status==='sent'));assert.equal(s.catalog().drivers[0].trip.pending,null);
});
