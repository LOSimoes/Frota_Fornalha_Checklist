const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const crypto=require('node:crypto');
const {openStore}=require('../inspections.cjs');const {create}=require('../outbox.js');
const image=fs.readFileSync(path.join(__dirname,'fixtures/photo.jpg'));
function fixture(){return {version:1,id:crypto.randomUUID(),driver:'Teste',vehicle:0,type:'Saída',km:100,temperature:-16,inspectedAt:'2026-10-08T12:00:00Z',answers:Object.fromEntries(['pneus','freios','luzes','oleo','motor','avarias','seguranca','frio'].map(id=>[id,id==='avarias'?'Problema':'OK'])),notes:{avarias:'Risco na porta'},levels:{avarias:'Leve'},photos:[{id:crypto.randomUUID(),item:'avarias',data:'data:image/jpeg;base64,'+image.toString('base64')}]};}
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fornalha-beta-'));const store=openStore(dir);t.after(()=>{store.close();assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('fornalha-beta-'));fs.rmSync(dir,{recursive:true,force:true});});return store;}
test('fotos persistem, não duplicam e resposta de relatório não contém base64',t=>{
 const s=setup(t),r=fixture();s.save(r);assert.equal(s.save(r).duplicate,true);assert.deepEqual(Buffer.from(s.photo(r.photos[0].id).data),image);
 const report=s.list('2026-10-08');assert.equal(report.records[0].photos.length,1);assert.ok(!JSON.stringify(report).includes('base64'));
 const invalid=fixture();invalid.photos[0].data='data:image/svg+xml;base64,PHN2Zz4=';assert.throws(()=>s.save(invalid));
 const excessive=fixture();excessive.photos=Array.from({length:7},()=>({...r.photos[0],id:crypto.randomUUID()}));assert.throws(()=>s.save(excessive));
 const collision=fixture();collision.photos[0].id=r.photos[0].id;assert.throws(()=>s.save(collision));assert.equal(s.list('2026-10-08').total,1);
});
test('filtro inclui veículo zero, inativo e renomeado em todos os totais',t=>{
 const s=setup(t),a=fixture(),b=fixture();b.vehicle=1;b.driver='Outro motorista';s.save(a);s.save(b);s.saveCatalog({kind:'vehicle',id:0,name:'Frota 01',active:false,refrigerated:true});
 const report=s.list('2026-10-08','2026-10-08',0);assert.equal(report.total,1);assert.equal(report.defects,1);assert.equal(report.frequency[0].count,1);assert.equal(report.vehicleLabel,'Frota 01');assert.equal(report.records[0].vehicleName,'Master curta 01');assert.throws(()=>s.list('2026-10-08','2026-10-08',-1));
});
test('fila mantém foto enquanto offline e só remove bytes após recibo',async()=>{
 let rows=[],online=false;const r=fixture();const storage={all:async()=>structuredClone(rows),put:async row=>{rows=[structuredClone(row)];}};
 const queue=create({storage,send:async()=>{if(!online)throw new Error('offline');return {id:r.id,receivedAt:new Date().toISOString()};}});
 await queue.enqueue(r);await queue.sync();assert.equal(rows[0].payload.photos[0].data,r.photos[0].data);online=true;await queue.sync();assert.equal(rows[0].status,'sent');assert.equal(rows[0].payload.photos[0].data,undefined);
});
test('backup consistente reabre com fotos e registros',t=>{
 const {backup}=require('../scripts/backup.cjs');const root=fs.mkdtempSync(path.join(os.tmpdir(),'fornalha-beta-'));const source=path.join(root,'source');fs.mkdirSync(source);const store=openStore(source);const r=fixture();store.save(r);
 const destination=path.join(root,'backup');backup(source,destination);const restored=openStore(destination);
 try{assert.equal(restored.list('2026-10-08').total,1);assert.deepEqual(Buffer.from(restored.photo(r.photos[0].id).data),image);assert.throws(()=>backup(source,destination));}finally{restored.close();store.close();assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('fornalha-beta-'));fs.rmSync(root,{recursive:true,force:true});}
});
