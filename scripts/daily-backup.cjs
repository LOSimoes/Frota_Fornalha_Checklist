const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {backup}=require('./backup.cjs');
const OWNER='fornalha-daily-backup-v1';
const DAYS=30;
const files=['frota.sqlite','admin.json','backup.json','retention.json'];
function regular(file){return fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink();}
function verify(dir){
  for(const name of ['frota.sqlite','admin.json'])if(!regular(path.join(dir,name)))throw new Error('Backup incompleto: '+name);
  const admin=JSON.parse(fs.readFileSync(path.join(dir,'admin.json'),'utf8'));
  if(admin.version!==1||!/^[a-f0-9]{32}$/.test(admin.salt)||!/^[a-f0-9]{128}$/.test(admin.hash))throw new Error('Arquivo de acesso inválido no backup.');
  const db=new DatabaseSync(path.join(dir,'frota.sqlite'),{readOnly:true});
  try{
    const result=db.prepare('PRAGMA integrity_check').all();
    if(result.length!==1||Object.values(result[0])[0]!=='ok')throw new Error('Falha na integridade do banco copiado.');
    for(const table of ['inspections','photos','vehicles','drivers'])db.prepare(`SELECT COUNT(*) FROM ${table}`).get();
  }finally{db.close();}
}
function dailyBackup(source,destination,{now=Date.now(),makeBackup=backup}={}){
  const src=fs.realpathSync(source),root=path.resolve(destination);
  if(!Number.isFinite(now))throw new Error('Data inválida.');
  fs.mkdirSync(root,{recursive:true});
  if(fs.lstatSync(root).isSymbolicLink()||fs.realpathSync(root).toLowerCase()!==root.toLowerCase())throw new Error('O destino deve ser uma pasta direta, sem links ou junções.');
  const relative=path.relative(src,root);
  if(!relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw new Error('O destino não pode ficar dentro dos dados do aplicativo.');
  const lock=path.join(root,'.fornalha-backup.lock');
  let handle;
  try{handle=fs.openSync(lock,'wx');}catch(e){if(e.code==='EEXIST')throw new Error('Já existe um backup em execução ou uma execução foi interrompida. Confira a tarefa antes de remover o arquivo .fornalha-backup.lock.');throw e;}
  try{
    const createdAt=new Date(now).toISOString();
    const name='FFC-'+createdAt.replaceAll(':','-')+'-'+crypto.randomUUID();
    const current=path.join(root,name);
    makeBackup(src,current);
    verify(current);
    fs.writeFileSync(path.join(current,'retention.json'),JSON.stringify({owner:OWNER,createdAt,directory:name}),{flag:'wx'});
    const removed=[],skipped=[];
    for(const entry of fs.readdirSync(root,{withFileTypes:true})){
      if(!entry.name.startsWith('FFC-')||entry.name===name)continue;
      const candidate=path.resolve(root,entry.name);
      // Only immediate, ordinary directories owned by this routine can be removed.
      if(path.dirname(candidate)!==root||!entry.isDirectory()||entry.isSymbolicLink())continue;
      try{
        if(fs.realpathSync(candidate).toLowerCase()!==candidate.toLowerCase())continue;
        const marker=path.join(candidate,'retention.json');if(!regular(marker))continue;
        const metadata=JSON.parse(fs.readFileSync(marker,'utf8'));
        const date=Date.parse(metadata.createdAt);
        if(metadata.owner!==OWNER||metadata.directory!==entry.name||!Number.isFinite(date)||date>=now-DAYS*86400000)continue;
        if(!entry.name.startsWith('FFC-'+new Date(date).toISOString().replaceAll(':','-')+'-'))continue;
        const names=fs.readdirSync(candidate);
        if(names.some(n=>!files.includes(n)||!regular(path.join(candidate,n)))){skipped.push(entry.name);continue;}
        // The new verified copy is always retained. Never recurse into unknown contents.
        for(const n of names)fs.unlinkSync(path.join(candidate,n));
        fs.rmdirSync(candidate);removed.push(entry.name);
      }catch{skipped.push(entry.name);}
    }
    return {destination:current,retentionDays:DAYS,removed,skipped};
  }finally{fs.closeSync(handle);fs.unlinkSync(lock);}
}
if(require.main===module){
  try{
    if(!process.argv[2])throw new Error('Informe a pasta de destino dos backups.');
    const root=path.resolve(__dirname,'..'),file=path.join(root,'runtime.json');
    const cfg=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
    const result=dailyBackup(process.env.FROTA_DATA_DIR||cfg.dataDir||path.join(root,'data'),process.argv[2]);
    console.log('Backup verificado: '+result.destination);
    console.log('Retenção: 30 dias. Pastas antigas removidas: '+result.removed.length+'. Pastas preservadas para revisão: '+result.skipped.length+'.');
    if(result.skipped.length)console.log('Revisar: '+result.skipped.join(', '));
  }catch(e){console.error('Backup não concluído: '+e.message);process.exitCode=1;}
}
module.exports={dailyBackup,verify};
