const {test}=require('node:test');const assert=require('node:assert/strict');const {groups,render}=require('../maintenance-board.js');
test('manutenção agrupa repetição sem misturar veículos ou situações e prioriza crítico pendente',()=>{
 const row=(vehicle,status,kind='Atenção')=>({vehicle,vehicleName:'Carro '+vehicle,item:'Óleo',status,kind,inspectedAt:'2026-10-23T10:00:00Z',note:'<script>alert(1)</script>'});
 const list=[row(0,'Aberto'),row(0,'Aberto'),row(0,'Resolvido','Crítico'),row(1,'Aberto','Crítico')];
 const result=groups(list);assert.equal(result[0].id,1);assert.equal(result[1].critical,false);assert.equal(result[1].items.length,2);assert.equal(result[1].items[0].records.length,2);
 const html=render(list,list,'pending',()=>'',()=>'');assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('2 relatos'));assert.ok(!html.includes('<details open'));assert.ok(html.includes('data-maintenance-orders="0"'));
});
