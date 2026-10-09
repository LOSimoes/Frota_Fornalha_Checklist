let inspectionPhotos=[],photoBusy=false,photoItem=null;
function renderPhotos(item){
 const list=inspectionPhotos.filter(p=>p.item===item);
 return `<div class="photo-actions"><button onclick="choosePhoto('${item}',true)">Tirar foto</button><button onclick="choosePhoto('${item}',false)">Escolher foto</button></div><p class="muted">Até 6 fotos por vistoria. Fotos são enviadas ao concluir.</p><div class="photo-grid">${list.map(p=>`<figure><img src="${p.data}" alt="Foto da ocorrência"><button onclick="removePhoto('${p.id}')">Remover</button></figure>`).join('')}</div>`;
}
function choosePhoto(item,camera){
 if(photoBusy){showModal('Aguarde','Estamos preparando a foto.');return;}
 photoItem=item;const input=document.getElementById(camera?'cameraFile':'galleryFile');input.value='';input.click();
}
function removePhoto(id){inspectionPhotos=inspectionPhotos.filter(p=>p.id!==id);render();}
async function compressPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15000000)throw new Error('Escolha uma foto JPEG, PNG ou WebP de até 15 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  let size=1600;
  for(let pass=0;pass<3;pass++){
   const factor=Math.min(1,size/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*factor));canvas.height=Math.max(1,Math.round(bitmap.height*factor));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   for(const quality of [.8,.65,.5]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<590000)return data;}
   size=Math.round(size*.7);
  }
  throw new Error('Não foi possível reduzir esta foto. Escolha outra imagem.');
 }finally{bitmap.close();}
}
async function addPhotos(input){
 if(photoBusy)return;photoBusy=true;const item=photoItem;
 try{
  for(const file of input.files){
   if(inspectionPhotos.length>=6)throw new Error('Limite de seis fotos por vistoria atingido.');
   const data=await compressPhoto(file);inspectionPhotos.push({id:crypto.randomUUID(),item,data});
  }
  render();
 }catch(error){render();showModal('Foto não adicionada',error.message);}
 finally{photoBusy=false;input.value='';}
}
