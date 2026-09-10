'use strict';
const test = require('node:test');
const assert = require('node:assert');
const engine = require('../js/engine.js');
const calendar = require('../data/vaccine-calendar-2026.js');

const TODAY = new Date(2026, 8, 10, 12, 0, 0);

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

test('VIP 2º reforço aos 4 anos existe', () => {
  const g48 = calendar.groups.find(g => g.idGroup === 'g48');
  assert.ok(g48.doses.some(d => d.id === 'vip_ref2'));
});

test('HPV: janela única', () => {
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(8 * 12), applied: [] }, 'hpv_dose'), 'future');
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(10 * 12), applied: [] }, 'hpv_dose'), 'eligible');
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(15 * 12 + 2), applied: [] }, 'hpv_dose'), 'window_closed');
});

test('Rotavírus D1: janela', () => {
  assert.strictEqual(statusOf({ birthDate: isoDaysAgo(20), applied: [] }, 'rota_1'), 'future');
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(6), applied: [] }, 'rota_1'), 'eligible');
  assert.strictEqual(statusOf({ birthDate: isoDaysAgo(400), applied: [] }, 'rota_1'), 'window_closed');
});

test('Rotavírus D2 depende da D1 e sem data vira relative_pending', () => {
  const born6 = isoMonthsAgo(6);
  assert.strictEqual(statusOf({ birthDate: born6, applied: [] }, 'rota_2'), 'future');
  assert.strictEqual(statusOf({ birthDate: born6, applied: ['rota_1'] }, 'rota_2'), 'relative_pending');
});

test('Dengue D2: sem data da D1 nunca vira eligible automático', () => {
  const born10 = isoMonthsAgo(10 * 12 + 6);
  assert.strictEqual(statusOf({ birthDate: born10, applied: [] }, 'dengue_2'), 'future');
  assert.strictEqual(statusOf({ birthDate: born10, applied: ['dengue_1'] }, 'dengue_2'), 'relative_pending');
});

test('relative_pending não entra na busca ativa', () => {
  const born10 = isoMonthsAgo(10 * 12 + 6);
  const r = engine.analisarCalendario({ birthDate: born10, applied: ['dengue_1'] }, calendar, TODAY);
  assert.ok(!engine.pendenciasBuscaAtiva(r).some(d => d.id === 'dengue_2'));
});

test('history_check nunca vira atraso', () => {
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(20 * 12), applied: [] }, 'scr_res'), 'history');
});

test('influenza infantil é conferência anual/primovacinação, não atraso fixo', () => {
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(24), applied: [] }, 'influ_1'), 'history');
  const dose = calendar.groups.find(g => g.idGroup === 'g6').doses.find(d => d.id === 'influ_1');
  assert.match(dose.doseLabel, /2 doses com 30 dias/);
});

test('Covid infantil: terceira dose é condicional ao esquema, não atraso universal', () => {
  assert.strictEqual(statusOf({ birthDate: isoMonthsAgo(18), applied: [] }, 'covid_3'), 'history');
});

test('gestante nunca recebe status geral ok/Em Dia por falta de dados', () => {
  const child = { birthDate: '1990-01-01', profileType: 'gestante', applied: [] };
  const r = engine.analisarCalendario(child, calendar, TODAY);
  assert.strictEqual(r.generalStatus, 'alert');
  assert.strictEqual(r.requiresReview, true);
  assert.strictEqual(statusOf(child, 'dtpa_gest'), 'history');
  assert.strictEqual(statusOf(child, 'vsr_gest'), 'history');
});

test('gestante inclui dT e febre amarela excepcional', () => {
  const g = calendar.groups.find(x => x.idGroup === 'gestante');
  assert.ok(g.doses.some(d => d.id === 'dt_gest'));
  const fa = g.doses.find(d => d.id === 'fa_gest');
  assert.ok(fa);
  assert.match(fa.doseLabel, /excepcionais/);
});

test('trabalhador de saúde nunca recebe status geral ok/Em Dia por inferência incompleta', () => {
  const r = engine.analisarCalendario({ birthDate: '1990-01-01', profileType: 'trabsaude', applied: [] }, calendar, TODAY);
  assert.strictEqual(r.generalStatus, 'alert');
  assert.strictEqual(r.requiresReview, true);
});

test('trabalhador: dTpa é condicional a atuação com recém-nascidos', () => {
  const g = calendar.groups.find(x => x.idGroup === 'trabsaude');
  const d = g.doses.find(x => x.id === 'dtpa_trab');
  assert.strictEqual(d.rule.type, 'history_check');
  assert.match(d.doseLabel, /recém-nascidos/);
  assert.ok(g.doses.some(x => x.id === 'dt_trab'));
});

test('trabalhador: varicela e dengue APS estão presentes como conferência condicional', () => {
  const g = calendar.groups.find(x => x.idGroup === 'trabsaude');
  const vari = g.doses.find(x => x.id === 'vari_trab');
  const dengue = g.doses.find(x => x.id === 'dengue_aps_trab');
  assert.ok(vari && dengue);
  assert.strictEqual(vari.rule.type, 'history_check');
  assert.strictEqual(dengue.rule.type, 'history_check');
  assert.match(dengue.doseLabel, /dose única/);
  assert.match(dengue.doseLabel, /15–59/);
});

test('getTotalDoses exclui history_check para criança', () => {
  const total = engine.getTotalDoses('crianca', calendar);
  const comHistory = calendar.groups.filter(g => g.profileTypes.includes('crianca')).reduce((a, g) => a + g.doses.length, 0);
  assert.ok(total < comHistory);
});

