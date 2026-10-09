const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const crypto=require('node:crypto');
const {openStore}=require('../inspections.cjs');const {create}=require('../outbox.js');
const now=Date.parse('2026-11-01T12:00:00Z');
function fixture(type='Saída',vehicle=0,date='2026-10-10T10:00:00Z'){return {version:2,id:crypto.randomUUID(),driverId:1,driver:'Motorista 01 · exemplo',vehicle,vehicleName:'Master '+vehicle,refrigerated:true,type,km:100,temperature:-16,inspectedAt:date,answers:Object.fromEntries(['pneus','freios','luzes','oleo','motor','avarias','seguranca','frio'].map(id=>[id,'OK'])),notes:{},levels:{}};}
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fornalha-trips-'));let store=openStore(dir);t.after(()=>{store.close();assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('fornalha-trips-'));fs.rmSync(dir,{recursive:true,force:true});});return {get s(){return store;},restart(){store.close();store=openStore(dir);}};}
test('exige saída inicial, retorno do mesmo carro e libera uma nova saída somente após retorno',t=>{
 const {s}=setup(t);assert.throws(()=>s.save(fixture('Retorno'),now),/primeiro a saída/);
 const departure=fixture();s.save(departure,now);
 for(const v of [0,1,4])assert.throws(()=>s.save(fixture('Saída',v),now),/retorno do veículo Master curta 01/);
 assert.throws(()=>s.save(fixture('Retorno',1),now),/usado na saída pendente/);
 assert.throws(()=>s.save(fixture('Retorno',0,'2026-10-10T09:00:00Z'),now),/anterior/);
 assert.equal(s.save(departure,now).duplicate,true);
 s.save(fixture('Retorno',0,'2026-10-10T18:00:00Z'),now);
 assert.equal(s.catalog().drivers[0].trip.pending,null);
 assert.equal(s.save(departure,now).trip.pending,null);
 s.save(fixture('Saída',1,'2026-10-11T10:00:00Z'),now);
 assert.equal(s.catalog().drivers[0].trip.pending.vehicle,1);
});
test('pendência persiste após reinício, virada de dia, renomeação e inativação',t=>{
 const ctx=setup(t);ctx.s.save(fixture(),now);ctx.restart();
 ctx.s.saveCatalog({kind:'driver',id:1,name:'Roberto',active:false,defaultVehicleId:null});
 ctx.s.saveCatalog({kind:'vehicle',id:0,name:'Frota 01',active:false,refrigerated:true});
 assert.throws(()=>ctx.s.save({...fixture('Saída',1,'2026-10-11T12:00:00Z'),driver:'Roberto'},now),/retorno/);
 assert.ok(ctx.s.catalog().drivers.some(d=>d.id===1));
 assert.ok(ctx.s.catalog().vehicles.some(v=>v.id===0));
 ctx.s.save({...fixture('Retorno',0,'2026-10-11T12:00:00Z'),driver:'Roberto'},now);
 assert.ok(!ctx.s.catalog().drivers.some(d=>d.id===1));
 assert.ok(!ctx.s.catalog().vehicles.some(v=>v.id===0));
});
test('servidor impede nova saída do mesmo motorista em outro aparelho e separa motoristas',t=>{
 const {s}=setup(t),a=fixture();s.save(a,now);
 const other={...fixture(),driverId:2,driver:'Motorista 02 · exemplo'};s.save(other,now);
 assert.throws(()=>s.save(fixture('Saída',2),now),e=>e.status===409);
 assert.equal(s.list('2026-10-10').total,2);
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
