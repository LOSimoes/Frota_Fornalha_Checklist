const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { DatabaseSync } = require('node:sqlite');
const { PDFDocument, StandardFonts, rgb } = require('../vendor/pdf-lib.cjs');
const { openStore, dateKey } = require('../inspections.cjs');
const { backup } = require('./backup.cjs');
const general = new Set(['frente', 'traseira', 'lateral_esquerda', 'lateral_direita']);
function shift(day, n) { return new Date(Date.parse(day + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
function bounds(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Use mês no formato AAAA-MM.');
  const start = month + '-01';
  const next = new Date(start + 'T12:00:00Z'); next.setUTCMonth(next.getUTCMonth() + 1);
  return { start, end: shift(next.toISOString().slice(0, 10), -1) };
}
function selectEvidence(records, month) {
  const { start, end } = bounds(month);
  const events = records.filter(r => !r.cancelled && (r.type === 'Ocorrência' || Object.values(r.answers || {}).includes('Problema')));
  const selected = [];
  for (const record of records) {
    if (record.cancelled) continue;
    const day = dateKey(record.inspectedAt);
    for (const photo of record.photos || []) {
      const related = events.filter(e => e.vehicle === record.vehicle &&
        dateKey(e.inspectedAt) >= day && dateKey(e.inspectedAt) <= shift(day, 2) &&
        Date.parse(record.inspectedAt) <= Date.parse(e.inspectedAt) &&
        ((day >= start && day <= end) || (dateKey(e.inspectedAt) >= start && dateKey(e.inspectedAt) <= end)));
      if ((!general.has(photo.item) && day >= start && day <= end) || (general.has(photo.item) && related.length)) {
        selected.push({ record, photo, related: related.map(e => e.id) });
      }
    }
  }
  return selected;
}
async function render(report, evidence, getPhoto, month) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Fornalha - Fechamento ${month}`);
  pdf.setAuthor('Fornalha');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page, y;
  const clean = value => [...String(value ?? '')].map(c => { try { font.encodeText(c); return c; } catch { return '?'; } }).join('');
  function newPage() { page = pdf.addPage([595.28, 841.89]); y = 790; }
  function line(value = '', strong = false, size = 10) {
    const f = strong ? bold : font;
    const words = clean(value).replace(/\r/g, '').split(/\s+/);
    let text = '';
    const draw = () => { if (y < 55) newPage(); page.drawText(text, { x: 42, y, size, font: f, color: rgb(.15, .15, .15) }); y -= size + 6; text = ''; };
    for (const word of words) {
      for (const char of (text ? ' ' : '') + word) {
        if (f.widthOfTextAtSize(text + char, size) > 508) draw();
        text += char;
      }
    }
    draw();
  }
  newPage();
  line(`FORNALHA | Fechamento mensal ${month}`, true, 18);
  line(`Período: ${report.start} a ${report.end}. Datas no horário de São Paulo.`);
  line('Resumo do mês', true, 14);
  line(`${report.total} vistorias; ${report.incidentCount} ocorrências avulsas; ${report.withAlerts} registros com alertas.`);
  line(`${report.occurrences.length} apontamentos; ${report.unverified.length} itens não verificados.`);
  line(`${report.occurrences.filter(o => o.status !== 'Resolvido').length} apontamentos ainda não resolvidos na emissão.`);
  line(`${report.records.filter(r => r.cancelled).length} registros cancelados, identificados no detalhamento.`);
  line(`${evidence.length} fotos selecionadas: problemas e comparação do mesmo veículo até dois dias antes, incluindo o dia do fato.`);
  for (const f of report.frequency) line(`${f.item}: ${f.count} apontamentos em ${f.days} dias, ${f.vehicles} veículos.`);
  line('Este documento arquiva os registros disponíveis na emissão. Não atribui culpa e não substitui o backup do banco.');
  line('Fotos gerais sem relação com problema não integram este PDF. O histórico do sistema é preservado.');
  for (const r of [...report.records].sort((a, b) => a.inspectedAt.localeCompare(b.inspectedAt))) {
    newPage();
    line(`${r.type}${r.cancelled ? ' — CANCELADO' : ''}`, true, 16);
    line(`${r.vehicleName} | ${dateKey(r.inspectedAt)} | ${r.km} km`, true);
    line(`Motorista: ${r.driver}. Responsável pela vistoria: ${r.inspector || 'Não informado'}.`);
    line(`Protocolo: ${r.id}`);
    line(`Registro: ${r.inspectedAt}; recebido: ${r.receivedAt || 'Não informado'}`);
    if (r.description) line(`Relato: ${r.description}`);
    if (r.location) line(`Local: ${r.location}`);
    for(const [key,label] of [['parts','Peças / serviços'],['budget','Orçamento'],['actions','Providências']])if(r.maintenance?.[key])line(`${label}: ${r.maintenance[key]}`);
    if (r.kmNote) line(`Observação de quilometragem: ${r.kmNote}`);
    for (const [key, answer] of Object.entries(r.answers || {})) {
      const level = { oleo: r.oilLevel, agua: r.waterLevel, hidraulico: r.hydraulicLevel }[key];
      line(`${report.items[key] || key}: ${level || answer}${r.levels?.[key] ? ' | ' + r.levels[key] : ''}`, true);
      if (r.notes?.[key]) line(r.notes[key]);
    }
    if (r.refrigerated) line(`Temperatura: ${r.temperature == null ? 'Não informada' : r.temperature + ' °C'}`);
    for (const o of report.occurrences.filter(o => o.id === r.id)) {
      line(`${o.item}: ${o.kind} — ${o.status}`, true);
      if (o.note) line(o.note);
      for (const h of o.history || []) line(`${h.at}: ${h.status} — ${h.note || ''}`);
    }
    if (r.corrections?.length) { line('Histórico de correções', true); for (const c of r.corrections) line(JSON.stringify(c)); }
  }
  for (const e of evidence) {
    const bytes = getPhoto(e.photo.id)?.data;
    if (!bytes) throw new Error(`Foto ausente: ${e.photo.id}. Fechamento não concluído.`);
    const image = await pdf.embedJpg(bytes);
    newPage();
    line('Evidência fotográfica', true, 16);
    line(`${e.record.vehicleName} | ${dateKey(e.record.inspectedAt)} | ${report.items[e.photo.item] || e.photo.item}`, true);
    line(`Registro de origem: ${e.record.id}`);
    if(e.photo.caption)line(`Legenda: ${e.photo.caption}`);
    if (general.has(e.photo.item)) line(`Comparação para: ${e.related.join(', ')}`);
    const scale = Math.min(508 / image.width, (y - 65) / image.height);
    page.drawImage(image, { x: 42, y: y - image.height * scale, width: image.width * scale, height: image.height * scale });
  }
  const pages = pdf.getPages();
  pages.forEach((p, i) => p.drawText(`${month} | ${i + 1} / ${pages.length}`, { x: 42, y: 25, size: 9, font }));
  return Buffer.from(await pdf.save());
}
async function monthlyReport(dataDir, destination, month, { now = new Date() } = {}) {
  const { start, end } = bounds(month);
  // Two complete days after month-end remain available for comparison evidence.
  if (dateKey(now) <= shift(end, 2)) throw new Error('O fechamento fica disponível no terceiro dia do mês seguinte.');
  const output = path.resolve(destination), source = path.resolve(dataDir);
  if (output === source || output.startsWith(source + path.sep)) throw new Error('Use uma pasta fora dos dados.');
  fs.mkdirSync(output, { recursive: true });
  const lock = path.join(output, '.monthly-report.lock');
  const fd = fs.openSync(lock, 'wx');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fornalha-monthly-'));
  let store;
  try {
    const snapshot = path.join(temp, 'snapshot');
    backup(source, snapshot);
    store = openStore(snapshot);
    const report = store.list(start, end);
    const surrounding = store.list(shift(start, -2), shift(end, 2));
    const evidence = selectEvidence(surrounding.records, month);
    const digest = crypto.createHash('sha256').update(JSON.stringify({ version: 1, report, evidence })).digest('hex');
    const name = `Fornalha-${month}-${digest.slice(0, 16)}.pdf`;
    const target = path.join(output, name);
    const receipt = target + '.json';
    if (fs.existsSync(target) && fs.existsSync(receipt)) {
      const old = JSON.parse(fs.readFileSync(receipt));
      if (old.digest === digest && old.sha256 === crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')) return { target, unchanged: true };
      throw new Error('Arquivo existente diverge do recibo. Preserve-o e verifique o arquivo antes de repetir.');
    }
    const bytes = await render(report, evidence, id => store.photo(id), month);
    const reopened = await PDFDocument.load(bytes);
    if (!reopened.getPageCount()) throw new Error('PDF sem páginas.');
    fs.writeFileSync(target, bytes, { flag: 'wx' });
    fs.writeFileSync(receipt, JSON.stringify({ month, digest, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), createdAt: now.toISOString(), records: report.records.length, photos: evidence.map(e => e.photo.id), pages: reopened.getPageCount(), historyDeleted: false }, null, 2), { flag: 'wx' });
    return { target, unchanged: false };
  } finally {
    store?.close();
    fs.closeSync(fd); fs.unlinkSync(lock);
    if (path.dirname(temp) === os.tmpdir() && path.basename(temp).startsWith('fornalha-monthly-')) fs.rmSync(temp, { recursive: true, force: true });
  }
}
async function main() {
  const root = path.resolve(__dirname, '..');
  const config = path.join(root, 'runtime.json');
  const cfg = fs.existsSync(config) ? JSON.parse(fs.readFileSync(config)) : {};
  const source = path.resolve(root, process.env.FROTA_DATA_DIR || cfg.dataDir || 'data');
  const destination = process.argv[2];
  if (!destination) throw new Error('Informe a pasta de destino dos PDFs.');
  const db = new DatabaseSync(path.join(source, 'frota.sqlite'), { readOnly: true });
  let months;
  try { months = db.prepare('SELECT DISTINCT substr(day,1,7) AS month FROM inspections ORDER BY month').all().map(r => r.month); }
  finally { db.close(); }
  const now = new Date();
  for (const month of months) {
    if (dateKey(now) <= shift(bounds(month).end, 2)) continue;
    const result = await monthlyReport(source, destination, month, { now });
    console.log(`${result.unchanged ? 'Já verificado' : 'PDF arquivado'}: ${result.target}`);
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { bounds, selectEvidence, render, monthlyReport };
