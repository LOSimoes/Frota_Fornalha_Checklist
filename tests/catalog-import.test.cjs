const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {openStore}=require('../inspections.cjs');const {restoreCatalog}=require('../scripts/import-catalog.cjs');
test('recupera nomes por ID com backup, preservando senha e interrompendo conflitos',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'fornalha-import-')),dir=path.join(root,'data');fs.mkdirSync(dir);
 const s=openStore(dir);const catalog=s.catalog(true);s.close();fs.writeFileSync(path.join(dir,'admin.json'),'senha-de-teste-preservada');
 t.after(()=>{assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('fornalha-import-'));fs.rmSync(root,{recursive:true,force:true});});
 const input={version:1,vehicles:catalog.vehicles,drivers:catalog.drivers.map(d=>({id:d.id,name:d.name,active:d.active,defaultVehicleId:d.defaultVehicleId}))};input.drivers[0].name='Roberto';input.vehicles[0].name='Master 2603';
 assert.equal(restoreCatalog(dir,input).applied,false);
 let check=openStore(dir);assert.equal(check.catalog().drivers[0].name,'Motorista 01 · exemplo');check.close();
 const result=restoreCatalog(dir,input,{apply:true});assert.ok(fs.existsSync(path.join(result.backup,'frota.sqlite')));
 check=openStore(dir);assert.equal(check.catalog().drivers[0].name,'Roberto');assert.equal(check.catalog().vehicles[0].name,'Master 2603');check.close();
 assert.equal(fs.readFileSync(path.join(dir,'admin.json'),'utf8'),'senha-de-teste-preservada');
 input.drivers[0].name='Outro nome';assert.throws(()=>restoreCatalog(dir,input,{apply:true}),/Conflito/);
 check=openStore(dir);assert.equal(check.catalog().drivers[0].name,'Roberto');check.close();
});
