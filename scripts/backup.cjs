const fs=require('node:fs');const path=require('node:path');const {DatabaseSync}=require('node:sqlite');
function backup(dataDir,destination){
  const source=path.resolve(dataDir),output=path.resolve(destination);
  if(output===source||output.startsWith(source+path.sep))throw new Error('Use um destino fora da pasta de dados.');
  if(!fs.existsSync(path.join(source,'frota.sqlite')))throw new Error('Banco de dados não encontrado.');
  if(fs.existsSync(output))throw new Error('O destino já existe. Escolha uma pasta nova para este backup.');
  fs.mkdirSync(output,{recursive:true});
  const db=new DatabaseSync(path.join(source,'frota.sqlite'));
  try{db.exec('PRAGMA busy_timeout=10000');db.exec("VACUUM INTO '"+path.join(output,'frota.sqlite').replaceAll("'","''")+"'");}
  finally{db.close();}
  if(fs.existsSync(path.join(source,'admin.json')))fs.copyFileSync(path.join(source,'admin.json'),path.join(output,'admin.json'));
  fs.writeFileSync(path.join(output,'backup.json'),JSON.stringify({createdAt:new Date().toISOString(),contents:['frota.sqlite','admin.json (se configurado)'],photos:'incluídas no SQLite'},null,2));
  return output;
}
if(require.main===module){
  const root=path.resolve(__dirname,'..'),configFile=path.join(root,'runtime.json');
  const cfg=fs.existsSync(configFile)?JSON.parse(fs.readFileSync(configFile,'utf8')):{};
  const dir=process.env.FROTA_DATA_DIR||cfg.dataDir||path.join(root,'data');
  const destination=process.argv[2]||path.join(root,'backups',new Date().toISOString().replaceAll(':','-'));
  try{console.log('Backup concluído: '+backup(dir,destination));}catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={backup};
