const crypto=require('node:crypto');
const statuses=['Aberta','Agendada','Em manutenção','Concluída'];
const operational=['Disponível','Uso com restrição','Indisponível'];
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const key=o=>JSON.stringify([o.id,o.item]);
function create(db,{history,fleet,updateOccurrence,jpegSize}){
 db.exec('CREATE TABLE IF NOT EXISTS work_orders(id TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS vehicle_operations(vehicle INTEGER PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS workshop_requests(id TEXT PRIMARY KEY,hash TEXT NOT NULL); CREATE TABLE IF NOT EXISTS work_evidence(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,data BLOB NOT NULL)');
 const orders=()=>db.prepare('SELECT payload FROM work_orders ORDER BY rowid DESC').all().map(r=>JSON.parse(r.payload));
 const operations=()=>db.prepare('SELECT payload FROM vehicle_operations').all().map(r=>JSON.parse(r.payload));
 const text=(v,max=1000)=>{if(v==null)return '';if(typeof v!=='string'||v.length>max)fail(`Use texto com até ${max} caracteres.`);return v.trim();};
 function save(p,now=Date.now()){
  if(!p||typeof p.requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(p.requestId))fail('Identificador de envio inválido.');
  const hash=crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex');
  db.exec('BEGIN IMMEDIATE');
  try{
   const request=db.prepare('SELECT hash FROM workshop_requests WHERE id=?').get(p.requestId);
   if(request){if(request.hash!==hash)fail('Identificador reutilizado com outros dados.');db.exec('COMMIT');return {ok:true,duplicate:true};}
   const vehicle=fleet().find(v=>v.id===p.vehicle);if(!vehicle)fail('Veículo não encontrado.');
   const at=new Date(now).toISOString();
   if(p.action==='operation'){
    if(!operational.includes(p.status))fail('Situação operacional inválida.');
    const old=operations().find(o=>o.vehicle===p.vehicle);
    if(p.revision!==(old?.revision||0))fail('Situação alterada por outro acesso. Atualize a página.');
    const next={vehicle:p.vehicle,status:p.status,note:text(p.note),revision:(old?.revision||0)+1,history:[...(old?.history||[]),{at,status:p.status,note:text(p.note),actor:'Gestor'}]};
    db.prepare('INSERT OR REPLACE INTO vehicle_operations VALUES(?,?)').run(p.vehicle,JSON.stringify(next));
   }else if(p.action==='order'){
    if(typeof p.id!=='string'||!/^[a-f0-9-]{36}$/i.test(p.id))fail('Identificação da ordem inválida.');
    const old=orders().find(o=>o.id===p.id);
    if(p.revision!==(old?.revision||0))fail('Ordem alterada por outro acesso. Atualize a página.');
    if(old&&old.vehicle!==p.vehicle)fail('Não é possível trocar o veículo da ordem.');
    if(!statuses.includes(p.status))fail('Situação da ordem inválida.');
    if(!Array.isArray(p.issues)||!p.issues.length||p.issues.length>100)fail('Selecione de 1 a 100 apontamentos.');
    const sources=history(),seen=new Set(),issues=[];
    for(const issue of p.issues){
     const k=key(issue);if(seen.has(k))fail('Apontamento repetido na seleção.');seen.add(k);
     const r=sources.find(r=>r.id===issue.id);const alert=r?.alerts.find(a=>a.item===issue.item&&a.kind!=='Não verificado');
     if(!r||r.vehicle!==p.vehicle||!alert)fail('Apontamento indisponível ou de outro veículo.');
     if(orders().some(o=>o.id!==p.id&&o.issues.some(i=>key(i)===k)))fail('Apontamento já vinculado a outra ordem.');
     issues.push({id:r.id,item:alert.item,kind:alert.kind,note:alert.note,inspectedAt:r.inspectedAt});
    }
    if(old?.issues.some(i=>!seen.has(key(i))))fail('Os vínculos anteriores devem ser preservados.');
    const money=v=>{if(v===''||v==null)return null;if(!Number.isSafeInteger(v)||v<0||v>100000000)fail('Valor inválido. Informe centavos não negativos.');return v;};
    const due=text(p.due,10);if(due&&(!/^\d{4}-\d{2}-\d{2}$/.test(due)||new Date(due+'T12:00:00Z').toISOString().slice(0,10)!==due))fail('Prazo inválido.');
    if(p.km!=null&&p.km!==''&&(!Number.isSafeInteger(p.km)||p.km<0))fail('Quilometragem inválida.');
    const evidence=[...(old?.evidence||[])];
    if(!Array.isArray(p.evidence||[])||evidence.length+(p.evidence||[]).length>10)fail('Use até dez fotos de conclusão por ordem.');
    for(const photo of p.evidence||[]){
     if(typeof photo.data!=='string'||photo.data.length>620000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.data))fail('Envie foto JPEG válida.');
     const data=Buffer.from(photo.data.split(',')[1],'base64'),size=jpegSize(data);
     if(data.length>450000||data[0]!==255||data[1]!==216||data.at(-2)!==255||data.at(-1)!==217||!size||size.width>1600||size.height>1600)fail('Foto inválida ou acima do limite.');
     const id=crypto.randomUUID();db.prepare('INSERT INTO work_evidence VALUES(?,?,?)').run(id,p.id,data);evidence.push({id,caption:text(photo.caption,160),at});
    }
    const next={id:p.id,vehicle:p.vehicle,vehicleName:vehicle.name,title:text(p.title,160)||'Manutenção do veículo',status:p.status,workshop:text(p.workshop,200),responsible:text(p.responsible,200),due,parts:text(p.parts),budgetCents:money(p.budgetCents),costCents:money(p.costCents),service:text(p.service),invoice:text(p.invoice,200),km:p.km==null||p.km===''?null:p.km,issues,evidence,revision:(old?.revision||0)+1,createdAt:old?.createdAt||at,updatedAt:at};
    next.history=[...(old?.history||[]),{at,actor:'Gestor',...next,history:undefined}];
    db.prepare('INSERT OR REPLACE INTO work_orders VALUES(?,?)').run(p.id,JSON.stringify(next));
    const status={Aberta:'Em avaliação',Agendada:'Manutenção agendada','Em manutenção':'Em manutenção',Concluída:'Resolvido'}[p.status];
    for(const issue of issues){const revision=db.prepare('SELECT COUNT(*) AS n FROM occurrence_updates WHERE inspection_id=? AND item=?').get(issue.id,issue.item).n;updateOccurrence({...issue,revision,status,note:`Ordem ${p.id}: ${p.status}${next.service?' — '+next.service.slice(0,800):''}`},now);}
   }else fail('Ação inválida.');
   db.prepare('INSERT INTO workshop_requests VALUES(?,?)').run(p.requestId,hash);db.exec('COMMIT');return {ok:true};
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 return {orders,operations,save,evidence:id=>db.prepare('SELECT data FROM work_evidence WHERE id=?').get(id)};
}
module.exports={create};
