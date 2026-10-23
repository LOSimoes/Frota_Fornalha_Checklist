const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('abas filtram avarias e manutenção separadamente inclusive ao filtrar situação',()=>{
 const nodes=new Map();const element=()=>({dataset:{},value:'',selectedOptions:[{textContent:'Todas'}],append(){},before(){},addEventListener(){},setAttribute(){}});
 const node=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
 const data={start:'2026-10-01',end:'2026-10-23',vehicleLabel:'Todos',items:{avarias:'Carroceria e portas',oleo:'Nível de óleo'},records:[{id:'1',type:'Saída'},{id:'2',type:'Ocorrência',category:'Outro'}],occurrences:[{id:'1',item:'Carroceria e portas',status:'Aberto'},{id:'1',item:'Nível de óleo',status:'Resolvido'},{id:'2',item:'Outro',status:'Aberto'}]};
 const context={document:{body:{dataset:{}},querySelector:node,querySelectorAll:()=>[],getElementById:node,createElement:element},window:{addEventListener(){}},reportData:data,ReportTypes:require('../report-types.js'),MaintenanceBoard:{render:list=>JSON.stringify(list)},occurrenceControls:()=>'',documentLinks:()=>'',rows:list=>JSON.stringify(list),pretty:v=>v,printButton:element()};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../pages/manager-navigation.js'),'utf8'),context);
 vm.runInContext("managerView('issues')",context);assert.equal(JSON.parse(node('occurrences').innerHTML).length,2);assert.ok(!node('occurrences').innerHTML.includes('óleo'));
 vm.runInContext("managerView('maintenance');issueSelect.value='';filterManagerIssues()",context);assert.equal(JSON.parse(node('occurrences').innerHTML).length,1);assert.ok(node('occurrences').innerHTML.includes('óleo'));
 vm.runInContext("issueSelect.value='pending';filterManagerIssues()",context);assert.equal(node('occurrences').innerHTML,'[]');
});
