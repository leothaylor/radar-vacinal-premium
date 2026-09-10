/*
 * Motor clínico do Radar Vacinal ACS — puro, sem DOM.
 * Carregável no navegador (window.RadarEngine) e no Node (require) para testes.
 * Regras clínicas: ver data/vaccine-calendar-2026.js e docs/auditoria-vacinal-2026.md.
 *
 * Status possíveis por dose:
 *   applied | delayed | alert | eligible | relative_pending | future | window_closed | history
 *   - delayed:          dose agendada com data-alvo já vencida (busca ativa)
 *   - eligible:         dentro da janela de elegibilidade etária (sem dependência de dose anterior)
 *   - relative_pending: depende de uma dose anterior JÁ marcada, mas a DATA da dose anterior
 *                       não é armazenada -> não se pode afirmar prontidão. Conservador:
 *                       "X meses após a dose anterior — confirme a data na caderneta".
 *   - future:          ainda não chegou / não elegível ainda / aguardando dose anterior / conforme indicação
 *   - window_closed:   janela de oportunidade encerrada (não aplicar por faixa etária)
 *   - history:         "conforme histórico/caderneta" — NUNCA vira atraso
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else root.RadarEngine = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Datas ----------
  function parseBirth(dateStr) { return new Date(dateStr + 'T12:00:00'); }
  function addMonths(dateStr, months) {
    if (!dateStr) return new Date();
    var d = parseBirth(dateStr); d.setMonth(d.getMonth() + months); return d;
  }
  function addDays(dateStr, days) {
    if (!dateStr) return new Date();
    var d = parseBirth(dateStr); d.setDate(d.getDate() + days); return d;
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function formatDate(dateObj) {
    if (!dateObj || isNaN(dateObj)) return '--/--/----';
    return pad(dateObj.getDate()) + '/' + pad(dateObj.getMonth() + 1) + '/' + dateObj.getFullYear();
  }
  function getDaysDiff(targetDate, today) {
    if (!targetDate || isNaN(targetDate)) return 0;
    var t = today ? new Date(today) : new Date(); t.setHours(0, 0, 0, 0);
    var target = new Date(targetDate); target.setHours(0, 0, 0, 0);
    return Math.ceil((target - t) / 86400000);
  }
  function getAgeInDays(birthDateStr, today) {
    if (!birthDateStr) return 0;
    var b = parseBirth(birthDateStr);
    var t = today ? new Date(today) : new Date(); t.setHours(0, 0, 0, 0);
    return Math.floor((t - b) / 86400000);
  }
  function getAgeText(birthDateStr, today) {
    if (!birthDateStr) return '--';
    var b = parseBirth(birthDateStr);
    var now = today ? new Date(today) : new Date();
    var m = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
    if (now.getDate() < b.getDate()) m--;
    if (m < 1) return 'Recém-nascido';
    if (m < 12) return m + ' m';
    var y = Math.floor(m / 12), r = m % 12;
    return r === 0 ? y + ' a' : y + 'a ' + r + 'm';
  }

  // ---------- Avaliação de uma dose ----------
  function windowOpenClose(birth, rule) {
    var open = (rule.minDays != null) ? addDays(birth, rule.minDays) : addMonths(birth, rule.minMonths || 0);
    var close = (rule.maxDays != null) ? addDays(birth, rule.maxDays)
              : (rule.maxMonths != null ? addMonths(birth, rule.maxMonths) : null);
    var target = (rule.targetMonths != null) ? addMonths(birth, rule.targetMonths) : open;
    return { open: open, close: close, target: target };
  }
  function intervalLabel(days) {
    if (days == null) return 'a dose anterior';
    if (days % 30 === 0) return Math.round(days / 30) + ' meses após a dose anterior';
    return days + ' dias após a dose anterior';
  }

  function evaluateDose(dose, group, child, appliedSet, today) {
    var rule = dose.rule || { type: 'scheduled' };
    var out = { status: 'future', tDateStr: '', daysDiff: null };
    if (appliedSet.has(dose.id)) { out.status = 'applied'; return out; }

    if (rule.type === 'history_check') {
      out.status = 'history'; out.tDateStr = 'Conforme histórico'; return out;
    }

    var special = group.ageMonths >= 900;

    if (rule.type === 'scheduled') {
      if (special) { out.status = 'future'; out.tDateStr = 'Conforme indicação'; return out; }
      var tDate = addMonths(child.birthDate, group.ageMonths);
      var dd = getDaysDiff(tDate, today);
      out.daysDiff = dd; out.tDateStr = formatDate(tDate);
      out.status = dd < 0 ? 'delayed' : (dd <= 30 ? 'alert' : 'future');
      return out;
    }

    if (rule.type === 'eligibility_window') {
      var w = windowOpenClose(child.birthDate, rule);
      var openDiff = getDaysDiff(w.open, today);
      var closeDiff = w.close ? getDaysDiff(w.close, today) : 1;
      out.daysDiff = getDaysDiff(w.target, today);
      if (openDiff > 0) { out.status = 'future'; out.tDateStr = 'A partir de ' + formatDate(w.open); return out; }
      if (closeDiff < 0) { out.status = 'window_closed'; out.tDateStr = 'Janela encerrada'; return out; }
      // Dentro da janela etária. Se depende de uma dose anterior, aplicar princípio conservador:
      if (rule.afterDoseId) {
        if (!appliedSet.has(rule.afterDoseId)) {
          out.status = 'future'; out.tDateStr = 'Após a dose anterior'; return out;
        }
        // dose anterior marcada, mas sem DATA -> não afirmar prontidão
        out.status = 'relative_pending';
        out.tDateStr = 'A partir de ' + (rule.minIntervalDays != null ? intervalLabel(rule.minIntervalDays) : 'a dose anterior') + ' — confirme a data na caderneta';
        return out;
      }
      out.status = 'eligible'; out.tDateStr = 'Elegível (a partir de ' + formatDate(w.open) + ')';
      return out;
    }

    if (rule.type === 'relative_to_previous_dose') {
      var close = rule.maxMonths != null ? addMonths(child.birthDate, rule.maxMonths) : null;
      if (close && getDaysDiff(close, today) < 0) { out.status = 'window_closed'; out.tDateStr = 'Janela encerrada'; return out; }
      if (!appliedSet.has(rule.afterDoseId)) { out.status = 'future'; out.tDateStr = 'Após a dose anterior'; return out; }
      // dose anterior marcada, mas sem DATA armazenada -> estado conservador, sem inventar elegibilidade
      out.status = 'relative_pending';
      out.tDateStr = intervalLabel(rule.offsetDays) + ' — confirme a data na caderneta';
      return out;
    }

    out.status = 'future'; return out;
  }

  // ---------- Análise do calendário do paciente ----------
  function groupsForProfile(calendar, profileType) {
    var pt = profileType || 'crianca';
    return calendar.groups.filter(function (g) { return g.profileTypes.indexOf(pt) !== -1; });
  }

  function analisarCalendario(child, calendar, today) {
    var appliedSet = new Set(child.applied || []);
    var pt = child.profileType || 'crianca';
    var analise = [];
    var hasDelayed = false, hasAlert = false;

    groupsForProfile(calendar, pt).forEach(function (group) {
      group.doses.forEach(function (dose) {
        var ev = evaluateDose(dose, group, child, appliedSet, today);
        if (ev.status === 'delayed') hasDelayed = true;
        else if (ev.status === 'alert' || ev.status === 'eligible' || ev.status === 'relative_pending') hasAlert = true;
        analise.push({
          id: dose.id, name: dose.name, doseLabel: dose.doseLabel, indicator: dose.indicator,
          ruleType: (dose.rule || {}).type || 'scheduled',
          idGroup: group.idGroup, groupLabel: group.ageLabel,
          tDateStr: ev.tDateStr, daysDiff: ev.daysDiff, status: ev.status
        });
      });
    });
    return { doses: analise, generalStatus: hasDelayed ? 'danger' : (hasAlert ? 'alert' : 'ok') };
  }

  // Total de doses "completáveis" (exclui history_check) para a barra de progresso.
  function getTotalDoses(profileType, calendar) {
    return groupsForProfile(calendar, profileType).reduce(function (acc, g) {
      return acc + g.doses.filter(function (d) { return (d.rule || {}).type !== 'history_check'; }).length;
    }, 0);
  }

  // Busca ativa (pendências que podem ser afirmadas): atrasadas + elegíveis por idade.
  // NÃO inclui relative_pending (depende de data não armazenada -> conservador).
  function pendenciasBuscaAtiva(analise) {
    return analise.doses.filter(function (d) { return d.status === 'delayed' || d.status === 'eligible'; });
  }

  // ---------- Migração de dados (NUNCA descarta informação) ----------
  // Remaps SEMANTICAMENTE EQUIVALENTES apenas (mesma vacina/mesmo sentido).
  // dt_12 NÃO entra aqui: "atualizar esquema" != reforço programado aos 14a -> vira legado.
  var MIGRATION_MAP = {
    hpv_u9: 'hpv_dose', hpv_u12: 'hpv_dose', hpv_u13: 'hpv_dose', hpv_u14: 'hpv_dose',
    hpv_res: 'hpv_resgate',
    menacwy_11: 'menacwy_ado', menacwy_14: 'menacwy_ado',
    scr_res5: 'scr_res', scr_13: 'scr_res',
    hepb_res5: 'hepb_res', hepb_14: 'hepb_res',
    fa_res5: 'fa_res'
  };

  function validDoseIds(calendar) {
    var ids = new Set();
    calendar.groups.forEach(function (g) { g.doses.forEach(function (d) { ids.add(d.id); }); });
    return ids;
  }

  // Migra um paciente:
  //  - applied: só IDs válidos atuais + remaps equivalentes.
  //  - legacyApplied: preserva TODO ID antigo sem equivalente atual (ex.: dt_12, covid_res5,
  //    ou qualquer desconhecido), sem perda e fora do cálculo clínico atual.
  function migrateChild(child, calendar) {
    var ids = validDoseIds(calendar);
    var applied = Array.isArray(child.applied) ? child.applied : [];
    var newApplied = [];
    var legacy = Array.isArray(child.legacyApplied) ? child.legacyApplied.slice() : [];
    function addApplied(id) { if (id && ids.has(id) && newApplied.indexOf(id) === -1) newApplied.push(id); }
    function addLegacy(id) { if (id && legacy.indexOf(id) === -1) legacy.push(id); }

    applied.forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(MIGRATION_MAP, id)) {
        var m = MIGRATION_MAP[id];
        if (m && ids.has(m)) addApplied(m); else addLegacy(id);
      } else if (ids.has(id)) {
        addApplied(id);
      } else {
        addLegacy(id); // desconhecido/órfão -> preservado, nunca descartado
      }
    });

    return {
      id: child.id, name: child.name, birthDate: child.birthDate,
      profileType: child.profileType || 'crianca',
      applied: newApplied, legacyApplied: legacy
    };
  }

  function migrateAll(children, calendar) {
    if (!Array.isArray(children)) return [];
    return children.map(function (c) { return migrateChild(c, calendar); });
  }

  return {
    parseBirth: parseBirth, addMonths: addMonths, addDays: addDays, formatDate: formatDate,
    getDaysDiff: getDaysDiff, getAgeInDays: getAgeInDays, getAgeText: getAgeText,
    evaluateDose: evaluateDose, analisarCalendario: analisarCalendario,
    getTotalDoses: getTotalDoses, pendenciasBuscaAtiva: pendenciasBuscaAtiva,
    MIGRATION_MAP: MIGRATION_MAP, migrateChild: migrateChild, migrateAll: migrateAll
  };
});
