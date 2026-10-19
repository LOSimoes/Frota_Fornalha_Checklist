const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {openStore}=require('../inspections.cjs');const {render}=require('../damage-report.cjs');
const now=Date.parse('2026-10-19T12:00:00Z'),image=fs.readFileSync(path.join(__dirname,'fixtures/photo.jpg')).toString('base64');
function row(){return {version:4,id:crypto.randomUUID(),driverId:1,driver:'Motorista 01 · exemplo',inspector:'Lucas',vehicle:0,vehicleName:'Master',refrigerated:true,type:'Saída',km:100,temperature:-16,inspectedAt:'2026-10-18T10:00:00Z',answers:Object.fromEntries(['pneus','freios','luzes','oleo','motor','avarias','seguranca','frio','painel','cintos'].map(id=>[id,'OK'])),notes:{},levels:{},photos:['frente','traseira','lateral_esquerda','lateral_direita'].map(item=>({id:crypto.randomUUID(),item,data:'data:image/jpeg;base64,'+image}))};}
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fornalha-damage-'));const s=openStore(dir);t.after(()=>{s.close();assert.equal(path.dirname(dir),os.tmpdir());assert.ok(path.basename(dir).startsWith('fornalha-damage-'));fs.rmSync(dir,{recursive:true,force:true});});return s;}
test('fotos gerais são obrigatórias mesmo com lataria OK e reapresentação é idempotente',t=>{
 const s=setup(t),r=row();assert.throws(()=>s.save({...r,photos:[]},now),/fotos gerais/);assert.throws(()=>s.save({...r,photos:r.photos.slice(0,3)},now),/fotos gerais/);s.save(r,now);assert.equal(s.save(r,now).duplicate,true);assert.equal(s.list('2026-10-18').records[0].photos.length,4);
});
test('nova ocorrência exige motorista e relatório compara saída anterior com documentos privados',t=>{
 const s=setup(t),previous=row();s.save(previous,now);
 const r={...row(),type:'Ocorrência',photos:[],inspectedAt:'2026-10-19T10:00:00Z',category:'Batida ou avaria',description:'Risco <script>alert(1)</script>',location:'Fábrica',severity:'Leve'};
 assert.throws(()=>s.save({...r,driverId:null,driver:'Não informado'},now),/Motorista/);
 s.saveCatalog({kind:'driver',id:1,name:r.driver,active:true,cpf:'123.456.789-00',cnh:'01234567890'});
 assert.equal(s.catalog(true).drivers[0].cpf,'12345678900');assert.equal(s.catalog().drivers[0].cpf,undefined);assert.equal(s.catalog().drivers[0].cnh,undefined);
 s.saveCatalog({kind:'driver',id:1,name:r.driver,active:true});assert.equal(s.catalog(true).drivers[0].cnh,'01234567890');
 assert.throws(()=>s.saveCatalog({kind:'driver',id:1,name:r.driver,active:true,cnh:'x'}),/CNH/);
 s.save(r,now);const report=s.damageReport(r.id);assert.equal(report.previous.id,previous.id);const html=render(report,now);assert.match(html,/12345678900/);assert.match(html,/não constitui/);assert.doesNotMatch(html,/<script>alert/);assert.match(html,/&lt;script&gt;/);
});
