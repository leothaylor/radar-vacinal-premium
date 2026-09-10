/* 
 * Motor clínico do Radar Vacinal ACS — puro, sem DOM.
 * Carregável no navegador (window.RadarEngine) e no Node (require) para testes.
 * Regras clínicas: ver data/vaccine-calendar-2026.js e docs/auditoria-vacinal-2026.md.
 *
 * Status possíveis por dose:
 *   applied | delayed | alert | eligible | relative_pending | future | window_closed | history | history_unknown
 *   - delayed:          dose agendada com data-alvo já vencida (busca ativa)
 *   - eligible:         dentro da janela de elegibilidade / intervalo já cumprido
 *   - relative_pending: depende de dose anterior marcada, mas sem data confiável
 *   - future:           ainda não chegou / não elegível / aguardando dose anterior
 *   - window_closed:    janela de oportunidade encerrada
 *   - history:          conforme histórico/caderneta/condição — NUNCA vira atraso
 *   - history_unknown:  usuário declarou que não há histórico confirmado
 *
 * Perfis gestante/trabalhador de saúde são deliberadamente conservadores:
 * mesmo sem atraso automático, o status geral é "alert" (UI: Atenção), nunca "ok/Em Dia",
 * porque o app não possui informação suficiente para afirmar situação vacinal completa.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else root.RadarEngine = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

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
  function validIsoDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    var d = parseBirth(dateStr);
    return !isNaN(d);
  }
  function dateAfter(dateStr, days) {
    if (!validIsoDate(dateStr)) return null;
    var d = parseBirth(dateStr);
    d.setDate(d.getDate() + days);
    return d;
  }

  function evaluateDose(dose, group, child, appliedSet, today, appliedDates, historyUnknownSet) {
    var rule = dose.rule || { type: 'scheduled' };
    var out = { status: 'future', tDateStr: '', daysDiff: null, appliedDate: null };

    if (appliedSet.has(dose.id)) {
      out.status = 'applied';
      if (appliedDates && validIsoDate(appliedDates[dose.id])) {
        out.appliedDate = appliedDates[dose.id];
        out.tDateStr = 'Aplicada em ' + formatDate(parseBirth(appliedDates[dose.id]));
      }
      return out;
    }

    if (historyUnknownSet && historyUnknownSet.has(dose.id)) {
      out.status = 'history_unknown';
      out.tDateStr = 'Histórico não confirmado';
      return out;
    }

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

      if (rule.afterDoseId) {
        if (!appliedSet.has(rule.afterDoseId)) {
          out.status = 'future'; out.tDateStr = 'Após a dose anterior'; return out;
        }
        var prevDate = appliedDates && appliedDates[rule.afterDoseId];
        if (!validIsoDate(prevDate)) {
          out.status = 'relative_pending';
          out.tDateStr = 'A partir de ' + (rule.minIntervalDays != null ? intervalLabel(rule.minIntervalDays) : 'a dose anterior') + ' — confirme a data na caderneta';
          return out;
        }
        var due = dateAfter(prevDate, rule.minIntervalDays || 0);
        if (w.open && due < w.open) due = w.open;
        var dueDiff = getDaysDiff(due, today);
        out.daysDiff = dueDiff;
        if (dueDiff > 0) {
          out.status = 'future';
          out.tDateStr = 'A partir de ' + formatDate(due);
        } else {
          out.status = 'eligible';
          out.tDateStr = 'Elegível desde ' + formatDate(due);
        }
        return out;
      }

      out.status = 'eligible'; out.tDateStr = 'Elegível (a partir de ' + formatDate(w.open) + ')';
      return out;
    }

    if (rule.type === 'relative_to_previous_dose') {
      var close = rule.maxMonths != null ? addMonths(child.birthDate, rule.maxMonths) : null;
      if (close && getDaysDiff(close, today) < 0) { out.status = 'window_closed'; out.tDateStr = 'Janela encerrada'; return out; }
      if (!appliedSet.has(rule.afterDoseId)) { out.status = 'future'; out.tDateStr = 'Após a dose anterior'; return out; }

      var previousDate = appliedDates && appliedDates[rule.afterDoseId];
      if (!validIsoDate(previousDate)) {
        out.status = 'relative_pending';
        out.tDateStr = intervalLabel(rule.offsetDays) + ' — confirme a data na caderneta';
        return out;
      }

      var relativeDue = dateAfter(previousDate, rule.offsetDays || 0);
      var relativeDiff = getDaysDiff(relativeDue, today);
      out.daysDiff = relativeDiff;
      if (relativeDiff > 0) {
        out.status = 'future';
        out.tDateStr = 'A partir de ' + formatDate(relativeDue);
      } else {
        out.status = 'eligible';
        out.tDateStr = 'Elegível desde ' + formatDate(relativeDue);
      }
      return out;
    }

    out.status = 'future'; return out;
  }

  function groupsForProfile(calendar, profileType) {
    var pt = profileType || 'crianca';
    return calendar.groups.filter(function (g) { return g.profileTypes.indexOf(pt) !== -1; });
  }

  function isSpecialProfile(profileType) {
    return profileType === 'gestante' || profileType === 'trabsaude';
  }

  function analisarCalendario(child, calendar, today) {
    var appliedSet = new Set(child.applied || []);
    var appliedDates = (child && child.appliedDates && typeof child.appliedDates === 'object') ? child.appliedDates : {};
    var historyUnknownSet = new Set(child.historyUnknown || []);
    var pt = child.profileType || 'crianca';
    var analise = [];
    var hasDelayed = false, hasAlert = false;

    groupsForProfile(calendar, pt).forEach(function (group) {
      group.doses.forEach(function (dose) {
        var ev = evaluateDose(dose, group, child, appliedSet, today, appliedDates, historyUnknownSet);
        if (ev.status === 'delayed') hasDelayed = true;
        else if (ev.status === 'alert' || ev.status === 'eligible' || ev.status === 'relative_pending' || ev.status === 'history_unknown') hasAlert = true;
        analise.push({
          id: dose.id, name: dose.name, doseLabel: dose.doseLabel, indicator: dose.indicator,
          ruleType: (dose.rule || {}).type || 'scheduled',
          idGroup: group.idGroup, groupLabel: group.ageLabel,
          tDateStr: ev.tDateStr, daysDiff: ev.daysDiff, status: ev.status,
          appliedDate: ev.appliedDate
        });
      });
    });

    var generalStatus = hasDelayed ? 'danger' : ((hasAlert || isSpecialProfile(pt)) ? 'alert' : 'ok');
    return { doses: analise, generalStatus: generalStatus, requiresReview: isSpecialProfile(pt) };
  }

  function getTotalDoses(profileType, calendar) {
    var includeHistory = isSpecialProfile(profileType);
    return groupsForProfile(calendar, profileType).reduce(function (acc, g) {
      return acc + g.doses.filter(function (d) {
        return includeHistory || (d.rule || {}).type !== 'history_check';
      }).length;
    }, 0);
  }

  function pendenciasBuscaAtiva(analise) {
    return analise.doses.filter(function (d) { return d.status === 'delayed' || d.status === 'eligible'; });
  }

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

  function migrateId(id, ids) {
    if (Object.prototype.hasOwnProperty.call(MIGRATION_MAP, id)) {
      var mapped = MIGRATION_MAP[id];
      return mapped && ids.has(mapped) ? mapped : null;
    }
    return ids.has(id) ? id : null;
  }

  function migrateChild(child, calendar) {
    var ids = validDoseIds(calendar);
    var applied = Array.isArray(child.applied) ? child.applied : [];
    var newApplied = [];
    var legacy = Array.isArray(child.legacyApplied) ? child.legacyApplied.slice() : [];
    var sourceDates = (child.appliedDates && typeof child.appliedDates === 'object') ? child.appliedDates : {};
    var newDates = {};
    var legacyDates = (child.legacyAppliedDates && typeof child.legacyAppliedDates === 'object') ? Object.assign({}, child.legacyAppliedDates) : {};
    var sourceUnknown = Array.isArray(child.historyUnknown) ? child.historyUnknown : [];
    var newUnknown = [];

    function addApplied(id) { if (id && ids.has(id) && newApplied.indexOf(id) === -1) newApplied.push(id); }
    function addLegacy(id) { if (id && legacy.indexOf(id) === -1) legacy.push(id); }
    function addUnknown(id) { if (id && ids.has(id) && newUnknown.indexOf(id) === -1) newUnknown.push(id); }

    applied.forEach(function (id) {
      var mapped = migrateId(id, ids);
      if (mapped) addApplied(mapped); else addLegacy(id);
    });

    Object.keys(sourceDates).forEach(function (id) {
      var mapped = migrateId(id, ids);
      if (mapped && validIsoDate(sourceDates[id])) {
        if (!newDates[mapped]) newDates[mapped] = sourceDates[id];
      } else if (validIsoDate(sourceDates[id])) {
        legacyDates[id] = sourceDates[id];
      }
    });

    sourceUnknown.forEach(function (id) {
      var mapped = migrateId(id, ids);
      if (mapped) addUnknown(mapped); else addLegacy(id);
    });

    var out = Object.assign({}, child);
    out.id = child.id;
    out.name = child.name;
    out.birthDate = child.birthDate;
    out.profileType = child.profileType || 'crianca';
    out.applied = newApplied;
    out.legacyApplied = legacy;
    out.appliedDates = newDates;
    out.legacyAppliedDates = legacyDates;
    out.historyUnknown = newUnknown;
    return out;
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
    MIGRATION_MAP: MIGRATION_MAP, migrateChild: migrateChild, migrateAll: migrateAll,
    validIsoDate: validIsoDate
  };
});

/*
 * Camada de aprimoramentos V2.1 para navegador.
 * Mantida aqui para evitar acoplamento clínico com o HTML legado:
 * - preserva doses ao editar paciente;
 * - registra data de aplicação e histórico não confirmado;
 * - adiciona resgate histórico para janela encerrada;
 * - exporta ficha/Busca Ativa em JPEG e permite compartilhamento.
 */