test('getTotalDoses inclui itens de conferência para perfis especiais para evitar progresso x/0', () => {
  assert.strictEqual(engine.getTotalDoses('gestante', calendar), calendar.groups.find(g => g.idGroup === 'gestante').doses.length);
  assert.strictEqual(engine.getTotalDoses('trabsaude', calendar), calendar.groups.find(g => g.idGroup === 'trabsaude').doses.length);
});

test('migração: remaps equivalentes vão para applied; dedup; mantém válidos', () => {
  const old = { id: 'c_1', name: 'X', birthDate: '2015-01-01', applied: ['hpv_u9', 'hpv_u12', 'menacwy_11', 'penta_1'] };
  const m = engine.migrateChild(old, calendar);
  assert.deepStrictEqual(m.applied.sort(), ['hpv_dose', 'menacwy_ado', 'penta_1'].sort());
  assert.strictEqual(m.profileType, 'crianca');
});

test('migração preserva IDs sem equivalente em legacyApplied', () => {
  const old = { id: 'c_1', name: 'X', birthDate: '2015-01-01', applied: ['covid_res5', 'id_inexistente', 'penta_1'] };
  const m = engine.migrateChild(old, calendar);
  assert.ok(m.applied.includes('penta_1'));
  assert.ok(m.legacyApplied.includes('covid_res5'));
  assert.ok(m.legacyApplied.includes('id_inexistente'));
});

test('dt_12 não é convertido em dt_14', () => {
  const m = engine.migrateChild({ id: 'c3', name: 'Z', birthDate: '2010-01-01', applied: ['dt_12'] }, calendar);
  assert.ok(!m.applied.includes('dt_14'));
  assert.ok(m.legacyApplied.includes('dt_12'));
});

test('migração é idempotente', () => {
  const once = engine.migrateChild({ id: 'c4', name: 'W', birthDate: '2010-01-01', applied: ['dt_12', 'penta_1'] }, calendar);
  const twice = engine.migrateChild(once, calendar);
  assert.deepStrictEqual(twice.applied, once.applied);
  assert.ok(twice.legacyApplied.includes('dt_12'));
});

test('meta clínico revisado em 2026-09-10 e inclui NT11 dengue APS', () => {
  assert.strictEqual(calendar.meta.revisionDate, '2026-09-10');
  assert.ok(calendar.meta.sourceDocuments.some(s => s.id === 'NT11DENGUE'));
});

/* V2.1 — histórico de aplicação / janela encerrada */

test('schema 3 habilita datas de aplicação e histórico não confirmado', () => {
  assert.strictEqual(calendar.meta.schemaVersion, 3);
});

test('migração preserva appliedDates e historyUnknown', () => {
  const old = {
    id: 'c5', name: 'Histórico', birthDate: '2024-01-01',
    applied: ['penta_1'],
    appliedDates: { penta_1: '2024-03-01' },
    historyUnknown: ['rota_1']
  };
  const m = engine.migrateChild(old, calendar);
  assert.strictEqual(m.appliedDates.penta_1, '2024-03-01');
  assert.ok(m.historyUnknown.includes('rota_1'));
});

test('historyUnknown vira estado history_unknown e não busca ativa', () => {
  const child = {
    birthDate: isoDaysAgo(400),
    applied: [],
    historyUnknown: ['rota_1']
  };
  const r = engine.analisarCalendario(child, calendar, TODAY);
  const rota = r.doses.find(d => d.id === 'rota_1');
  assert.strictEqual(rota.status, 'history_unknown');
  assert.strictEqual(rota.tDateStr, 'Histórico não confirmado');
  assert.ok(!engine.pendenciasBuscaAtiva(r).some(d => d.id === 'rota_1'));
});

test('Rotavírus D2 usa data real da D1 quando disponível', () => {
  const child = {
    birthDate: '2026-03-10',
    applied: ['rota_1'],
    appliedDates: { rota_1: '2026-07-01' }
  };
  const r = engine.analisarCalendario(child, calendar, TODAY);
  const d2 = r.doses.find(d => d.id === 'rota_2');
  assert.strictEqual(d2.status, 'eligible');
  assert.match(d2.tDateStr, /Elegível desde/);
});

test('Dengue D2 fica future antes de 90 dias e eligible depois', () => {
  const born = '2016-03-10';
  const before = engine.analisarCalendario({
    birthDate: born,
    applied: ['dengue_1'],
    appliedDates: { dengue_1: '2026-08-20' }
  }, calendar, TODAY).doses.find(d => d.id === 'dengue_2');
  assert.strictEqual(before.status, 'future');

  const after = engine.analisarCalendario({
    birthDate: born,
    applied: ['dengue_1'],
    appliedDates: { dengue_1: '2026-05-01' }
  }, calendar, TODAY).doses.find(d => d.id === 'dengue_2');
  assert.strictEqual(after.status, 'eligible');
});

test('migração preserva datas de IDs sem equivalente em legacyAppliedDates', () => {
  const old = {
    id: 'c6', name: 'Legacy', birthDate: '2024-01-01',
    applied: ['id_inexistente'],
    appliedDates: { id_inexistente: '2024-02-01' }
  };
  const m = engine.migrateChild(old, calendar);
  assert.ok(m.legacyApplied.includes('id_inexistente'));
  assert.strictEqual(m.legacyAppliedDates.id_inexistente, '2024-02-01');
});
