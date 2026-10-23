const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const crypto=require('node:crypto');
const {openStore}=require('../inspections.cjs');const {backup}=require('../scripts/backup.cjs');
function fixture(vehicle=0){return {version:1,id:crypto.randomUUID(),driver:'Teste',vehicle,type:'Saída',km:100,temperature:-16,inspectedAt:'2026-09-08T12:00:00Z',answers:Object.fromEntries(['pneus','freios','luzes','oleo','motor','avarias','seguranca','frio'].map(id=>[id,id==='oleo'?'Problema':'OK'])),notes:{oleo:'Óleo baixo'},levels:{oleo:'Crítico'}};}
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fornalha-workshop-'));let s=openStore(dir);t.after(()=>{s.close();if(path.dirname(dir)===os.tmpdir()&&path.basename(dir).startsWith('fornalha-workshop-'))fs.rmSync(dir,{recursive:true,force:true});});return {s,dir};}
const order=r=>({requestId:crypto.randomUUID(),id:crypto.randomUUID(),action:'order',vehicle:r.vehicle,revision:0,status:'Aberta',issues:[{id:r.id,item:'Nível de óleo'}]});
test('ordem reúne relatos antigos, conclui com foto, mantém idempotência e restaura no backup',t=>{
 const {s,dir}=setup(t),r=fixture(),second=fixture();s.save(r);s.save(second);const p=order(r);s.workshop.save(p);assert.equal(s.workshop.save(p).duplicate,true);
 const next={...p,requestId:crypto.randomUUID(),revision:1,status:'Concluída',issues:[...p.issues,{id:second.id,item:'Nível de óleo'}],service:'Vedação substituída',costCents:12550,km:200,evidence:[{data:'data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'fixtures/photo.jpg')).toString('base64'),caption:'Serviço concluído'}]};
 s.workshop.save(next);assert.equal(s.workshop.save(next).duplicate,true);const saved=s.workshop.orders()[0];assert.equal(saved.issues.length,2);assert.equal(saved.evidence.length,1);assert.equal(saved.history.length,2);assert.equal(s.list('2026-09-01','2026-09-30').occurrences.every(o=>o.status==='Resolvido'),true);
 const copy=fs.mkdtempSync(path.join(os.tmpdir(),'fornalha-workshop-copy-'));t.after(()=>{if(path.dirname(copy)===os.tmpdir()&&path.basename(copy).startsWith('fornalha-workshop-copy-'))fs.rmSync(copy,{recursive:true,force:true});});const dest=path.join(copy,'snapshot');backup(dir,dest);const restored=openStore(dest);try{assert.equal(restored.workshop.orders()[0].costCents,12550);assert.ok(restored.workshop.evidence(saved.evidence[0].id).data.length);}finally{restored.close();}
});
test('ordem rejeita concorrência, outro veículo, vínculos duplicados e valores inválidos sem alterar dados',t=>{
 const {s}=setup(t),r=fixture(),other=fixture(1);s.save(r);s.save(other);const p=order(r);s.workshop.save(p);
 assert.throws(()=>s.workshop.save({...p,requestId:crypto.randomUUID()}),/alterada/);
 assert.throws(()=>s.workshop.save({...order(r),id:crypto.randomUUID()}),/outra ordem/);
 assert.throws(()=>s.workshop.save({...p,requestId:crypto.randomUUID(),revision:1,issues:[{id:other.id,item:'Nível de óleo'}]}),/outro veículo/);
 assert.throws(()=>s.workshop.save({...p,requestId:crypto.randomUUID(),revision:1,costCents:-1}),/Valor inválido/);
 assert.equal(s.workshop.orders()[0].revision,1);
});
test('situação operacional é explícita, auditada e independente da ordem',t=>{
 const {s}=setup(t);const p={requestId:crypto.randomUUID(),action:'operation',vehicle:0,revision:0,status:'Indisponível',note:'Aguardando avaliação'};s.workshop.save(p);assert.equal(s.workshop.save(p).duplicate,true);assert.equal(s.workshop.operations()[0].status,'Indisponível');assert.equal(s.workshop.operations()[0].history.length,1);assert.throws(()=>s.workshop.save({...p,requestId:crypto.randomUUID()}),/alterada/);assert.equal(s.workshop.orders().length,0);
});
