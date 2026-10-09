const fs=require('node:fs');const path=require('node:path');const {DatabaseSync}=require('node:sqlite');const {backup}=require('./backup.cjs');
const originalVehicles=['Master curta 01','Master curta 02','Master longa · 2018','Ducato · 2025','Mobi vendedor 01','Mobi vendedor 02'];
const originalDrivers=['Motorista 01 · exemplo','Motorista 02 · exemplo','Motorista 03 · exemplo','Vendedor 01 · exemplo','Vendedor 02 · exemplo'];
function validate(c){
 if(c?.version!==1||!Array.isArray(c.vehicles)||!Array.isArray(c.drivers)||c.vehicles.length>1000||c.drivers.length>1000)throw new Error('Arquivo de cadastros inválido.');
 for(const rows of [c.vehicles,c.drivers]){const ids=new Set(),names=new Set();for(const r of rows){if(!Number.isSafeInteger(r.id)||r.id<0||typeof r.name!=='string'||!r.name.trim()||r.name.length>100||typeof r.active!=='boolean'||ids.has(r.id)||names.has(r.name.trim().toLocaleLowerCase()))throw new Error('Cadastro inválido ou duplicado.');ids.add(r.id);names.add(r.name.trim().toLocaleLowerCase());}}
 for(const v of c.vehicles)if(typeof v.refrigerated!=='boolean')throw new Error('Refrigeração inválida.');
 for(const d of c.drivers)if(d.defaultVehicleId!==null&&(!Number.isInteger(d.defaultVehicleId)||!c.vehicles.some(v=>v.id===d.defaultVehicleId&&v.active)))throw new Error('Vínculo de veículo inválido.');
 return c;
}
function restoreCatalog(dataDir,c,{apply=false,backupRoot=path.join(path.dirname(dataDir),'backups')}={}){
 validate(c);const file=path.join(dataDir,'frota.sqlite');if(!fs.existsSync(file))throw new Error('Banco não encontrado. Confirme a pasta de dados; nenhuma alteração realizada.');
 const db=new DatabaseSync(file,{readOnly:!apply});let destination;
 try{
  const changes=[];
  for(const [table,rows,original] of [['vehicles',c.vehicles,originalVehicles],['drivers',c.drivers,originalDrivers]])for(const r of rows){const current=db.prepare(`SELECT name FROM ${table} WHERE id=?`).get(r.id);const expected=original[table==='drivers'?r.id-1:r.id];if(current&&current.name!==r.name&&current.name!==expected)throw new Error(`Conflito em ${table} #${r.id}: ${current.name}. Preserve este cadastro e revise antes de importar.`);changes.push(`${table} #${r.id}: ${current?.name||'(novo)'} → ${r.name}`);}
  if(!apply)return {changes,applied:false};
  destination=backup(dataDir,path.join(backupRoot,'antes-cadastros-'+new Date().toISOString().replaceAll(':','-')));
  db.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
  try{
   for(const v of c.vehicles)db.prepare('INSERT INTO vehicles(id,name,refrigerated,active) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,refrigerated=excluded.refrigerated,active=excluded.active').run(v.id,v.name.trim(),+v.refrigerated,+v.active);
   for(const d of c.drivers){const alias=db.prepare('SELECT driver_id FROM driver_aliases WHERE lower(name)=lower(?)').get(d.name.trim());if(alias&&alias.driver_id!==d.id)throw new Error('Um nome pertence ao histórico de outro motorista. Importação cancelada.');db.prepare('INSERT INTO drivers(id,name,active,default_vehicle) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,active=excluded.active,default_vehicle=excluded.default_vehicle').run(d.id,d.name.trim(),+d.active,d.defaultVehicleId);db.prepare('INSERT OR IGNORE INTO driver_aliases(name,driver_id) VALUES(?,?)').run(d.name.trim(),d.id);}
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return {changes,applied:true,backup:destination};
 }finally{db.close();}
}
if(require.main===module){try{const root=path.resolve(__dirname,'..'),cfgFile=path.join(root,'runtime.json'),cfg=fs.existsSync(cfgFile)?JSON.parse(fs.readFileSync(cfgFile,'utf8')):{};const file=process.argv[2];if(!file)throw new Error('Uso: node scripts/import-catalog.cjs cadastros-recuperados.json [--apply]');const result=restoreCatalog(process.env.FROTA_DATA_DIR||cfg.dataDir||path.join(root,'data'),JSON.parse(fs.readFileSync(file,'utf8')),{apply:process.argv.includes('--apply')});console.log(result.changes.join('\n'));console.log(result.applied?'Cadastros recuperados. Backup: '+result.backup:'Prévia apenas. Pare o aplicativo e repita com --apply para importar.');}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={restoreCatalog};
