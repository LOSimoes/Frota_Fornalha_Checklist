const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');

function app(){
  const nodes={};
  const context=vm.createContext({document:{getElementById(id){return nodes[id]??={classList:{toggle(){}},showModal(){this.open=true;}}}},window:{scrollTo(){}}});
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
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
  a.input('Seu nome','Motorista 03 · exemplo');
  a.input('Veículo','2');
  a.input('Vistoria','Retorno');
  a.input('Quilometragem atual','35000');
  a.run('next()');
  assert.match(a.nodes.app.innerHTML,/<h2>Pneus e freios<\/h2>/);
  a.run('step--;render()');
  assert.match(a.nodes.app.innerHTML,/<option selected>Motorista 03 · exemplo<\/option>/);
  assert.match(a.nodes.app.innerHTML,/<option selected>Retorno<\/option>/);
  assert.match(a.nodes.app.innerHTML,/value="35000"/);
});

test('mensagens distintas para nome ausente, km ausente e km inválido',()=>{
  const a=app();a.run('next()');
  assert.equal(a.nodes.message.textContent,'Selecione seu nome na lista.');
  a.input('Seu nome','Motorista 01 · exemplo');a.run('next()');
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
  const a=app();a.input('Seu nome','Motorista 01 · exemplo');a.input('Quilometragem atual','35000');a.run('next()');
  for(const ids of [['pneus','freios'],['luzes','oleo','motor'],['avarias','seguranca']]){
    for(const id of ids)a.run(`answers['${id}']='OK'`);
    a.run('next()');
  }
  assert.match(a.nodes.app.innerHTML,/<h2>Refrigeração<\/h2>/);
  a.run("answers.frio='OK'");
  for(const [t,warn] of [[-18,false],[-16,false],[-14,true],[-12,true],[-10,true],[-9,false]]){
    a.input('Temperatura indicada (°C)',String(t));
    assert.equal(a.nodes.tempNotice.innerHTML.includes('avaliar manutenção'),warn);
  }
  a.input('Temperatura indicada (°C)','-12');a.run('next()');
  assert.match(a.nodes.app.innerHTML,/Confira antes de concluir/);
  assert.match(a.nodes.app.innerHTML,/-12 °C/);
  a.run('next()');assert.equal(a.nodes.modal.open,true);
});

test('Mobi chega à revisão sem exigir refrigeração',()=>{
  const a=app();a.input('Seu nome','Vendedor 01 · exemplo');a.input('Veículo','4');a.input('Quilometragem atual','150');a.run('next()');
  for(const ids of [['pneus','freios'],['luzes','oleo','motor'],['avarias','seguranca']]){
    for(const id of ids)a.run(`answers['${id}']='OK'`);
    a.run('next()');
  }
  assert.match(a.nodes.app.innerHTML,/Confira antes de concluir/);
  assert.doesNotMatch(a.nodes.app.innerHTML,/Temperatura:/);
});
