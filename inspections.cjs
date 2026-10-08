const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const vehicles = ['Master curta 01','Master curta 02','Master longa · 2018','Ducato · 2025','Mobi vendedor 01','Mobi vendedor 02'];
const items = { pneus:'Pneus e rodas', freios:'Freios e direção', luzes:'Luzes e visibilidade', oleo:'Nível de óleo', motor:'Motor e painel', avarias:'Carroceria e portas', seguranca:'Cintos e equipamentos', frio:'Refrigeração' };
const dateKey = time => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date(time));
const invalid = message => { throw Object.assign(new Error(message), { status:400 }); };
function validate(value, now = Date.now()) {
  if (!value || typeof value !== 'object') invalid('Vistoria inválida.');
  if (value.version !== 1 || typeof value.id !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value.id)) invalid('Identificação da vistoria inválida.');
  if (typeof value.driver !== 'string' || !value.driver.trim() || value.driver.length > 100) invalid('Informe o motorista.');
  if (!Number.isInteger(value.vehicle) || !vehicles[value.vehicle]) invalid('Veículo inválido.');
  if (!['Saída','Retorno'].includes(value.type)) invalid('Tipo de vistoria inválido.');
  if (!Number.isSafeInteger(value.km) || value.km < 0) invalid('Quilometragem inválida.');
  if (typeof value.inspectedAt !== 'string' || !Number.isFinite(Date.parse(value.inspectedAt)) || Date.parse(value.inspectedAt) > now + 300000) invalid('Data da vistoria inválida. Confira o relógio do aparelho.');
  const refrigerated = value.vehicle < 4;
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
  return {version:1,id:value.id.toLowerCase(),driver:value.driver.trim(),vehicle:value.vehicle,type:value.type,km:value.km,inspectedAt:new Date(value.inspectedAt).toISOString(),temperature:refrigerated?value.temperature:null,answers,notes,levels,alerts};
}
function openStore(dir) {
  const db = new DatabaseSync(path.join(dir, 'frota.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS inspections(id TEXT PRIMARY KEY, day TEXT NOT NULL, received_at TEXT NOT NULL, payload TEXT NOT NULL)');
  db.exec('CREATE INDEX IF NOT EXISTS inspections_day ON inspections(day)');
  return {
    save(raw, now = Date.now()) {
      const record = validate(raw, now), payload = JSON.stringify(record);
      const existing = db.prepare('SELECT payload, received_at FROM inspections WHERE id=?').get(record.id);
      if (existing) {
        if (existing.payload !== payload) throw Object.assign(new Error('Identificador já usado para outra vistoria. O registro original foi preservado.'), {status:409});
        return {id:record.id,receivedAt:existing.received_at,duplicate:true};
      }
      const receivedAt = new Date(now).toISOString();
      db.prepare('INSERT INTO inspections(id,day,received_at,payload) VALUES(?,?,?,?)').run(record.id,dateKey(record.inspectedAt),receivedAt,payload);
      return {id:record.id,receivedAt,duplicate:false};
    },
    list(day) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day+'T12:00:00Z')) || new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day) invalid('Data inválida.');
      const all = db.prepare('SELECT payload,received_at FROM inspections WHERE day=? ORDER BY received_at DESC').all(day).map(row=>({...JSON.parse(row.payload),receivedAt:row.received_at}));
      return { day, total:all.length, exits:new Set(all.filter(r=>r.type==='Saída').map(r=>r.vehicle)).size, returns:new Set(all.filter(r=>r.type==='Retorno').map(r=>r.vehicle)).size, withAlerts:all.filter(r=>r.alerts.length).length,records:all.slice(0,100),vehicles,items };
    },
    close:()=>db.close()
  };
}
module.exports = { openStore, validate, dateKey };
