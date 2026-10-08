const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateInput=document.getElementById('date');
dateInput.value=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const formatDate=value=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
let requestNumber=0;
async function refresh(){
  const current=++requestNumber;
  document.getElementById('message').textContent='';
  document.getElementById('records').textContent='Carregando vistorias…';
  for(const id of ['alerts','exits','returns'])document.getElementById(id).textContent='—';
  try{
    const response=await fetch('/api/inspections?date='+encodeURIComponent(dateInput.value));
    if(current!==requestNumber)return;
    if(response.status===401){location.replace('/acesso');return;}
    const data=await response.json();if(!response.ok)throw new Error(data.message);
    if(current!==requestNumber)return;
    document.getElementById('alerts').textContent=data.withAlerts;
    document.getElementById('exits').textContent=data.exits+' / 6';
    document.getElementById('returns').textContent=data.returns+' / 6';
    document.getElementById('count').textContent=data.total>100?`Mostrando as 100 últimas de ${data.total} vistorias do dia.`:`${data.total} vistoria(s) recebida(s) para este dia.`;
    document.getElementById('records').innerHTML=data.records.length?data.records.map(r=>`<details class="record"><summary><strong>${escapeHtml(data.vehicles[r.vehicle])}</strong><span>${escapeHtml(r.type)} · ${escapeHtml(r.driver)}</span><span class="pill ${r.alerts.length?'attention':''}">${r.alerts.length?r.alerts.length+' alerta(s)':'Sem apontamentos'}</span></summary><p>${r.km} km${r.temperature===null?'':' · '+r.temperature+' °C'}</p><p class="muted">Vistoria: ${formatDate(r.inspectedAt)}<br>Recebida: ${formatDate(r.receivedAt)}</p>${r.alerts.map(a=>`<div class="notice"><strong>${escapeHtml(a.item)} · ${escapeHtml(a.kind)}</strong><br>${escapeHtml(a.note)}</div>`).join('')}<dl>${Object.entries(r.answers).map(([id,answer])=>`<div><dt>${escapeHtml(data.items[id])}</dt><dd>${escapeHtml(answer)}</dd></div>`).join('')}</dl><p class="muted">Protocolo: ${escapeHtml(r.id)}</p></details>`).join(''):'<div class="empty"><h2>Nenhuma vistoria recebida para este dia</h2><p>Os registros enviados pelos motoristas aparecerão aqui. Uma vistoria pode estar aguardando conexão no aparelho.</p></div>';
  }catch(error){if(current!==requestNumber)return;document.getElementById('records').textContent='Não foi possível carregar os registros.';document.getElementById('message').textContent=error instanceof TypeError?'Verifique a conexão e tente atualizar.':error.message;}
}
document.getElementById('refresh').addEventListener('click',refresh);
dateInput.addEventListener('change',refresh);
document.getElementById('print').addEventListener('click',()=>{document.querySelectorAll('details').forEach(detail=>detail.open=true);window.print();});
document.getElementById('logout').addEventListener('click',async()=>{
  try{if(!(await fetch('/api/logout',{method:'POST'})).ok)throw new Error();location.replace('/acesso');}
  catch{document.getElementById('message').textContent='Não foi possível sair. Verifique a conexão e tente novamente.';}
});
window.addEventListener('pageshow',refresh);
