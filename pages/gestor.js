const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vehicleFilter=document.getElementById('vehicleFilter');
const start=document.getElementById('start'),end=document.getElementById('end'),printButton=document.getElementById('print');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const pretty=date=>date.split('-').reverse().join('/');
const time=value=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
let requestNumber=0;
function rows(data){return data.length?'<div class="table-wrap"><table><thead><tr><th>Data / vistoria</th><th>Veículo / motorista</th><th>Item</th><th>Classificação</th><th>Relato</th></tr></thead><tbody>'+data.map(o=>`<tr><td>${time(o.inspectedAt)}<br>${esc(o.type)}</td><td>${esc(o.vehicleName)}<br>${esc(o.driver)}</td><td>${esc(o.item)}</td><td>${esc(o.kind)}</td><td>${esc(o.note)}</td></tr>`).join('')+'</tbody></table></div>':'<p>Nenhum registro nesta categoria no período.</p>';}
async function refresh(){
 const current=++requestNumber;printButton.disabled=true;document.getElementById('report').hidden=true;document.getElementById('message').textContent='';
 if(!start.value||!end.value||start.value>end.value){document.getElementById('message').textContent='Informe as datas inicial e final em ordem.';return;}
 const from=start.value,to=end.value;
 try{const response=await fetch('/api/inspections?start='+from+'&end='+to+(vehicleFilter.value!==''?'&vehicle='+encodeURIComponent(vehicleFilter.value):''));if(current!==requestNumber)return;if(response.status===401){location.replace('/acesso');return;}const data=await response.json();if(!response.ok)throw new Error(data.message);if(current!==requestNumber)return;
 document.getElementById('periodTitle').textContent=`Relatório de ${pretty(data.start)} a ${pretty(data.end)} · ${data.vehicleLabel}`;
 document.getElementById('count').textContent=`Período inclusivo · ${data.total} vistorias · ${data.exits} saídas · ${data.returns} retornos · Gerado em ${time(new Date())}`;
 document.getElementById('total').textContent=data.total;document.getElementById('defects').textContent=data.defects;document.getElementById('temperature').textContent=data.maintenanceAlerts;
 const max=Math.max(1,...data.frequency.map(g=>g.count));
 document.getElementById('chart').innerHTML=data.frequency.length?data.frequency.map(g=>`<div class="chart-row"><strong>${esc(g.item)}</strong><div class="bar-track" aria-hidden="true"><span style="width:${g.count/max*100}%"></span></div><span>${g.count} relatos · <strong>${g.days} dias</strong> · ${g.vehicles} veículos</span><small>Datas: ${g.dates.map(pretty).join(', ')}</small></div>`).join(''):'<p>Sem defeitos ou alertas de manutenção no período.</p>';
 document.getElementById('occurrences').innerHTML=rows(data.occurrences);document.getElementById('unverified').innerHTML=rows(data.unverified);
 document.getElementById('records').innerHTML=data.records.length?data.records.map(r=>`<details class="record"><summary><strong>${esc(r.vehicleName)}</strong><span>${time(r.inspectedAt)} · ${esc(r.type)} · ${esc(r.driver)}</span></summary><p>${r.km} km${r.temperature===null?'':' · '+r.temperature+' °C'}</p><div class="photo-grid">${(r.photos||[]).map(p=>`<a href="/api/photos/${encodeURIComponent(p.id)}" target="_blank" rel="noopener"><img loading="lazy" src="/api/photos/${encodeURIComponent(p.id)}" alt="Foto de ${esc(data.items[p.item])}"><span>${esc(data.items[p.item])}</span></a>`).join('')}</div><dl>${Object.entries(r.answers).map(([id,answer])=>`<div><dt>${esc(data.items[id])}</dt><dd>${esc(answer)}</dd></div>`).join('')}</dl><p class="muted">Recebida: ${time(r.receivedAt)} · Protocolo: ${esc(r.id)}</p></details>`).join(''):'<p>Nenhuma vistoria recebida no período.</p>';
 document.getElementById('report').hidden=false;printButton.disabled=false;
 }catch(error){if(current===requestNumber)document.getElementById('message').textContent=error instanceof TypeError?'Não foi possível carregar. Verifique a conexão.':error.message;}
}
function preset(value){const t=today();end.value=t;if(value==='month')start.value=t.slice(0,8)+'01';else if(value==='fortnight'){const d=new Date(t+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-14);start.value=d.toISOString().slice(0,10);}else start.value=t;refresh();}
for(const b of document.querySelectorAll('[data-period]'))b.addEventListener('click',()=>preset(b.dataset.period));
document.getElementById('filters').addEventListener('submit',event=>{event.preventDefault();refresh();});
for(const input of [start,end,vehicleFilter])input.addEventListener('change',()=>{printButton.disabled=true;document.getElementById('report').hidden=true;document.getElementById('message').textContent='Clique em Aplicar período para atualizar o relatório.';requestNumber++;});
printButton.addEventListener('click',()=>window.print());
document.getElementById('logout').addEventListener('click',async()=>{try{if(!(await fetch('/api/logout',{method:'POST'})).ok)throw new Error();location.replace('/acesso');}catch{document.getElementById('message').textContent='Não foi possível sair. Tente novamente.';}});
async function initialize(){try{const response=await fetch('/api/catalog/admin');if(response.status===401){location.replace('/acesso');return;}if(!response.ok)throw new Error();const catalog=await response.json();const selected=vehicleFilter.value;vehicleFilter.innerHTML='<option value="">Todos os veículos</option>'+catalog.vehicles.map(v=>`<option value="${v.id}">${esc(v.name)}${v.active?'':' (inativo)'}</option>`).join('');vehicleFilter.value=selected;}catch{document.getElementById('message').textContent='Não foi possível carregar os veículos. Recarregue para filtrar.';}if(!start.value)preset('month');else refresh();}
window.addEventListener('pageshow',initialize);