// Navigation changes presentation only; filters and report data keep their scope.
function managerView(value){
 const allowed=['overview','issues','maintenance','workshop','records','fleet','settings'];
 const view=allowed.includes(value)?value:'overview';
 document.body.dataset.view=view;
 document.querySelectorAll('[data-manager-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.managerView===view)));
 const labels={overview:['Visão geral','Prioridades por veículo, problemas pendentes e acompanhamento do período.'],issues:['Ocorrências','Batidas, avarias e sinistros. Itens classificados como Outro precisam de revisão.'],maintenance:['Manutenção','Defeitos e necessidades de manutenção identificados nas vistorias.'],workshop:['Ordens e pendências','Serviços, relatos vinculados e situação operacional. Todo o histórico, sem filtro de datas.'],records:['Vistorias','Histórico completo, inclusive vistorias sem problemas. Consulte respostas, fotos e documentos.'],fleet:['Minha frota','Últimas leituras e histórico de cada veículo, sem filtro de período.'],settings:['Configurações','Cadastros e situação dos serviços de aviso.']};
 document.querySelector('main>h1').textContent=labels[view][0];
 document.querySelector('main>p').textContent=labels[view][1];
 document.querySelectorAll('[data-view-panel]').forEach(el=>el.hidden=!el.dataset.viewPanel.split(' ').includes(view));
 if(typeof issueSelect!=='undefined')filterManagerIssues();
}
document.querySelectorAll('[data-manager-view]').forEach(b=>b.addEventListener('click',()=>managerView(b.dataset.managerView)));
window.addEventListener('DOMContentLoaded',()=>managerView('overview'));
const issueSelect=document.createElement('select');
issueSelect.id='issueStatus';
for(const [value,label] of [['','Todas as situações'],['pending','Pendentes (exceto resolvidas)'],['Aberto','Aberto'],['Em avaliação','Em avaliação'],['Manutenção agendada','Manutenção agendada'],['Em manutenção','Em manutenção'],['Resolvido','Resolvido']]){
 const option=document.createElement('option');option.value=value;option.textContent=label;issueSelect.append(option);
}
const issueLabel=document.createElement('label');issueLabel.className='no-print';issueLabel.textContent='Situação da ocorrência';issueLabel.append(issueSelect);
document.getElementById('occurrences').before(issueLabel);
const summary=document.createElement('p');summary.id='issueScope';document.getElementById('occurrences').before(summary);
function filterManagerIssues(){
 if(!reportData)return;
 const selected=issueSelect.value;
 const view=document.body.dataset.view;
 const category=o=>{const r=reportData.records.find(r=>r.id===o.id);return r?ReportTypes.kind(r,Object.keys(reportData.items).find(k=>reportData.items[k]===o.item)||o.item):'review';};
 const list=reportData.occurrences.filter(o=>(view==='issues'?category(o)!=='maintenance':view==='maintenance'?category(o)==='maintenance':true)&&(!selected||(selected==='pending'?o.status!=='Resolvido':o.status===selected)));
 document.querySelector('.issues-panel h2').textContent=view==='maintenance'?'Itens para manutenção':view==='issues'?'Avarias e sinistros':'Defeitos e alertas';
 if(view!=='issues'&&view!=='maintenance'){document.getElementById('periodTitle').textContent=`Relatório de ${pretty(reportData.start)} a ${pretty(reportData.end)} · ${reportData.vehicleLabel}`;document.getElementById('count').textContent=`${reportData.total} vistorias · ${reportData.incidentCount} registros avulsos`;}
 printButton.textContent=view==='maintenance'?'Imprimir manutenção':view==='issues'?'Imprimir ocorrências':'Imprimir resumo';
 document.getElementById('occurrences').innerHTML=rows(list);
 if(view==='issues'||view==='maintenance'){document.getElementById('periodTitle').textContent=`${view==='issues'?'Ocorrências':'Manutenção'} · ${pretty(reportData.start)} a ${pretty(reportData.end)} · ${reportData.vehicleLabel}`;document.getElementById('count').textContent=`${list.length} apontamentos nesta aba e situação selecionada`; }
 summary.textContent=`${list.length} relatos exibidos · ${issueSelect.selectedOptions[0].textContent}. Período e veículo conforme o relatório.`;
}
issueSelect.addEventListener('change',filterManagerIssues);
