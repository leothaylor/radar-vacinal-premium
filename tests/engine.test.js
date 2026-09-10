'use strict';
const test = require('node:test');
const assert = require('node:assert');
const engine = require('../js/engine.js');
const calendar = require('../data/vaccine-calendar-2026.js');

const TODAY = new Date(2026, 8, 9, 12, 0, 0); // 2026-09-09 local noon

function isoMonthsAgo(n) {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - n, TODAY.getDate(), 12);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function isoDaysAgo(n) {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - n, 12);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function statusOf(child, doseId) {
  const r = engine.analisarCalendario(child, calendar, TODAY);
  const d = r.doses.find(x => x.id === doseId);
  return d ? d.status : null;
}

test('scheduled: penta_1 delayed quando alvo (2m) já venceu', () => {
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(4), applied: [] }, 'penta_1'), 'delayed');
});
test('scheduled: penta_1 future para recém-nascido', () => {
  assert.strictEqual(statusOf({ birthDate: isoDaysAgo(10), applied: [] }, 'penta_1'), 'future');
});
test('scheduled: applied vence tudo', () => {
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(4), applied: ['penta_1'] }, 'penta_1'), 'applied');
});

test('pneumo é VPC20 aos 2m e reforço 12m, VPC10 aos 4m', () => {
  const g2 = calendar.groups.find(g => g.idGroup === 'g2').doses.find(d => d.id === 'pneumo_1');
  const g4 = calendar.groups.find(g => g.idGroup === 'g4').doses.find(d => d.id === 'pneumo_2');
  const g12 = calendar.groups.find(g => g.idGroup === 'g12').doses.find(d => d.id === 'pneumo_ref');
  assert.match(g2.name, /VPC20/);
  assert.match(g4.name, /VPC10/);
  assert.match(g12.name, /VPC20/);
});

test('VIP 2º reforço aos 4 anos existe (auditoria)', () => {
  const g48 = calendar.groups.find(g => g.idGroup === 'g48');
  assert.ok(g48.doses.some(d => d.id === 'vip_ref2'), 'vip_ref2 deve existir aos 48m');
});

test('HPV: janela única — future antes de 9a, eligible dentro, window_closed depois', () => {
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(8 * 12), applied: [] }, 'hpv_dose'), 'future');
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(10 * 12), applied: [] }, 'hpv_dose'), 'eligible');
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(15 * 12 + 2), applied: [] }, 'hpv_dose'), 'window_closed');
});

test('HPV não é duplicado por idade (só 1 dose de rotina)', () => {
  const child = { birthDate: isoMonthsAgo(13 * 12), applied: [] };
  const r = engine.analisarCalendario(child, calendar, TODAY);
  const hpvRotina = r.doses.filter(d => d.id === 'hpv_dose');
  assert.strictEqual(hpvRotina.length, 1);
});

test('Rotavírus: eligible dentro da janela, window_closed após 11m29d (D1)', () => {
  assert.strictEqual(statusOf({ birthDate: isoDaysAgo(20), applied: [] }, 'rota_1'), 'future');
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(6), applied: [] }, 'rota_1'), 'eligible');
  assert.strictEqual(statusOf({ birthDate: isoDaysAgo(400), applied: [] }, 'rota_1'), 'window_closed');
});

test('Dengue D2 é relativa à D1 (não idade fixa)', () => {
  const born10 = isoMonthsAgo(10 * 12 + 6);
  assert.strictEqual(statusOf({ birthDate: born10, applied: [] }, 'dengue_2'), 'future'); // sem D1 -> após dose anterior
  assert.strictEqual(statusOf({ birthDate: born10, applied: ['dengue_1'] }, 'dengue_2'), 'eligible'); // com D1 -> liberada
});

test('history_check nunca vira atraso', () => {
  const child = { birthDate: isoMonthsAgo(20 * 12), applied: [] };
  assert.strictEqual(statusOf(child, 'scr_res'), 'history');
});

test('generalStatus: danger só com dose delayed', () => {
  const atrasado = engine.analisarCalendario({ birthDate: isoMonthsAgo(4), applied: [] }, calendar, TODAY);
  assert.strictEqual(atrasado.generalStatus, 'danger');
});

test('getTotalDoses exclui history_check', () => {
  const total = engine.getTotalDoses('crianca', calendar);
  const comHistory = calendar.groups
    .filter(g => g.profileTypes.includes('crianca'))
    .reduce((a, g) => a + g.doses.length, 0);
  assert.ok(total < comHistory, 'total deve excluir doses history_check');
});

test('gestante: VSR adicionado e nunca é atraso', () => {
  const g = calendar.groups.find(x => x.idGroup === 'gestante');
  assert.ok(g.doses.some(d => d.id === 'vsr_gest'), 'vsr_gest deve existir');
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(30 * 12), profileType: 'gestante', applied: [] }, 'vsr_gest'), 'future');
});

// ---------- Migração ----------
test('migração: remapeia HPV/MenACWY, remove órfãos, dedup, mantém válidos', () => {
  const old = { id: 'c_1', name: 'X', birthDate: '2015-01-01',
    applied: ['hpv_u9', 'hpv_u12', 'menacwy_11', 'penta_1', 'id_inexistente'] };
  const m = engine.migrateChild(old, calendar);
  assert.deepStrictEqual(m.applied.sort(), ['hpv_dose', 'menacwy_ado', 'penta_1'].sort());
  assert.strictEqual(m.profileType, 'crianca'); // default preservado
});

test('migração: paciente sem profileType vira crianca e não perde dados válidos', () => {
  const m = engine.migrateChild({ id: 'c_2', name: 'Y', birthDate: '2024-01-01', applied: ['bcg_u', 'hepb_0'] }, calendar);
  assert.strictEqual(m.profileType, 'crianca');
  assert.deepStrictEqual(m.applied.sort(), ['bcg_u', 'hepb_0'].sort());
});

test('migração: dt_12 antigo -> dt_14', () => {
  const m = engine.migrateChild({ id: 'c3', name: 'Z', birthDate: '2010-01-01', applied: ['dt_12'] }, calendar);
  assert.deepStrictEqual(m.applied, ['dt_14']);
});
