const {test}=require('node:test');const assert=require('node:assert/strict');
const {entries,kind}=require('../report-types.js');const {render}=require('../vehicle-report-pdf.cjs');const {PDFDocument}=require('../vendor/pdf-lib.cjs');
const record={id:'teste',type:'Saída',vehicleName:'Master',driver:'Motorista',inspectedAt:'2026-10-23T10:00:00Z',km:100,answers:{avarias:'Problema',oleo:'Problema',luzes:'OK'},notes:{avarias:'Porta riscada',oleo:'Óleo baixo'},levels:{avarias:'Leve',oleo:'Atenção'},photos:[],alerts:[]};
test('classificação separa avaria, manutenção e outros sem transformar gravidade em categoria',()=>{
 assert.deepEqual(entries(record).map(e=>e.kind),['damage','maintenance']);
 assert.equal(kind({type:'Ocorrência',category:'Quebra na rua'},'ocorrencia'),'maintenance');
 assert.equal(kind({type:'Ocorrência',category:'Batida ou avaria'},'ocorrencia'),'damage');
 assert.equal(kind({type:'Ocorrência',category:'Outro'},'ocorrencia'),'review');
 assert.equal(entries({...record,answers:{},alerts:[{kind:'Manutenção',item:'Temperatura',note:'-9 °C'}]})[0].kind,'maintenance');
});
test('termo cria três seções paginadas; manutenção sem fotos fica em uma página',async()=>{
 const data={record,items:{avarias:'Carroceria',oleo:'Óleo'}};
 const damage=await PDFDocument.load(await render(data,'damage',()=>null));assert.equal(damage.getPageCount(),3);
 const maintenance=await PDFDocument.load(await render(data,'maintenance',()=>null));assert.equal(maintenance.getPageCount(),1);
 await assert.rejects(render({...data,record:{...record,answers:{luzes:'OK'}}},'maintenance',()=>null),/não contém/);
 await assert.rejects(render({...data,record:{...record,photos:[{id:'missing',item:'oleo'}]}},'maintenance',()=>null),/foto/);
});
