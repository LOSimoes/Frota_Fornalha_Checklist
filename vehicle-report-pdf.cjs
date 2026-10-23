const fs=require('node:fs');
const path=require('node:path');
const {PDFDocument,StandardFonts,rgb}=require('./vendor/pdf-lib.cjs');
const {entries}=require('./report-types.js');
const date=v=>new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
async function render(data,type,getPhoto,now=Date.now()){
 if(!['damage','maintenance'].includes(type))throw new Error('Tipo de relatório inválido.');
 const {record:r,driver,previous,items}=data;
 const selected=entries(r,items).filter(e=>e.kind===type);
 if(!selected.length)throw Object.assign(new Error('Este registro não contém itens para este tipo de documento.'),{status:400});
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const logo=await pdf.embedPng(fs.readFileSync(path.join(__dirname,'assets/logo.png')));
 const title=type==='damage'?'Termo de ciência de avaria':'Relatório de manutenção';
 pdf.setTitle(title+' | '+r.vehicleName);pdf.setAuthor('Fornalha Mineira');
 let page,y,section;
 const red=rgb(.51,.067,.055),gray=rgb(.3,.3,.3);
 const clean=v=>[...String(v??'')].map(c=>{try{font.encodeText(c);return c;}catch{return '?';}}).join('');
 function newPage(label){
  section=label;page=pdf.addPage([595.28,841.89]);
  const scale=Math.min(100/logo.width,55/logo.height);page.drawImage(logo,{x:42,y:770,width:logo.width*scale,height:logo.height*scale});
  page.drawText('FORNALHA MINEIRA',{x:165,y:801,font:bold,size:12,color:red});
  page.drawText(title,{x:165,y:781,font:bold,size:16,color:red});
  page.drawLine({start:{x:42,y:757},end:{x:553,y:757},thickness:1,color:red});y=734;
  text(label,true,13);y-=8;
 }
 function text(value,strong=false,size=10){
  const f=strong?bold:font;let line='';
  function flush(){if(y<55)newPage(section+' — continuação');page.drawText(line,{x:42,y,font:f,size,color:gray});y-=size+5;line='';}
  for(const word of clean(value).split(/\s+/)){
   if(line&&f.widthOfTextAtSize(line+' '+word,size)>510)flush();
   for(const c of (line?' ':'')+word){if(f.widthOfTextAtSize(line+c,size)>510)flush();line+=c;}
  }flush();
 }
 function identity(){text(r.vehicleName,true,12);text(`Registro: ${date(r.inspectedAt)} | Quilometragem: ${r.km??'Não informada'}`);text(`Motorista: ${r.driver} | Conferência: ${r.inspector||'Não informada'}`);text(`Protocolo: ${r.id}`,false,8);if(r.cancelled)text('REGISTRO CANCELADO — consulta histórica',true);y-=10;}
 function reports(){for(const e of selected){text(`${e.label} | ${e.severity}`,true);text(e.note||'Sem relato adicional.');y-=6;}}
 async function photos(list,label,source){
  if(type==='maintenance'&&y>330&&list.length<=2){y-=14;text(label,true,12);}else newPage(label);text(`Veículo: ${source?.vehicleName||r.vehicleName}`,true);if(source){text(`Registro: ${date(source.inspectedAt)} | ${source.id}`,false,8);text(`Motorista: ${source.driver||'Não informado'}`,false,9);}
  if(type==='damage'&&source===r){text('Relato do ocorrido',true);reports();}
  if(!list.length){text('Nenhuma foto disponível neste registro.');return;}
  let top=y;
  for(let i=0;i<list.length;i++){
   if(i%4===0){if(i||y<(list.length<=2?280:430)){newPage(label+' — continuação');}top=y;}
   const p=list[i],raw=getPhoto(p.id)?.data;
   if(!raw)throw new Error('Não foi possível carregar uma foto. Emissão interrompida.');
   const image=await pdf.embedJpg(raw),row=Math.floor((i%4)/2),col=i%2;
   const cellHeight=Math.min(280,(top-65)/(list.length<=2?1:2)),scale=Math.min(244/image.width,(cellHeight-85)/image.height);
   const x=42+col*266,baseline=top-row*cellHeight;
   page.drawText(clean(`${i+1}. ${items[p.item]||p.item}`),{x,y:baseline,font:bold,size:8,color:gray});
   if(p.caption){const caption=clean(p.caption);const lines=caption.match(/.{1,44}(?:\s|$)|.{1,44}/g)||[];lines.forEach((line,j)=>page.drawText(line.trim(),{x,y:baseline-13-j*10,font,size:8,color:gray}));}
   page.drawImage(image,{x:x+(244-image.width*scale)/2,y:baseline-65-image.height*scale,width:image.width*scale,height:image.height*scale});
   y=top-(row+1)*cellHeight;
  }
 }
 newPage(type==='damage'?'1. Identificação e ciência':'Solicitação de avaliação / peças e serviços');identity();reports();
 if(type==='damage'){
  text(`CPF: ${driver?.cpf||'Não preenchido'} | CNH: ${driver?.cnh||'Não preenchida'}`);
  text(`Dados cadastrais atuais consultados em ${date(now)}.`,false,8);
  if(r.location)text('Local informado: '+r.location);
  y-=10;text('Ciência e manifestação do motorista',true,12);
  text('Declaro que tomei ciência das situações e imagens descritas neste documento e que colaborarei com a apuração dos fatos. A assinatura registra ciência; não constitui, por si só, reconhecimento de culpa, obrigação de ressarcimento ou autorização de desconto.');
  text('Manifestação do motorista / divergências:',true);
  for(let i=0;i<3;i++)text('________________________________________________________________________________');
  y-=12;text('Local e data: ______________________________________________________________');y-=18;
  text('Assinatura do motorista: __________________________________________________');y-=20;text('Responsável pela conferência: _____________________________________________');
  const keys=new Set(selected.map(e=>e.key));
  const current=(r.photos||[]).filter(p=>keys.has(p.item)||['frente','traseira','lateral_esquerda','lateral_direita'].includes(p.item));
  await photos(current,'2. Fotos e relato da avaria',r);
  await photos((previous?.photos||[]).filter(p=>['frente','traseira','lateral_esquerda','lateral_direita','avarias'].includes(p.item)),'3. Fotos anteriores do veículo',previous);
  if(!previous)text('Nenhuma saída anterior encontrada para este veículo.');
  text('Comparação visual: as fotos isoladamente não determinam quando ocorreu o dano ou quem o causou.',false,9);
 }else{
  y-=12;text('Peças / serviços a avaliar',true,12);
  for(const [key,label] of [['parts','Peças / serviços solicitados'],['budget','Orçamento informado'],['actions','Providências']])if(r.maintenance?.[key]){text(label,true);text(r.maintenance[key]);}
  text('Preencher após avaliação técnica. O relato da vistoria não define sozinho a peça a substituir.');
  for(let i=0;i<3;i++)text('________________________________________________________________________________');
  text('Solicitado por: _______________________ Data: _______________________');
  text('Aprovação: __________________________ Orçamento: __________________');
  const keys=new Set(selected.map(e=>e.key));const pictures=(r.photos||[]).filter(p=>keys.has(p.item));
  if(pictures.length)await photos(pictures,'Fotos dos itens de manutenção',r);
 }
 pdf.getPages().forEach((p,i)=>{p.drawLine({start:{x:42,y:39},end:{x:553,y:39},thickness:.5,color:gray});p.drawText(`${title} | ${i+1} / ${pdf.getPageCount()}`,{x:42,y:25,font,size:8,color:gray});});
 return Buffer.from(await pdf.save());
}
module.exports={render};
