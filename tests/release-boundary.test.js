'use strict';
const test = require('node:test');
const assert = require('node:assert');
const engine = require('../js/engine.js');
const calendar = require('../data/vaccine-calendar-2026.js');

function statusOf(doseId, child, date) {
  return engine.analisarCalendario(child, calendar, new Date(date + 'T12:00:00')).doses.find(d => d.id === doseId).status;
}

test('HPV: válido até 14a11m29d e encerrado aos 15 anos', () => {
  const child = { birthDate: '2011-09-15', applied: [] };
  assert.strictEqual(statusOf('hpv_dose', child, '2026-09-14'), 'eligible');
  assert.strictEqual(statusOf('hpv_dose', child, '2026-09-15'), 'window_closed');
});

test('Dengue D1: válida até 14a11m29d e encerrada aos 15 anos', () => {
  const child = { birthDate: '2011-09-15', applied: [] };
  assert.strictEqual(statusOf('dengue_1', child, '2026-09-14'), 'eligible');
  assert.strictEqual(statusOf('dengue_1', child, '2026-09-15'), 'window_closed');
});

test('MenACWY: válida até 14a11m29d e encerrada aos 15 anos', () => {
  const child = { birthDate: '2011-09-15', applied: [] };
  assert.strictEqual(statusOf('menacwy_ado', child, '2026-09-14'), 'eligible');
  assert.strictEqual(statusOf('menacwy_ado', child, '2026-09-15'), 'window_closed');
});

test('Dengue D2: não fecha prematuramente quando intervalo já foi cumprido', () => {
  const child = {
    birthDate: '2011-09-15',
    applied: ['dengue_1'],
    appliedDates: { dengue_1: '2026-05-01' }
  };
  assert.strictEqual(statusOf('dengue_2', child, '2026-09-14'), 'eligible');
  assert.strictEqual(statusOf('dengue_2', child, '2026-09-15'), 'window_closed');
});
