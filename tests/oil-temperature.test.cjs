const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {validate}=require('../inspections.cjs');
const base=()=>({version:5,id:crypto.randomUUID(),driver:'Teste',driverId:1,inspector:'Lucas',vehicle:0,type:'Saída',km:100,temperature:null,oilLevel:'No nível',inspectedAt:'2026-10-19T12:00:00Z',answers:Object.fromEntries(['pneus','freios','luzes','oleo','motor','avarias','seguranca','frio','painel','cintos'].map(id=>[id,'OK'])),notes:{},levels:{}});
test('temperatura ausente não vira zero nem alerta; medição informada mantém limite',()=>{
 const r=base();assert.equal(validate(r).temperature,null);assert.equal(validate(r).alerts.length,0);
 assert.equal(validate({...r,temperature:0}).alerts[0].item,'Temperatura');
 assert.equal(validate({...r,temperature:-14}).alerts.length,0);
 assert.throws(()=>validate({...r,temperature:''}),/Temperatura/);
 assert.throws(()=>validate({...r,version:4}),/Temperatura/);
});
test('metade e baixo exigem problema com relato e preservam nível no relatório',()=>{
 for(const oilLevel of ['Metade','Baixo']){
  const r=base();r.oilLevel=oilLevel;assert.throws(()=>validate(r),/óleo/);
  r.answers.oleo='Problema';assert.throws(()=>validate(r),/Descreva/);
  r.notes.oleo='Conferir antes da saída';r.levels.oleo='Atenção';
  const result=validate(r);assert.equal(result.oilLevel,oilLevel);assert.match(result.alerts[0].note,new RegExp(oilLevel));
 }
 const r=base();r.oilLevel='Não verifiquei';r.answers.oleo='Não verifiquei';assert.equal(validate(r).alerts[0].kind,'Não verificado');
});
