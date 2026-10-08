const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {validate,dateKey}=require('../inspections.cjs');
const {create}=require('../outbox.js');
function fixture(){return {version:1,id:crypto.randomUUID(),driver:'Teste',vehicle:0,type:'Saída',km:100,temperature:-9,inspectedAt:'2026-10-08T02:00:00Z',answers:Object.fromEntries(['pneus','freios','luzes','oleo','motor','avarias','seguranca','frio'].map(id=>[id,'OK'])),notes:{},levels:{}};}
test('servidor valida respostas, notas e temperatura e usa data de São Paulo',()=>{
  const r=fixture();assert.equal(dateKey(r.inspectedAt),'2026-10-07');assert.equal(validate(r).alerts[0].kind,'Manutenção');
  for(const temperature of [-14,-13.1])assert.equal(validate({...r,temperature}).alerts.length,0);
  for(const temperature of [-13,-9,0,10])assert.equal(validate({...r,temperature}).alerts.length,1);
  assert.throws(()=>validate({...r,temperature:null}));assert.throws(()=>validate({...r,km:-1}));
  assert.throws(()=>validate({...r,answers:{...r.answers,freios:'Problema'}}));
  assert.throws(()=>validate({...r,answers:{...r.answers,freios:undefined}}));
  const mobi=validate({...r,vehicle:4,temperature:null});assert.equal(mobi.temperature,null);assert.equal(mobi.answers.frio,undefined);
});
function memoryStorage(){const rows=new Map();return {all:async()=>structuredClone([...rows.values()]),put:async row=>rows.set(row.id,structuredClone(row))};}
test('fila sobrevive à recriação, mantém pendência offline e confirma reenvio',async()=>{
  const storage=memoryStorage(),record=fixture();
  let offline=true,calls=0;
  const send=async payload=>{calls++;if(offline)throw new Error('offline');return {id:payload.id,receivedAt:new Date().toISOString()};};
  let queue=create({storage,send});await queue.enqueue(record);await queue.sync();assert.equal((await queue.all())[0].status,'pending');
  queue=create({storage,send});offline=false;
  await Promise.all([queue.sync(),queue.sync()]);assert.equal(calls,2);assert.equal((await queue.all())[0].status,'sent');
  await queue.enqueue(record);await queue.sync();assert.equal(calls,2);assert.equal((await queue.all()).length,1);
});
test('não confirma gravação local falha nem resposta sem recibo válido',async()=>{
  const record=fixture();const failing=create({storage:{all:async()=>[],put:async()=>{throw new Error('quota');}},send:async()=>{throw new Error('Não deveria enviar');}});
  await assert.rejects(failing.enqueue(record),/quota/);
  const storage=memoryStorage(),queue=create({storage,send:async()=>({id:'outro',receivedAt:'hoje'})});
  await queue.enqueue(record);await queue.sync();assert.equal((await queue.all())[0].status,'pending');
});
test('rejeição de validação preserva o registro e não repete automaticamente',async()=>{
  const record=fixture(),storage=memoryStorage();let calls=0;
  const queue=create({storage,send:async()=>{calls++;throw Object.assign(new Error('Dados inválidos'),{permanent:true});}});
  await queue.enqueue(record);await queue.sync();await queue.sync();assert.equal(calls,1);assert.equal((await queue.all())[0].status,'rejected');
});
