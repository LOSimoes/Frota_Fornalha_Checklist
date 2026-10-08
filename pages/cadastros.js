const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog={drivers:[],vehicles:[]};
function render(){
 const selected=$('defaultVehicle').value;
 $('defaultVehicle').innerHTML='<option value="">Automático pelo histórico</option>'+catalog.vehicles.filter(v=>v.active).map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('');$('defaultVehicle').value=selected;
 for(const kind of ['vehicles','drivers']){
  $(kind).innerHTML=catalog[kind].map(r=>`<div class="record"><strong>${esc(r.name)}</strong><p class="muted">${r.active?'Ativo':'Inativo'}${kind==='vehicles'?(r.refrigerated?' · Refrigerado':' · Sem refrigeração'):r.suggestedVehicleId!==null?' · Sugestão: '+esc(catalog.vehicles.find(v=>v.id===r.suggestedVehicleId)?.name):' · Sem histórico'}</p><button class="secondary" data-kind="${kind}" data-id="${r.id}">Editar</button></div>`).join('');
 }
 for(const button of document.querySelectorAll('[data-kind]'))button.addEventListener('click',()=>edit(button.dataset.kind,Number(button.dataset.id)));
}
function edit(kind,id){const r=catalog[kind].find(r=>r.id===id),prefix=kind==='vehicles'?'vehicle':'driver';$(prefix+'Id').value=r.id;$(prefix+'Name').value=r.name;$(prefix+'Active').checked=r.active;if(prefix==='vehicle')$('refrigerated').checked=r.refrigerated;else $('defaultVehicle').value=r.defaultVehicleId!==null&&catalog.vehicles.some(v=>v.id===r.defaultVehicleId&&v.active)?String(r.defaultVehicleId):'';$(prefix+'Name').focus();$(prefix+'Form').scrollIntoView({behavior:'smooth',block:'center'});}
async function load(){try{const response=await fetch('/api/catalog/admin');if(response.status===401){location.replace('/acesso');return;}if(!response.ok)throw new Error('Não foi possível carregar os cadastros.');catalog=await response.json();render();}catch(error){$('message').textContent=error.message;}}
for(const kind of ['vehicle','driver']){
 $('new'+kind[0].toUpperCase()+kind.slice(1)).addEventListener('click',()=>{$(kind+'Form').reset();$(kind+'Id').value='';$(kind+'Name').focus();});
 $(kind+'Form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;$('message').textContent='';
  const id=$(kind+'Id').value,payload={kind,...(id!==''?{id:Number(id)}:{}),name:$(kind+'Name').value,active:$(kind+'Active').checked};
  if(kind==='vehicle')payload.refrigerated=$('refrigerated').checked;else payload.defaultVehicleId=$('defaultVehicle').value===''?null:Number($('defaultVehicle').value);
  try{const response=await fetch('/api/catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(response.status===401){location.replace('/acesso');return;}const result=await response.json();if(!response.ok)throw new Error(result.message);catalog=result;$(kind+'Form').reset();$(kind+'Id').value='';render();$('message').textContent='Cadastro salvo. O aplicativo do motorista carregará a alteração ao ser reaberto com conexão.';}
  catch(error){$('message').textContent=error instanceof TypeError?'Sem conexão. O cadastro não foi salvo.':error.message;}finally{button.disabled=false;}
 });
}
load();
