// Navigation changes presentation only; filters and report data keep their scope.
function managerView(value){
 const allowed=['overview','issues','records','fleet','settings'];
 const view=allowed.includes(value)?value:'overview';
 document.body.dataset.view=view;
 document.querySelectorAll('[data-manager-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.managerView===view)));
 const labels={overview:['Visão geral','Resumo do período e conferências pendentes.'],issues:['Ocorrências e manutenção','Consulte os relatos e acompanhe as providências.'],records:['Vistorias e documentos','Abra um registro para ver fotos, corrigir dados ou emitir o termo.'],fleet:['Minha frota','Últimas leituras e histórico de cada veículo, sem filtro de período.'],settings:['Configurações','Cadastros e situação dos serviços de aviso.']};
 document.querySelector('main>h1').textContent=labels[view][0];
 document.querySelector('main>p').textContent=labels[view][1];
 document.querySelectorAll('[data-view-panel]').forEach(el=>el.hidden=!el.dataset.viewPanel.split(' ').includes(view));
}
document.querySelectorAll('[data-manager-view]').forEach(b=>b.addEventListener('click',()=>managerView(b.dataset.managerView)));
managerView('overview');
const issueSelect=document.createElement('select');
issueSelect.id='issueStatus';
for(const [value,label] of [['','Todas as situações'],['pending','Pendentes (exceto resolvidas)'],['Aberto','Aberto'],['Em avaliação','Em avaliação'],['Manutenção agendada','Manutenção agendada'],['Resolvido','Resolvido']]){
 const option=document.createElement('option');option.value=value;option.textContent=label;issueSelect.append(option);
}
const issueLabel=document.createElement('label');issueLabel.className='no-print';issueLabel.textContent='Situação da ocorrência';issueLabel.append(issueSelect);
document.getElementById('occurrences').before(issueLabel);
const summary=document.createElement('p');summary.id='issueScope';document.getElementById('occurrences').before(summary);
function filterManagerIssues(){
 if(!reportData)return;
 const selected=issueSelect.value;
 const list=reportData.occurrences.filter(o=>!selected||(selected==='pending'?o.status!=='Resolvido':o.status===selected));
 document.getElementById('occurrences').innerHTML=rows(list);
 summary.textContent=`${list.length} relatos exibidos · ${issueSelect.selectedOptions[0].textContent}. Período e veículo conforme o relatório.`;
}
issueSelect.addEventListener('change',filterManagerIssues);
