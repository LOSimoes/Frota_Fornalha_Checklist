const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('água e fluido hidráulico mantêm nível e abrem campos de problema',()=>{
 const a=app();a.run("step=5;render();selectFluid('agua','Metade');selectFluid('hidraulico','Baixo')");
 assert.equal(a.run('answers.agua'),'Problema');assert.equal(a.run('answers.hidraulico'),'Problema');
 assert.equal(a.run('inspectionState.waterLevel'),'Metade');assert.equal(a.run('inspectionState.hydraulicLevel'),'Baixo');
 assert.match(a.nodes.app.innerHTML,/Nível de fluido hidráulico/);assert.match(a.nodes.app.innerHTML,/O que você encontrou/);
 a.run("selectFluid('agua','No nível')");assert.equal(a.run('answers.agua'),'OK');assert.equal(a.run('answers.hidraulico'),'Problema');
});

test('óleo selecionado abre problema e temperatura vazia permite revisão',()=>{
 const a=app();a.run("step=5;render();selectOil('Metade')");
 assert.equal(a.run('answers.oleo'),'Problema');assert.match(a.nodes.app.innerHTML,/O que você encontrou/);
 a.run("selectOil('Baixo')");assert.equal(a.run('inspectionState.oilLevel'),'Baixo');
 a.run("selectOil('No nível')");assert.equal(a.run('answers.oleo'),'OK');
 a.run("selectOil('Não verifiquei')");assert.equal(a.run('answers.oleo'),'Não verifiquei');
 a.run("step=6;inspectionState.temp='';answers.frio='OK';render();next()");
 assert.equal(a.run('step'),7);assert.match(a.nodes.app.innerHTML,/Não informada/);assert.doesNotMatch(a.nodes.app.innerHTML,/0 °C/);
});

