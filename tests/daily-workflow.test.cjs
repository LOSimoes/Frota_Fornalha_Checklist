const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {openStore}=require('../inspections.cjs');const daily=require('../daily-checks.js');const {prepare,deliver}=require('../scripts/morning-reminder.cjs');
const now=Date.parse('2026-10-19T12:00:00Z');
function row(){return {version:3,id:crypto.randomUUID(),driverId:1,driver:'Roberto',inspector:'Lucas',vehicle:0,vehicleName:'Master',refrigerated:true,type:'Saída',km:100,temperature:-16,inspectedAt:'2026-10-16T10:00:00Z',answers:Object.fromEntries(['pneus','freios','luzes','oleo','motor','avarias','seguranca','frio','painel','cintos'].map(id=>[id,'OK'])),notes:{},levels:{}};}
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fornalha-daily-'));const s=openStore(dir);t.after(()=>{s.close();assert.equal(path.dirname(dir),os.tmpdir());assert.ok(path.basename(dir).startsWith('fornalha-daily-'));fs.rmSync(dir,{recursive:true,force:true});});return s;}
test('sexta permanece pendente segunda, ocorrência não limpa e saída nova limpa',t=>{
 const s=setup(t);s.save(row(),now);assert.equal(s.catalog(true,now).vehicles[0].dailyStatus,'due');
 const incident={...row(),id:crypto.randomUUID(),type:'Ocorrência',driverId:null,driver:'Não informado',km:null,category:'Quebra na rua',description:'Mangueira rompida',location:'Rodovia',severity:'Atenção',inspectedAt:'2026-10-19T09:00:00Z'};
 const image=fs.readFileSync(path.join(__dirname,'fixtures/photo.jpg')).toString('base64');incident.photos=Array.from({length:10},()=>({id:crypto.randomUUID(),item:'ocorrencia',data:'data:image/jpeg;base64,'+image}));
 s.save(incident,now);assert.equal(s.save(incident,now).duplicate,true);assert.equal(s.catalog(true,now).vehicles[0].dailyStatus,'due');
 assert.equal(s.catalog(true,now).vehicles[0].lastReading.km,100);
 const report=s.list('2026-10-19');assert.equal(report.incidentCount,1);assert.equal(report.total,0);assert.equal(report.records[0].photos.length,10);
 assert.throws(()=>s.save({...incident,id:crypto.randomUUID(),photos:[...incident.photos,{...incident.photos[0],id:crypto.randomUUID()}]},now));
 s.save({...row(),id:crypto.randomUUID(),inspectedAt:'2026-10-19T10:00:00Z',km:130},now);assert.equal(s.catalog(true,now).vehicles[0].dailyStatus,'checked');
});
test('dia usa São Paulo e não regride com saída offline antiga',()=>{
 const v={id:0,active:true};daily.merge(v,row());daily.merge(v,{...row(),inspectedAt:'2026-10-15T10:00:00Z'});assert.equal(v.lastDeparture.inspectedAt,row().inspectedAt);
 assert.equal(daily.day('2026-10-20T02:59:00Z'),'2026-10-19');assert.equal(daily.day('2026-10-20T03:00:00Z'),'2026-10-20');
 assert.equal(prepare({vehicles:[v]},now).due.length,1);assert.equal(prepare({vehicles:[v]},Date.parse('2026-10-18T12:00:00Z')).weekday,false);
});
test('e-mail exige configuração e recibo; erro não confirma envio',async()=>{
 const plan=prepare({vehicles:[]},now);await assert.rejects(deliver(plan,{}),/não ativado/);
 const config={enabled:true,apiKey:'teste',sender:'teste@example.com'};
 await assert.rejects(deliver(plan,config,async()=>({ok:false,status:401})),/401/);
 await assert.rejects(deliver(plan,config,async()=>({ok:true,json:async()=>({})})),/não confirmou/);
 let body;assert.equal(await deliver(plan,config,async(url,args)=>{body=JSON.parse(args.body);return {ok:true,json:async()=>({messageId:'teste'})};}),'teste');assert.equal(body.to[0].email,'lucas@fornalhamineira.com.br');
});