(function installRadarV21BrowserEnhancements() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  window.addEventListener('load', function () {
    try {
      if (typeof app === 'undefined' || !window.RadarEngine || !window.VACCINE_CALENDAR) return;
      try { if (typeof RadarAnalytics !== 'undefined') window.RadarAnalytics = RadarAnalytics; } catch (e) {}

      function activeChild() {
        return app.state.children.find(function (c) { return c.id === app.state.activeChildId; });
      }
      function ensureTracking(child) {
        if (!child.applied) child.applied = [];
        if (!child.appliedDates || typeof child.appliedDates !== 'object') child.appliedDates = {};
        if (!Array.isArray(child.historyUnknown)) child.historyUnknown = [];
        if (!Array.isArray(child.legacyApplied)) child.legacyApplied = [];
        if (!child.legacyAppliedDates || typeof child.legacyAppliedDates !== 'object') child.legacyAppliedDates = {};
      }
      function findDose(doseId) {
        var found = null;
        window.VACCINE_CALENDAR.groups.some(function (g) {
          return g.doses.some(function (d) {
            if (d.id === doseId) { found = { group: g, dose: d }; return true; }
            return false;
          });
        });
        return found;
      }
      function hasDependentDose(doseId) {
        return window.VACCINE_CALENDAR.groups.some(function (g) {
          return g.doses.some(function (d) { return d.rule && d.rule.afterDoseId === doseId; });
        });
      }
      function isoToday() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
      function brDate(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
      }

      app.saveEditedName = function () {
        var child = activeChild();
        if (!child) return;
        ensureTracking(child);
        var newName = document.getElementById('edit-input-name').value.trim();
        var newDate = document.getElementById('edit-input-date').value;
        if (newName && newDate) {
          child.name = newName;
          child.birthDate = newDate;
          child.profileType = currentEditProfileType;
          this.saveData();
          this.renderDetail();
          this.renderHome();
          document.getElementById('modal-edit-name').classList.add('hidden');
        }
      };

      app.toggleDose = function (doseId) {
        var child = activeChild();
        if (!child) return;
        ensureTracking(child);
        var idx = child.applied.indexOf(doseId);
        if (idx === -1) {
          child.applied.push(doseId);
          child.historyUnknown = child.historyUnknown.filter(function (id) { return id !== doseId; });
        } else {
          child.applied.splice(idx, 1);
          delete child.appliedDates[doseId];
        }
        if (window.RadarAnalytics) RadarAnalytics.track('dose_updated');
        this.saveData();
        this.renderDetail();

        if (idx === -1 && hasDependentDose(doseId) && !child.appliedDates[doseId]) {
          setTimeout(function () { app.openDoseHistoryModal(doseId, 'date'); }, 20);
        }
      };

      function ensureHistoryModal() {
        if (document.getElementById('modal-dose-history')) return;
        var wrap = document.createElement('div');
        wrap.id = 'modal-dose-history';
        wrap.className = 'fixed inset-0 z-[85] bg-slate-900/50 hidden flex-col justify-center items-center backdrop-blur-sm view-transition px-4';
        wrap.innerHTML = [
          '<div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col slide-up p-5 relative">',
          '  <div class="flex items-start justify-between gap-3 mb-3">',
          '    <div><h3 id="dose-history-title" class="text-lg font-bold text-slate-800">Registrar dose anterior</h3>',
          '    <p id="dose-history-subtitle" class="text-xs text-slate-500 mt-1"></p></div>',
          '    <button type="button" id="dose-history-close" aria-label="Fechar" class="p-2 bg-slate-100 text-slate-500 rounded-full"><span aria-hidden="true">&times;</span></button>',
          '  </div>',
          '  <div id="dose-history-warning" class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-[11px] text-amber-900 leading-relaxed">',
          '    Registre somente quando houver confirmação pela caderneta, registro anterior ou informação validada pela equipe.',
          '  </div>',
          '  <label class="text-xs font-bold text-slate-700 block mb-1" for="dose-history-date">Data da aplicação</label>',
          '  <input type="date" id="dose-history-date" class="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#78C7C7] font-medium text-slate-700 mb-3">',
          '  <button type="button" id="dose-history-save" class="w-full bg-[#78C7C7] text-white font-bold py-3 rounded-xl shadow-sm mb-2">Registrar como aplicada</button>',
          '  <button type="button" id="dose-history-unknown" class="w-full bg-amber-50 text-amber-800 border border-amber-200 font-bold py-3 rounded-xl mb-2">Histórico não confirmado</button>',
          '  <button type="button" id="dose-history-later" class="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl">Agora não</button>',
          '</div>'
        ].join('');
        document.body.appendChild(wrap);

        function close() {
          wrap.classList.add('hidden'); wrap.classList.remove('flex');
          wrap.dataset.doseId = ''; wrap.dataset.mode = '';
        }
        document.getElementById('dose-history-close').onclick = close;
        document.getElementById('dose-history-later').onclick = close;

        document.getElementById('dose-history-save').onclick = function () {
          var child = activeChild();
          var doseId = wrap.dataset.doseId;
          var date = document.getElementById('dose-history-date').value;
          if (!child || !doseId) return;
          ensureTracking(child);
          if (!date) { alert('Informe a data da aplicação para registrar este histórico.'); return; }
          if (!window.RadarEngine.validIsoDate(date)) { alert('Data inválida.'); return; }
          if (child.birthDate && date < child.birthDate) { alert('A aplicação não pode ser anterior ao nascimento cadastrado.'); return; }
          if (date > isoToday()) { alert('A aplicação não pode estar no futuro.'); return; }

          if (child.applied.indexOf(doseId) === -1) child.applied.push(doseId);
          child.appliedDates[doseId] = date;
          child.historyUnknown = child.historyUnknown.filter(function (id) { return id !== doseId; });
          app.saveData();
          close();
          app.renderDetail();
          app.renderHome();
          if (window.RadarAnalytics) RadarAnalytics.track('historical_dose_recorded');
        };

        document.getElementById('dose-history-unknown').onclick = function () {
          var child = activeChild();
          var doseId = wrap.dataset.doseId;
          if (!child || !doseId) return;
          ensureTracking(child);
          child.applied = child.applied.filter(function (id) { return id !== doseId; });
          delete child.appliedDates[doseId];
          if (child.historyUnknown.indexOf(doseId) === -1) child.historyUnknown.push(doseId);
          app.saveData();
          close();
          app.renderDetail();
          app.renderHome();
          if (window.RadarAnalytics) RadarAnalytics.track('dose_history_unconfirmed');
        };
      }

      app.openDoseHistoryModal = function (doseId, mode) {
        ensureHistoryModal();
        var info = findDose(doseId);
        var child = activeChild();
        if (!info || !child) return;
        ensureTracking(child);

        var wrap = document.getElementById('modal-dose-history');
        wrap.dataset.doseId = doseId;
        wrap.dataset.mode = mode || 'historical';
        document.getElementById('dose-history-title').textContent = mode === 'date' ? 'Registrar data da aplicação' : 'Registrar dose anterior';
        document.getElementById('dose-history-subtitle').textContent = info.dose.name + ' · ' + info.dose.doseLabel;
        document.getElementById('dose-history-date').value = child.appliedDates[doseId] || '';
        document.getElementById('dose-history-date').max = isoToday();

        var unknownBtn = document.getElementById('dose-history-unknown');
        var warning = document.getElementById('dose-history-warning');
        if (mode === 'date') {
          unknownBtn.classList.add('hidden');
          warning.textContent = 'A data é recomendada porque esta dose influencia o cálculo/aviso da dose seguinte. Se não souber, toque em “Agora não” e o Radar continuará pedindo confirmação pela caderneta.';
        } else {
          unknownBtn.classList.remove('hidden');
          warning.textContent = 'Registre somente quando houver confirmação pela caderneta, registro anterior ou informação validada pela equipe. Se não houver histórico confiável, use “Histórico não confirmado”.';
        }
        wrap.classList.remove('hidden'); wrap.classList.add('flex');
      };

      var originalRenderDetail = app.renderDetail.bind(app);
      app.renderDetail = function () {
        originalRenderDetail();
        try {
          var child = activeChild();
          if (!child) return;
          ensureTracking(child);
          var analysis = app.analisarCalendario(child);
          var cal = analysis.doses || [];

          var oldWarn = document.getElementById('rota-window-warn');
          if (oldWarn && !cal.some(function (v) { return v.status === 'window_closed'; })) oldWarn.remove();

          var groups = vaccineDatabase.filter(function (g) { return g.profileTypes.includes(child.profileType || 'crianca'); });
          var groupEls = Array.prototype.slice.call(document.getElementById('timeline-container').children);

          groups.forEach(function (group, gi) {
            var groupEl = groupEls[gi];
            if (!groupEl) return;
            var doses = cal.filter(function (v) { return v.idGroup === group.idGroup; });
            var rows = groupEl.querySelectorAll('.flex.items-center.justify-between.py-2');
            doses.forEach(function (v, di) {
              var row = rows[di];
              if (!row) return;
              var right = row.lastElementChild;
              var left = row.firstElementChild;

              if (v.status === 'window_closed' || v.status === 'history_unknown') {
                if (right) {
                  var btn = document.createElement('button');
                  btn.type = 'button';
                  btn.className = 'shrink-0 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 font-bold px-2 py-2 text-[9px]';
                  btn.textContent = v.status === 'history_unknown' ? 'Revisar histórico' : 'Registrar anterior';
                  btn.onclick = function (e) { e.stopPropagation(); app.openDoseHistoryModal(v.id, 'historical'); };
                  right.replaceWith(btn);
                }
                if (left) {
                  left.onclick = function () { app.openDoseHistoryModal(v.id, 'historical'); };
                  left.style.cursor = 'pointer';
                }
              }

              if (v.status === 'applied') {
                var dateText = child.appliedDates && child.appliedDates[v.id];
                var sub = row.querySelector('p.text-\\[10px\\]');
                if (sub && dateText && sub.textContent.indexOf('Aplicada em') === -1) {
                  sub.textContent = sub.textContent + ' · Aplicada em ' + brDate(dateText);
                } else if (sub && hasDependentDose(v.id) && !dateText) {
                  var dateBtn = document.createElement('button');
                  dateBtn.type = 'button';
                  dateBtn.className = 'text-[9px] font-bold text-amber-700 underline ml-1';
                  dateBtn.textContent = 'Adicionar data';
                  dateBtn.onclick = function (e) { e.stopPropagation(); app.openDoseHistoryModal(v.id, 'date'); };
                  sub.appendChild(document.createTextNode(' · '));
                  sub.appendChild(dateBtn);
                }
              }
            });
          });

          var unknowns = cal.filter(function (v) { return v.status === 'history_unknown'; });
          if (unknowns.length) {
            var sec = document.getElementById('sec-alert');
            var list = document.getElementById('list-alert');
            if (sec && list) {
              sec.classList.remove('hidden');
              var existing = document.getElementById('history-unknown-list');
              if (existing) existing.remove();
              var block = document.createElement('div');
              block.id = 'history-unknown-list';
              block.className = 'space-y-2 mb-3';
              block.innerHTML = unknowns.map(function (v) {
                return '<button type="button" data-dose-id="' + v.id + '" class="w-full text-left bg-amber-50 rounded-xl p-3 border border-amber-200 shadow-sm">'
                  + '<p class="text-[13px] font-bold text-amber-900">' + v.name + '</p>'
                  + '<p class="text-[10px] text-amber-700">' + v.doseLabel + ' · Histórico não confirmado — toque para revisar</p>'
                  + '</button>';
              }).join('');
              list.parentNode.insertBefore(block, list);
              Array.prototype.forEach.call(block.querySelectorAll('button[data-dose-id]'), function (b) {
                b.onclick = function () { app.openDoseHistoryModal(b.dataset.doseId, 'historical'); };
              });
            }
          } else {
            var prev = document.getElementById('history-unknown-list');
            if (prev) prev.remove();
          }

          var fichaList = document.getElementById('ficha-list-proximas');
          if (fichaList) {
            var oldFichaUnknown = document.getElementById('ficha-history-unknown');
            if (oldFichaUnknown) oldFichaUnknown.remove();
            if (unknowns.length) {
              var fichaUnknown = document.createElement('div');
              fichaUnknown.id = 'ficha-history-unknown';
              fichaUnknown.className = 'mt-2 border-t border-amber-200 pt-2';
              fichaUnknown.innerHTML = unknowns.map(function (v) {
                return '<div class="flex justify-between items-end border-b border-slate-300 print-border pb-1">'
                  + '<div><span class="font-bold text-slate-800">' + v.name + '</span> '
                  + '<span class="text-[10px] text-slate-500">(' + v.doseLabel + ')</span>'
                  + '<br><span class="text-[9px] uppercase font-bold text-amber-700">Histórico não confirmado — revisar caderneta/equipe</span></div>'
                  + '<div class="w-4 h-4 border border-slate-400 print-border rounded-sm"></div>'
                  + '</div>';
              }).join('');
              fichaList.appendChild(fichaUnknown);
            }
          }

          if (window.lucide) lucide.createIcons();
        } catch (e) {
          console.error('[Radar V2.1] Falha ao decorar histórico:', e);
        }
      };

      function blobFromCanvas(canvas, quality) {
        return new Promise(function (resolve, reject) {
          if (canvas.toBlob) {
            canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error('Falha ao gerar JPEG')); }, 'image/jpeg', quality || 0.88);
          } else {
            try {
              var data = canvas.toDataURL('image/jpeg', quality || 0.88);
              var parts = data.split(',');
              var bin = atob(parts[1]);
              var arr = new Uint8Array(bin.length);
              for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
              resolve(new Blob([arr], { type: 'image/jpeg' }));
            } catch (e) { reject(e); }
          }
        });
      }
      function sanitizeFilePart(s) {
        return String(s || 'Paciente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'Paciente';
      }
      function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      }
      async function elementToJpeg(targetEl, viewEl, filename, analyticsType) {
        if (!targetEl || !viewEl) throw new Error('Área de exportação não encontrada');
        viewEl.classList.add('exporting');
        try {
          await new Promise(function (r) { setTimeout(r, 250); });
          await ensureHtml2Pdf();
          var worker = html2pdf().set({
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }
          }).from(targetEl).toCanvas();
          var canvas = await worker.get('canvas');
          var blob = await blobFromCanvas(canvas, 0.88);
          app._lastImageExport = { blob: blob, filename: filename };
          downloadBlob(blob, filename);
          if (window.RadarAnalytics) RadarAnalytics.track('image_exported', { type: analyticsType });
          if (app.toast) {
            app.toast('Imagem JPEG salva. Ela pode conter dados pessoais.', 'Compartilhar', function () {
              app.shareImageBlob(blob, filename);
            }, 12000);
          }
          return blob;
        } finally {
          viewEl.classList.remove('exporting');
        }
      }

      app.shareImageBlob = async function (blob, filename) {
        if (!blob) return;
        if (!confirm('Esta imagem pode conter dados pessoais do paciente. Compartilhe apenas pelos canais adequados da sua equipe. Continuar?')) return;
        try {
          var file = new File([blob], filename, { type: 'image/jpeg' });
          if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
            await navigator.share({ files: [file], title: 'Radar Vacinal ACS', text: 'Exportação do Radar Vacinal ACS.' });
            if (window.RadarAnalytics) RadarAnalytics.track('image_shared');
          } else {
            downloadBlob(blob, filename);
            if (app.toast) app.toast('Seu navegador não compartilha arquivos diretamente. A imagem foi salva para você compartilhar manualmente.');
          }
        } catch (e) {
          if (e && e.name === 'AbortError') return;
          downloadBlob(blob, filename);
          if (app.toast) app.toast('Não foi possível abrir o compartilhamento. A imagem foi salva no dispositivo.');
        }
      };

      app.exportarImagemFicha = async function () {
        this.setTab('ficha');
        var child = activeChild();
        try {
          await elementToJpeg(
            document.getElementById('export-target'),
            document.getElementById('view-detail'),
            'Ficha_' + sanitizeFilePart(child && child.name) + '.jpg',
            'ficha'
          );
          app.maybeShowSuperkitPosValor();
        } catch (e) {
          console.error(e);
          alert('Erro ao gerar imagem.');
        }
      };

      app.exportarImagemBuscaAtiva = async function () {
        try {
          await elementToJpeg(
            document.getElementById('export-roteiro-target'),
            document.getElementById('view-busca-ativa'),
            'Roteiro_Busca_Ativa.jpg',
            'busca_ativa'
          );
          app.maybeShowSuperkitPosValor();
        } catch (e) {
          console.error(e);
          alert('Erro ao gerar imagem.');
        }
      };

      function addImageButtons() {
        var pdfFicha = document.querySelector('button[onclick="app.exportarFicha()"]');
        if (pdfFicha && !document.getElementById('btn-export-jpg-ficha')) {
          var btnFicha = document.createElement('button');
          btnFicha.id = 'btn-export-jpg-ficha';
          btnFicha.type = 'button';
          btnFicha.className = pdfFicha.className;
          btnFicha.innerHTML = '<span aria-hidden="true">▣</span> JPG';
          btnFicha.onclick = function () { app.exportarImagemFicha(); };
          pdfFicha.insertAdjacentElement('afterend', btnFicha);
        }

        var pdfBusca = document.querySelector('button[onclick="app.exportarBuscaAtiva()"]');
        if (pdfBusca && !document.getElementById('btn-export-jpg-busca')) {
          var btnBusca = document.createElement('button');
          btnBusca.id = 'btn-export-jpg-busca';
          btnBusca.type = 'button';
          btnBusca.className = pdfBusca.className;
          btnBusca.innerHTML = '<span aria-hidden="true">▣</span> JPG';
          btnBusca.onclick = function () { app.exportarImagemBuscaAtiva(); };
          pdfBusca.insertAdjacentElement('afterend', btnBusca);
        }
      }

      ensureHistoryModal();
      app.state.children = window.RadarEngine.migrateAll(app.state.children, window.VACCINE_CALENDAR);
      app.saveData();
      addImageButtons();
      app.renderHome();

      if (window.lucide) lucide.createIcons();
    } catch (e) {
      console.error('[Radar V2.1] Falha ao instalar aprimoramentos:', e);
    }
  });
})();
