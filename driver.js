let outbox, submission, finishing=false;
let checkingStart=false;
let drafts,draftReady=false,draftId=crypto.randomUUID();
try{inspectionState.inspector=localStorage.getItem('fornalha-inspector')||'Lucas';}catch{}
document.querySelectorAll('.main-actions button').forEach((b,i)=>b.classList.toggle('active',i===(isIncident?1:0)));
async function openMode(incident){if(incident===isIncident)return;if(!draftReady||photoBusy||finishing){showModal('Aguarde','Espere o processamento terminar antes de trocar de tela.');return;}if(!submission&&(await saveDraft())===false)return;location.assign(incident?'/?mode=incident':'/');}
document.getElementById('app').inert=true;document.getElementById('footer').inert=true;
const draftStatus=message=>{document.getElementById('draftStatus').textContent=message;};
function saveDraft(){
  if(!draftReady||submission)return;
  try{localStorage.setItem('fornalha-inspector',inspectionState.inspector||'');}catch{}
  draftStatus('Salvando rascunho…');
  return drafts.save({version:2,id:draftId,step,inspectionState,answers,notes,levels,photos:inspectionPhotos,kmEdited,kmAutoKey,fleet,drivers,tripControl}).then(()=>{draftStatus('Rascunho salvo neste aparelho.');return true;}).catch(()=>{draftStatus('Não foi possível salvar o rascunho. Mantenha a página aberta.');return false;});
}
async function discardDraft(){
  if(!draftReady||photoBusy||finishing)return;
  if(!confirm('Descartar a vistoria em preenchimento? Os registros já concluídos serão mantidos.'))return;
  try{await drafts.clear();await newInspection();draftStatus('Rascunho descartado.');}catch{draftStatus('Não foi possível descartar. Tente novamente.');}
}
const renderWithoutDraft=render;
render=function(){renderWithoutDraft();saveDraft();};
document.addEventListener('input',saveDraft);
document.addEventListener('change',saveDraft);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveDraft();});
async function checkTripBeforeStart(){
  if(checkingStart||!draftReady)return;checkingStart=true;
  try{if(inspectionState.name)await refreshTripState(false);if(step===0&&!submission)advanceStep();}
  catch{document.getElementById('message').textContent='Não foi possível conferir a pendência. Tente sincronizar novamente.';}
  finally{checkingStart=false;}
}
async function sendInspection(payload){
  if(!['http:','https:'].includes(location.protocol))throw new Error('Abra pelo servidor para enviar.');
  const response=await fetch('/api/inspections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(90000)});
  const result=await response.json();
  if(!response.ok){const error=new Error(result.message || 'Não foi possível enviar.');error.permanent=[400,409,413,415].includes(response.status);throw error;}
  if(result.id===payload.id&&result.receivedAt&&Object.hasOwn(result,'trip')){
    try{const c=JSON.parse(localStorage.getItem('fornalha-catalog'));const d=c?.drivers.find(d=>d.id===payload.driverId);if(d)d.trip=result.trip;if(c){FornalhaMileage.merge(c.vehicles.find(v=>v.id===payload.vehicle),{...payload,receivedAt:result.receivedAt});FornalhaDaily.merge(c.vehicles.find(v=>v.id===payload.vehicle),{...payload,receivedAt:result.receivedAt});localStorage.setItem('fornalha-catalog',JSON.stringify(c));}}catch{}
  }
  return result;
}
function updateQueue(rows){
  const pending=rows.filter(row=>row.status==='pending').length;
  const rejected=rows.filter(row=>row.status==='rejected').length;
  const status=document.getElementById('queueStatus');
  status.textContent=rejected?`${rejected} registro(s) precisam de revisão. ${pending} aguardando envio.`:pending?`${pending} vistoria(s) salvas no aparelho, aguardando envio.`:'Envios em dia neste aparelho.';
  if(submission){const row=rows.find(row=>row.id===submission.id);if(row)showReceipt(row);}
}
function showReceipt(row){
  const messages={sent:['Vistoria recebida','O servidor confirmou o recebimento. O registro já pode ser consultado pelo gestor.'],pending:['Salva neste aparelho','Aguardando envio. Abra o aplicativo com conexão ou toque em “Tentar enviar”.'],rejected:['Salva, mas não recebida',row.message+' O registro permanece neste aparelho; avise o gestor.']};
  let [title,message]=messages[row.status];if(row.payload.type==='Ocorrência'&&row.status==='sent')title='Ocorrência recebida';
  document.getElementById('app').innerHTML=`<section class="card"><span class="badge">${esc(row.payload.vehicleName||vehicles[row.payload.vehicle])}</span><h1>${title}</h1><p>${esc(message)}</p><p>${esc(row.payload.type)} · ${esc(row.payload.driver)} · ${row.payload.km===null?'Quilometragem não informada':row.payload.km+' km'}</p><p class="muted">Protocolo: ${esc(row.id)}</p></section>`;
  document.getElementById('footer').innerHTML=`<div><button onclick="syncInspections()">Tentar enviar</button><button class="primary" onclick="newInspection()">${isIncident?'Nova ocorrência':'Nova vistoria'}</button></div>`;
}
async function completeInspection(){
  if(finishing)return;finishing=true;
  try{
    if(photoBusy)throw new Error('Aguarde o processamento das fotos antes de concluir.');
    if(!submission&&!isIncident&&['frente','traseira','lateral_esquerda','lateral_direita'].some(item=>!inspectionPhotos.some(p=>p.item===item))){step=1;render();throw new Error('Complete as quatro fotos gerais na carroceria.');}
    if(!submission&&!inspectionState.name){step=0;render();throw new Error('Selecione o motorista.');}
    if(!submission&&!isIncident&&!inspectionState.oilLevel){step=5;render();throw new Error('Selecione o nível de óleo observado.');}
    if(!outbox)throw new Error('Armazenamento indisponível. Não feche esta página; tente novamente.');
    if(!submission){await refreshTripState(false);const issue=tripMessage();if(issue)throw new Error(issue);}
    if(!submission)submission={version:5,id:draftId,inspectedAt:new Date().toISOString(),inspector:inspectionState.inspector,driver:inspectionState.name||(isIncident?'Não informado':''),driverId:inspectionState.driverId||drivers.find(d=>d.name===inspectionState.name)?.id||null,vehicle:Number(inspectionState.vehicle),vehicleName:vehicles[inspectionState.vehicle],refrigerated:refrigerated(),type:isIncident?'Ocorrência':'Saída',km:isIncident&&String(inspectionState.km).trim()===''?null:Number(inspectionState.km),kmNote:inspectionState.kmNote||'',oilLevel:inspectionState.oilLevel,temperature:!isIncident&&refrigerated()&&String(inspectionState.temp).trim()!==''?Number(inspectionState.temp):null,answers:{...answers},notes:{...notes},levels:{...levels},...(isIncident?{category:inspectionState.category,description:inspectionState.description,location:inspectionState.location||'',severity:inspectionState.severity}:{})};
    if(!submission.photos)submission.photos=inspectionPhotos.filter(p=>isIncident||['frente','traseira','lateral_esquerda','lateral_direita'].includes(p.item)||answers[p.item]==='Problema').map(p=>({...p}));
    const row=await outbox.enqueue(submission);await drafts.clear();draftStatus('Vistoria concluída; confira a confirmação de envio.');showReceipt(row);window.scrollTo(0,0);
    await outbox.sync();
  }catch(error){showModal('Não foi possível concluir',error.message);}
  finally{finishing=false;}
}
async function newInspection(){draftId=crypto.randomUUID();submission=null;inspectionPhotos=[];step=0;inspectionState={name:'',inspector:inspectionState.inspector||'Lucas',vehicle:inspectionState.vehicle,type:isIncident?'Ocorrência':'Saída',km:'',kmNote:'',temp:'',category:'Batida ou avaria',description:'',location:'',severity:'Não sei avaliar'};kmEdited=false;kmAutoKey='';answers={};notes={};levels={};await loadCatalog();selectTrip();suggestMileage(true);render();window.scrollTo(0,0);}
async function syncInspections(){if(outbox)try{await outbox.sync();await loadCatalog();}catch{document.getElementById('queueStatus').textContent='Não foi possível acessar os registros locais. Tente novamente.';}}
(async()=>{
  try{
    outbox=FrotaOutbox.create({storage:FrotaOutbox.browserStorage(),send:sendInspection,onChange:updateQueue});
    drafts=FornalhaDrafts.create(FornalhaDrafts.browserStorage(isIncident?'incident':'current'));
    const saved=await drafts.read(),rows=await outbox.all();
    if([1,2].includes(saved?.version)){
      const completed=rows.find(r=>r.id===saved.id);
      if(completed){submission=completed.payload;await drafts.clear();showReceipt(completed);}
      else{draftId=saved.id;step=saved.version===2?saved.step:0;inspectionState={...inspectionState,...saved.inspectionState,type:isIncident?'Ocorrência':'Saída'};answers=saved.answers;notes=saved.notes;levels=saved.levels;inspectionPhotos=saved.photos;kmEdited=true;kmAutoKey=saved.kmAutoKey;fleet=saved.fleet;drivers=saved.drivers;tripControl=false;vehicles=[];fleet.forEach(v=>vehicles[v.id]=v.name);renderWithoutDraft();}
    }
    draftReady=true;document.getElementById('app').inert=false;document.getElementById('footer').inert=false;draftStatus(saved&&!submission?'Rascunho recuperado. Confira os dados antes de continuar.':'Rascunho automático disponível neste aparelho.');
    updateQueue(rows);await syncInspections();
  }catch{outbox=null;draftStatus('Armazenamento indisponível. Reabra o aplicativo em uma aba normal e tente novamente.');document.getElementById('queueStatus').textContent='Armazenamento indisponível neste navegador. O envio não pode ser concluído.';}
})();
window.addEventListener('online',syncInspections);
async function loadCatalog(force=false){
  if(!draftReady)return;
  if(!force&&(step!==0||submission))return;
  let catalog;
  try{const response=await fetch('/api/catalog',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();catalog=await response.json();try{localStorage.setItem('fornalha-catalog',JSON.stringify(catalog));}catch{}}
  catch{try{catalog=JSON.parse(localStorage.getItem('fornalha-catalog'));}catch{}}
  if(!catalog||!Array.isArray(catalog.vehicles)||!Array.isArray(catalog.drivers))return;
  tripControl=false;
  if(outbox){const rows=(await outbox.all()).filter(r=>r.status==='pending').sort((a,b)=>Date.parse(a.payload.inspectedAt)-Date.parse(b.payload.inspectedAt)||(a.sequence||0)-(b.sequence||0));for(const row of rows){const v=catalog.vehicles.find(v=>v.id===row.payload.vehicle);const d=catalog.drivers.find(d=>d.id===row.payload.driverId);if(d?.trip?.lastId===row.id)continue;FornalhaMileage.merge(v,row.payload);FornalhaDaily.merge(v,row.payload);}}
  fleet=catalog.vehicles;drivers=catalog.drivers;vehicles=[];fleet.forEach(v=>vehicles[v.id]=v.name);
  if(step===0&&!fleet.some(v=>v.id===Number(inspectionState.vehicle)))inspectionState.vehicle=fleet[0]?.id??-1;
  const current=drivers.find(d=>d.id===inspectionState.driverId||d.name===inspectionState.name);
  inspectionState.name=current?.name||'';inspectionState.driverId=current?.id;
  if(step===0&&!submission){suggestMileage();render();}
}
async function refreshTripState(autoSelect=true){await loadCatalog(true);if(autoSelect&&step===0&&!submission){selectTrip();suggestMileage();render();}}
loadCatalog();
window.addEventListener('online',()=>loadCatalog());
if('serviceWorker' in navigator&&['http:','https:'].includes(location.protocol))navigator.serviceWorker.register('/sw.js').catch(()=>{document.getElementById('queueStatus').textContent+=' A abertura offline ainda não está disponível.';});
window.addEventListener('pageshow',syncInspections);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncInspections();});
