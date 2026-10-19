const fs=require('node:fs');
const path=require('node:path');
const {openStore}=require('../inspections.cjs');
const daily=require('../daily-checks.js');
const ROOT=path.resolve(__dirname,'..');
function prepare(catalog,now=Date.now()){
  const day=daily.day(now),weekday=new Date(day+'T12:00:00Z').getUTCDay();
  const due=catalog.vehicles.filter(v=>daily.status(v,day)==='due');
  return {day,weekday:weekday!==0&&weekday!==6,due,subject:`Fornalha: ${due.length} veículo(s) para conferir — ${day}`,textContent:'Bom dia, Lucas!\n\nConfira estes veículos antes de uma nova saída:\n\n'+due.map(v=>`• ${v.name} — última saída: ${daily.day(v.lastDeparture.inspectedAt)}`).join('\n')+'\n\nO sistema não confirma o retorno físico do veículo. Registre a nova vistoria após conferir pessoalmente. As pendências anteriores continuam até uma nova saída.'};
}
async function deliver(plan,config,fetcher=fetch){
  if(!config.enabled||!config.apiKey||!config.sender)throw Error('Envio não ativado. Configure remetente validado e chave Brevo no servidor.');
  const recipients=config.recipients||['lucas@fornalhamineira.com.br'];
  if(!Array.isArray(recipients)||!recipients.length||recipients.some(e=>typeof e!=='string'||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))throw Error('Destinatários inválidos.');
  const response=await fetcher('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':config.apiKey,'Content-Type':'application/json'},body:JSON.stringify({sender:{name:'Fornalha',email:config.sender},to:recipients.map(email=>({email})),subject:plan.subject,textContent:plan.textContent}),signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`Provedor recusou o envio (HTTP ${response.status}). Confira a conta Brevo.`);
  const receipt=await response.json();if(!receipt.messageId)throw Error('Provedor não confirmou o recebimento do e-mail.');
  return receipt.messageId;
}
async function main(){
  const runtime=fs.existsSync(path.join(ROOT,'runtime.json'))?JSON.parse(fs.readFileSync(path.join(ROOT,'runtime.json'),'utf8')):{};
  const dir=path.resolve(process.env.FROTA_DATA_DIR||runtime.dataDir||path.join(ROOT,'data'));
  if(!fs.existsSync(path.join(dir,'frota.sqlite')))throw Error('Banco não encontrado; não será criado um banco vazio.');
  const s=openStore(dir);let plan;try{plan=prepare(s.catalog(true));}finally{s.close();}
  if(!process.argv.includes('--send')){console.log(JSON.stringify(plan,null,2));return;}
  if(!plan.weekday||!plan.due.length){console.log('Sem envio: fim de semana ou nenhuma pendência.');return;}
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
  if(hour<6||hour>=10){console.log('Sem envio: fora do horário da manhã (6h–10h).');return;}
  const stateFile=path.join(dir,'morning-email-state.json'),lock=path.join(dir,'morning-email.lock');
  const fd=fs.openSync(lock,'wx');
  try{
    const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{};
    if(state.day===plan.day){console.log('Lembrete de hoje já aceito pelo provedor.');return;}
    const config=JSON.parse(fs.readFileSync(path.join(ROOT,'email.json'),'utf8'));
    const messageId=await deliver(plan,config);
    fs.writeFileSync(stateFile+'.tmp',JSON.stringify({day:plan.day,messageId}));fs.renameSync(stateFile+'.tmp',stateFile);
    console.log('Lembrete aceito pelo provedor. Confira a entrega na caixa de entrada.');
  }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
if(require.main===module)main().catch(e=>{console.error(e.code==='EEXIST'?'Outro envio está em execução ou há uma trava pendente. Confira antes de tentar novamente.':e.message);process.exitCode=1;});
module.exports={prepare,deliver};
