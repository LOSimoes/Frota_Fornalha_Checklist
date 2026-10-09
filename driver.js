let outbox, submission, finishing=false;
async function sendInspection(payload){
  if(!['http:','https:'].includes(location.protocol))throw new Error('Abra pelo servidor para enviar.');
  const response=await fetch('/api/inspections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(90000)});
  const result=await response.json();
  if(!response.ok){const error=new Error(result.message || 'Não foi possível enviar.');error.permanent=[400,409,413,415].includes(response.status);throw error;}
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
  const [title,message]=messages[row.status];
  document.getElementById('app').innerHTML=`<section class="card"><span class="badge">${esc(row.payload.vehicleName||vehicles[row.payload.vehicle])}</span><h1>${title}</h1><p>${esc(message)}</p><p>${esc(row.payload.type)} · ${esc(row.payload.driver)} · ${row.payload.km} km</p><p class="muted">Protocolo: ${esc(row.id)}</p></section>`;
  document.getElementById('footer').innerHTML='<div><button onclick="syncInspections()">Tentar enviar</button><button class="primary" onclick="newInspection()">Nova vistoria</button></div>';
}
async function completeInspection(){
  if(finishing)return;finishing=true;
  try{
    if(photoBusy)throw new Error('Aguarde o processamento das fotos antes de concluir.');
    if(!outbox)throw new Error('Armazenamento indisponível. Não feche esta página; tente novamente.');
    if(!submission)submission={version:2,id:crypto.randomUUID(),inspectedAt:new Date().toISOString(),driver:inspectionState.name,driverId:inspectionState.driverId||drivers.find(d=>d.name===inspectionState.name)?.id,vehicle:Number(inspectionState.vehicle),vehicleName:vehicles[inspectionState.vehicle],refrigerated:refrigerated(),type:inspectionState.type,km:Number(inspectionState.km),temperature:refrigerated()?Number(inspectionState.temp):null,answers:{...answers},notes:{...notes},levels:{...levels}};
    if(!submission.photos)submission.photos=inspectionPhotos.filter(p=>answers[p.item]==='Problema').map(p=>({...p}));
    const row=await outbox.enqueue(submission);showReceipt(row);window.scrollTo(0,0);
    await outbox.sync();
  }catch(error){showModal('Não foi possível concluir',error.message);}
  finally{finishing=false;}
}
function newInspection(){submission=null;inspectionPhotos=[];step=0;inspectionState={...inspectionState,km:'',temp:''};answers={};notes={};levels={};render();window.scrollTo(0,0);}
async function syncInspections(){if(outbox)try{await outbox.sync();}catch{document.getElementById('queueStatus').textContent='Não foi possível acessar os registros locais. Tente novamente.';}}
(async()=>{
  try{
    outbox=FrotaOutbox.create({storage:FrotaOutbox.browserStorage(),send:sendInspection,onChange:updateQueue});
    updateQueue(await outbox.all());await syncInspections();
  }catch{outbox=null;document.getElementById('queueStatus').textContent='Armazenamento indisponível neste navegador. O envio não pode ser concluído.';}
})();
window.addEventListener('online',syncInspections);
async function loadCatalog(){
  if(step!==0||submission)return;
  let catalog;
  try{const response=await fetch('/api/catalog',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();catalog=await response.json();try{localStorage.setItem('fornalha-catalog',JSON.stringify(catalog));}catch{}}
  catch{try{catalog=JSON.parse(localStorage.getItem('fornalha-catalog'));}catch{}}
  if(!catalog||!Array.isArray(catalog.vehicles)||!Array.isArray(catalog.drivers)||step!==0||submission)return;
  fleet=catalog.vehicles;drivers=catalog.drivers;vehicles=[];fleet.forEach(v=>vehicles[v.id]=v.name);
  if(!fleet.some(v=>v.id===Number(inspectionState.vehicle)))inspectionState.vehicle=fleet[0]?.id??-1;
  const current=drivers.find(d=>d.id===inspectionState.driverId||d.name===inspectionState.name);
  inspectionState.name=current?.name||'';inspectionState.driverId=current?.id;
  render();
}
loadCatalog();
window.addEventListener('online',loadCatalog);
if('serviceWorker' in navigator&&['http:','https:'].includes(location.protocol))navigator.serviceWorker.register('/sw.js').catch(()=>{document.getElementById('queueStatus').textContent+=' A abertura offline ainda não está disponível.';});
window.addEventListener('pageshow',syncInspections);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncInspections();});
