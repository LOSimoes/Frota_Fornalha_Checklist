const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const vehicles = ['Master curta 01','Master curta 02','Master longa · 2018','Ducato · 2025','Mobi vendedor 01','Mobi vendedor 02'];
const items = { pneus:'Pneus e rodas', freios:'Freios e direção', luzes:'Luzes e visibilidade', oleo:'Nível de óleo', motor:'Motor e painel', avarias:'Carroceria e portas', seguranca:'Cintos e equipamentos', frio:'Refrigeração' };
const dateKey = time => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date(time));
const invalid = message => { throw Object.assign(new Error(message), { status:400 }); };
function jpegSize(data){
  let offset=2;
  while(offset+4<data.length){
    if(data[offset++]!==255)return null;while(data[offset]===255)offset++;
    if(offset+3>data.length)return null;
    const marker=data[offset++];if(marker===0xda||marker===0xd9)return null;
    const length=data.readUInt16BE(offset);if(length<2||offset+length>data.length)return null;
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return length>=8?{height:data.readUInt16BE(offset+3),width:data.readUInt16BE(offset+5)}:null;
    offset+=length;
  }
  return null;
}
function validate(value, now = Date.now(), fleet = vehicles.map((name,id)=>({id,name,refrigerated:id<4}))) {
  if (!value || typeof value !== 'object') invalid('Vistoria inválida.');
  if (![1,2].includes(value.version) || typeof value.id !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value.id)) invalid('Identificação da vistoria inválida.');
  if (typeof value.driver !== 'string' || !value.driver.trim() || value.driver.length > 100) invalid('Informe o motorista.');
  const vehicle = fleet.find(v=>v.id===value.vehicle);
  if (!Number.isInteger(value.vehicle) || !vehicle) invalid('Veículo inválido.');
  if (!['Saída','Retorno'].includes(value.type)) invalid('Tipo de vistoria inválido.');
  if (!Number.isSafeInteger(value.km) || value.km < 0) invalid('Quilometragem inválida.');
  if (typeof value.inspectedAt !== 'string' || !Number.isFinite(Date.parse(value.inspectedAt)) || Date.parse(value.inspectedAt) > now + 300000) invalid('Data da vistoria inválida. Confira o relógio do aparelho.');
  const refrigerated = value.version===1 ? value.vehicle<4 : typeof value.refrigerated==='boolean' ? value.refrigerated : !!vehicle.refrigerated;
  if (refrigerated && (typeof value.temperature !== 'number' || !Number.isFinite(value.temperature))) invalid('Temperatura inválida.');
  const answers = {}, notes = {}, levels = {}, alerts = [];
  for (const id of Object.keys(items).filter(id => refrigerated || id !== 'frio')) {
    const answer = value.answers?.[id];
    if (!['OK','Problema','Não verifiquei'].includes(answer)) invalid(`Responda: ${items[id]}.`);
    answers[id] = answer;
    if (answer === 'Problema') {
      const note = value.notes?.[id];
      if (typeof note !== 'string' || !note.trim() || note.length > 2000) invalid(`Descreva o problema em ${items[id]} (até 2.000 caracteres).`);
      const level = value.levels?.[id] || 'Não sei avaliar';
      if (!['Não sei avaliar','Leve','Atenção','Crítico'].includes(level)) invalid('Gravidade inválida.');
      notes[id] = note.trim(); levels[id] = level;
      alerts.push({ item:items[id], kind:level, note:notes[id] });
    } else if (answer === 'Não verifiquei') alerts.push({ item:items[id], kind:'Não verificado',note:'Avaliar o item não verificado.' });
  }
  if (refrigerated && value.temperature >= -13) alerts.push({item:'Temperatura',kind:'Manutenção',note:`${value.temperature} °C — avaliar manutenção em breve.`});
  return {version:value.version,id:value.id.toLowerCase(),driver:value.driver.trim(),vehicle:value.vehicle,type:value.type,km:value.km,inspectedAt:new Date(value.inspectedAt).toISOString(),temperature:refrigerated?value.temperature:null,answers,notes,levels,alerts,...(value.version===2?{driverId:value.driverId,refrigerated,vehicleName:typeof value.vehicleName==='string'&&value.vehicleName.trim()&&value.vehicleName.length<=100?value.vehicleName.trim():vehicle.name}:{})};
}
function openStore(dir) {
  const db = new DatabaseSync(path.join(dir, 'frota.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS inspections(id TEXT PRIMARY KEY, day TEXT NOT NULL, received_at TEXT NOT NULL, payload TEXT NOT NULL)');
  db.exec('CREATE INDEX IF NOT EXISTS inspections_day ON inspections(day)');
  db.exec('CREATE TABLE IF NOT EXISTS photos(id TEXT PRIMARY KEY, inspection_id TEXT NOT NULL, item TEXT NOT NULL, data BLOB NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS vehicles(id INTEGER PRIMARY KEY, name TEXT NOT NULL, refrigerated INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1); CREATE TABLE IF NOT EXISTS drivers(id INTEGER PRIMARY KEY, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, default_vehicle INTEGER)');
  if(!db.prepare('SELECT COUNT(*) AS n FROM vehicles').get().n) vehicles.forEach((name,id)=>db.prepare('INSERT INTO vehicles(id,name,refrigerated) VALUES(?,?,?)').run(id,name,id<4?1:0));
  if(!db.prepare('SELECT COUNT(*) AS n FROM drivers').get().n) ['Motorista 01 · exemplo','Motorista 02 · exemplo','Motorista 03 · exemplo','Vendedor 01 · exemplo','Vendedor 02 · exemplo'].forEach(name=>db.prepare('INSERT INTO drivers(name) VALUES(?)').run(name));
  db.exec('CREATE TABLE IF NOT EXISTS driver_aliases(name TEXT PRIMARY KEY, driver_id INTEGER NOT NULL); INSERT OR IGNORE INTO driver_aliases SELECT name,id FROM drivers');
  const fleet=()=>db.prepare('SELECT * FROM vehicles ORDER BY id').all().map(v=>({...v,active:!!v.active,refrigerated:!!v.refrigerated}));
  function catalog(all=false){
    const vs=fleet(),history=db.prepare('SELECT payload FROM inspections ORDER BY json_extract(payload,\'$.inspectedAt\') DESC,id DESC').all().map(r=>JSON.parse(r.payload));
    const drivers=db.prepare('SELECT * FROM drivers ORDER BY id').all().map(d=>{
      const aliases=db.prepare('SELECT name FROM driver_aliases WHERE driver_id=?').all(d.id).map(a=>a.name);
      const recent=history.filter(r=>r.driverId===d.id || (!r.driverId&&aliases.includes(r.driver))).filter(r=>vs.some(v=>v.id===r.vehicle&&v.active)).slice(0,30);
      const counts=new Map();recent.forEach(r=>counts.set(r.vehicle,(counts.get(r.vehicle)||0)+1));
      const ranked=[...counts].sort((a,b)=>b[1]-a[1]);
      const fixed=vs.find(v=>v.id===d.default_vehicle&&v.active);
      return {id:d.id,name:d.name,active:!!d.active,defaultVehicleId:d.default_vehicle,suggestedVehicleId:fixed?fixed.id:(ranked[0]?.[0]??null),suggestionSource:fixed?'Vínculo definido pelo gestor':ranked.length?'Mais usado nas últimas 30 vistorias':null};
    });
    return {vehicles:all?vs:vs.filter(v=>v.active),drivers:all?drivers:drivers.filter(d=>d.active)};
  }
  function saveCatalog(p){
    if(!p||!['driver','vehicle'].includes(p.kind)||typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>100||typeof p.active!=='boolean')invalid('Informe nome (até 100 caracteres) e situação válidos.');
    const table=p.kind==='vehicle'?'vehicles':'drivers',name=p.name.trim();
    if(p.id!==undefined&&(!Number.isInteger(p.id)||!db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(p.id)))invalid('Cadastro não encontrado.');
    const duplicate=db.prepare(`SELECT id FROM ${table} WHERE lower(name)=lower(?) AND id<>?`).get(name,p.id??-1);if(duplicate)invalid('Já existe um cadastro com esse nome.');
    if(p.kind==='vehicle'){
      if(typeof p.refrigerated!=='boolean')invalid('Informe se o veículo tem refrigeração.');
      if(p.id===undefined)db.prepare('INSERT INTO vehicles(name,refrigerated,active) VALUES(?,?,?)').run(name,+p.refrigerated,+p.active);
      else db.prepare('UPDATE vehicles SET name=?,refrigerated=?,active=? WHERE id=?').run(name,+p.refrigerated,+p.active,p.id);
    }else{
      const alias=db.prepare('SELECT driver_id FROM driver_aliases WHERE lower(name)=lower(?)').get(name);if(alias&&alias.driver_id!==p.id)invalid('Este nome já pertence ao histórico de outro motorista. Use um nome diferente.');
      const v=p.defaultVehicleId??null;if(v!==null&&(!Number.isInteger(v)||!db.prepare('SELECT id FROM vehicles WHERE id=? AND active=1').get(v)))invalid('Escolha um veículo ativo para o vínculo.');
      if(p.id===undefined)db.prepare('INSERT INTO drivers(name,active,default_vehicle) VALUES(?,?,?)').run(name,+p.active,v);
      else db.prepare('UPDATE drivers SET name=?,active=?,default_vehicle=? WHERE id=?').run(name,+p.active,v,p.id);
      const id=p.id??db.prepare('SELECT id FROM drivers WHERE name=?').get(name).id;
      db.prepare('INSERT OR IGNORE INTO driver_aliases(name,driver_id) VALUES(?,?)').run(name,id);
    }
    return catalog(true);
  }
  return {
    catalog,saveCatalog,
    photo(id){return db.prepare('SELECT data FROM photos WHERE id=?').get(id);},
    save(raw, now = Date.now()) {
      if(raw?.version===2&&(!Number.isInteger(raw.driverId)||!db.prepare('SELECT id FROM drivers WHERE id=?').get(raw.driverId)))invalid('Motorista não encontrado. Atualize os cadastros.');
      const record = validate(raw, now, fleet());
      if(raw.photos!==undefined&&(!Array.isArray(raw.photos)||raw.photos.length>6))invalid('Use no máximo seis fotos por vistoria.');
      const ids=new Set();
      const photos=(raw.photos||[]).map(photo=>{
        if(!photo||typeof photo.id!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(photo.id)||ids.has(photo.id))invalid('Identificação de foto inválida.');
        ids.add(photo.id);
        if(!Object.hasOwn(items,photo.item)||record.answers[photo.item]!=='Problema')invalid('Vincule a foto a um problema informado.');
        if(typeof photo.data!=='string'||photo.data.length>620000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.data))invalid('Formato de foto inválido.');
        const data=Buffer.from(photo.data.split(',')[1],'base64');
        if(data.length<4||data.length>450000||data[0]!==255||data[1]!==216||data[data.length-2]!==255||data[data.length-1]!==217)invalid('Foto JPEG inválida ou acima do limite.');
        const dimensions=jpegSize(data);if(!dimensions||!dimensions.width||!dimensions.height||dimensions.width>1600||dimensions.height>1600)invalid('Foto inválida ou com dimensões acima do limite.');
        return {id:photo.id.toLowerCase(),item:photo.item,data,sha256:crypto.createHash('sha256').update(data).digest('hex')};
      });
      if(photos.length)record.photos=photos.map(p=>({id:p.id,item:p.item,sha256:p.sha256,bytes:p.data.length}));
      const payload = JSON.stringify(record);
      const existing = db.prepare('SELECT payload, received_at FROM inspections WHERE id=?').get(record.id);
      if (existing) {
        if (existing.payload !== payload) throw Object.assign(new Error('Identificador já usado para outra vistoria. O registro original foi preservado.'), {status:409});
        return {id:record.id,receivedAt:existing.received_at,duplicate:true};
      }
      const receivedAt = new Date(now).toISOString();
      db.exec('BEGIN IMMEDIATE');
      try{
        db.prepare('INSERT INTO inspections(id,day,received_at,payload) VALUES(?,?,?,?)').run(record.id,dateKey(record.inspectedAt),receivedAt,payload);
        for(const photo of photos)db.prepare('INSERT INTO photos(id,inspection_id,item,data) VALUES(?,?,?,?)').run(photo.id,record.id,photo.item,photo.data);
        db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');if(error.code?.includes('SQLITE'))invalid('Não foi possível salvar as fotos. Verifique se a identificação já foi usada.');throw error;}
      return {id:record.id,receivedAt,duplicate:false};
    },
    list(day, end=day, vehicleId=null) {
      for(const date of [day,end])if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date+'T12:00:00Z')) || new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date) invalid('Data inválida.');
      if(day>end)invalid('A data inicial deve ser anterior ou igual à final.');
      const selectedVehicle=vehicleId===null?null:fleet().find(v=>v.id===vehicleId);
      if(vehicleId!==null&&(!Number.isInteger(vehicleId)||!selectedVehicle))invalid('Selecione um veículo cadastrado.');
      const all = db.prepare('SELECT payload,received_at FROM inspections WHERE day BETWEEN ? AND ? AND (? IS NULL OR json_extract(payload,\'$.vehicle\')=?) ORDER BY day DESC,received_at DESC').all(day,end,vehicleId,vehicleId).map(row=>{const r=JSON.parse(row.payload);return {...r,vehicleName:r.vehicleName||vehicles[r.vehicle]||'Veículo histórico',receivedAt:row.received_at};});
      const occurrences=[],unverified=[],groups=new Map();
      for(const r of all)for(const a of r.alerts){
        const o={...a,id:r.id,driver:r.driver,vehicle:r.vehicle,vehicleName:r.vehicleName,type:r.type,km:r.km,date:dateKey(r.inspectedAt),inspectedAt:r.inspectedAt};
        if(a.kind==='Não verificado'){unverified.push(o);continue;}
        occurrences.push(o);const g=groups.get(a.item)||{item:a.item,count:0,days:new Set(),vehicles:new Set()};g.count++;g.days.add(o.date);g.vehicles.add(r.vehicle);groups.set(a.item,g);
      }
      const frequency=[...groups.values()].map(g=>({item:g.item,count:g.count,days:g.days.size,vehicles:g.vehicles.size,dates:[...g.days].sort()})).sort((a,b)=>b.count-a.count||a.item.localeCompare(b.item));
      return { day,start:day,end,vehicleId,vehicleLabel:selectedVehicle?.name||'Todos os veículos',total:all.length,exits:all.filter(r=>r.type==='Saída').length,returns:all.filter(r=>r.type==='Retorno').length,withAlerts:all.filter(r=>r.alerts.length).length,records:all,vehicles,items,occurrences,unverified,frequency,defects:occurrences.filter(o=>o.kind!=='Manutenção').length,maintenanceAlerts:occurrences.filter(o=>o.kind==='Manutenção').length };
    },
    close:()=>db.close()
  };
}
module.exports = { openStore, validate, dateKey };