function app(){
  const nodes={};
  const context=vm.createContext({document:{getElementById(id){return nodes[id]??={classList:{toggle(){}},showModal(){this.open=true;}}}},window:{scrollTo(){}},completeInspection(){nodes.completed=true;}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../mileage.js'),'utf8'),context);
  context.FornalhaMileage=context.window.FornalhaMileage;
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../daily-checks.js'),'utf8'),context);
  context.FornalhaDaily=context.window.FornalhaDaily;
  context.inspectionPhotos=['frente','traseira','lateral_esquerda','lateral_direita'].map(item=>({item}));
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../trip-rules.js'),'utf8'),context);
  context.FornalhaTrips=context.window.FornalhaTrips;
  const run=code=>vm.runInContext(code,context);
  // Inline browser handlers resolve element properties before outer variables.
  // Inputs/selects expose `form` (null outside a form), which caused the regression.
  function input(label,value){
    const markup=nodes.app.innerHTML;
    const start=markup.indexOf('>'+label+'<');
    assert.notEqual(start,-1,`Missing label: ${label}`);
    const fragment=markup.slice(start,markup.indexOf('</label>',start));
    const handler=fragment.match(/(?:onchange|oninput)="([^"]+)"/)[1];
    context.element={value,form:null};
    run(`(function(){with(this){${handler}}}).call(element)`);
  }
  return {run,input,nodes};
}

test('identificação da captura: eventos dos campos permitem avançar e voltar sem perder dados',()=>{
  const a=app();
  a.input('Motorista','Motorista 03 · exemplo');
  a.input('Veículo','2');
  a.input('Quilometragem atual','35000');
  a.run('next()');
  assert.match(a.nodes.app.innerHTML,/<h2>Carroceria<\/h2>/);
  a.run('step--;render()');
  assert.match(a.nodes.app.innerHTML,/<option selected>Motorista 03 · exemplo<\/option>/);
  assert.equal(a.run('inspectionState.type'),'Saída');
  assert.match(a.nodes.app.innerHTML,/value="35000"/);
});

test('mensagens distintas para nome ausente, km ausente e km inválido',()=>{
  const a=app();a.run('next()');
  assert.equal(a.nodes.message.textContent,'Selecione o motorista na lista.');
  a.input('Motorista','Motorista 01 · exemplo');a.run('next()');
  assert.equal(a.nodes.message.textContent,'Informe a quilometragem atual.');
  for(const value of ['-1','1.5','abc']){
    a.input('Quilometragem atual',value);a.run('next()');
    assert.match(a.nodes.message.textContent,/quilômetros inteiros/);
    assert.equal(a.run('step'),0);
  }
  a.input('Quilometragem atual','0');a.run('next()');
  assert.equal(a.run('step'),1);
});

test('fluxo completo da van, temperatura via evento e limites do aviso',()=>{
  const a=app();a.input('Motorista','Motorista 01 · exemplo');a.input('Quilometragem atual','35000');a.run('next()');
  a.run("inspectionState.oilLevel='No nível';inspectionState.waterLevel='No nível';inspectionState.hydraulicLevel='No nível'");
  for(const ids of [['avarias'],['luzes'],['pneus','freios'],['seguranca','painel','cintos'],['motor','oleo','agua','hidraulico']]){
    for(const id of ids)a.run(`answers['${id}']='OK'`);
    a.run('next()');
  }
  assert.match(a.nodes.app.innerHTML,/<h2>Refrigeração<\/h2>/);
  a.run("answers.frio='OK'");
  for(const [t,warn] of [[-18,false],[-16,false],[-14,false],[-13.1,false],[-13,true],[-12,true],[-10,true],[-9,true],[-5,true],[0,true],[5,true],['',false],[' ',false],['abc',false]]){
    a.input('Temperatura indicada (°C) — opcional',String(t));
    assert.equal(a.nodes.tempNotice.innerHTML.includes('avaliar manutenção'),warn);
  }
  a.input('Temperatura indicada (°C) — opcional','-12');a.run('next()');
  assert.match(a.nodes.app.innerHTML,/Confira antes de concluir/);
  assert.match(a.nodes.app.innerHTML,/-12 °C/);
  a.run('next()');assert.equal(a.nodes.completed,true);
});

test('Mobi chega à revisão sem exigir refrigeração',()=>{
  const a=app();a.input('Motorista','Vendedor 01 · exemplo');a.input('Veículo','4');a.input('Quilometragem atual','150');a.run('next()');
  a.run("inspectionState.oilLevel='No nível';inspectionState.waterLevel='No nível';inspectionState.hydraulicLevel='No nível'");
  for(const ids of [['avarias'],['luzes'],['pneus','freios'],['seguranca','painel','cintos'],['motor','oleo','agua','hidraulico']]){
    for(const id of ids)a.run(`answers['${id}']='OK'`);
    a.run('next()');
  }
  assert.match(a.nodes.app.innerHTML,/Confira antes de concluir/);
  assert.doesNotMatch(a.nodes.app.innerHTML,/Temperatura:/);
});

test('sugere carro habitual e permite trocar sem alterar o motorista',()=>{
 const a=app();a.run('drivers[0].suggestedVehicleId=2');a.input('Motorista','Motorista 01 · exemplo');assert.equal(a.run('inspectionState.vehicle'),2);
 a.input('Veículo','4');assert.equal(a.run('inspectionState.vehicle'),4);assert.equal(a.run('inspectionState.name'),'Motorista 01 · exemplo');assert.equal(a.run('refrigerated()'),false);
});

test('pendência antiga não bloqueia nova saída nem troca automática para retorno',()=>{
 const a=app();a.run("tripControl=true;drivers[0].trip={pending:{id:'saida',vehicle:2,vehicleName:'Master longa 1801'}}");
 a.input('Motorista','Motorista 01 · exemplo');assert.equal(a.run('inspectionState.type'),'Saída');
 a.input('Veículo','1');a.input('Quilometragem atual','100');a.run('next()');assert.equal(a.run('step'),1);
});

test('saída sugere último retorno por veículo e não sobrescreve correção manual em atualização',()=>{
 const a=app();a.run("fleet[0].lastReturn={id:'r1',km:150,inspectedAt:'2026-10-08T18:00:00Z'};fleet[1].lastReturn={id:'r2',km:300,inspectedAt:'2026-10-08T18:00:00Z'}");
 a.input('Motorista','Motorista 01 · exemplo');assert.equal(a.run('inspectionState.km'),'150');
 a.input('Quilometragem atual','170');a.run("fleet[0].lastReturn.km=160;suggestMileage();render()");assert.equal(a.run('inspectionState.km'),'170');
 assert.match(a.nodes.app.innerHTML,/Diferença desde a última leitura/);
 a.input('Veículo','1');assert.equal(a.run('inspectionState.km'),'300');
 a.input('Veículo','4');assert.equal(a.run('inspectionState.km'),'');
});

test('quilometragem zero é sugerida e valor menor continua editável',()=>{
 const a=app();a.run("fleet[0].lastReading={km:0,inspectedAt:'2026-10-08T18:00:00Z'}");a.input('Motorista','Motorista 01 · exemplo');assert.equal(a.run('inspectionState.km'),'0');
 a.run("fleet[0].lastReading.km=100");a.input('Quilometragem atual','90');assert.match(a.nodes.mileageHint.innerHTML,/abaixo da referência/);a.run('next()');assert.equal(a.run('step'),1);
});
