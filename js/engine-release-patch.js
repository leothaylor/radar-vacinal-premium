/*
 * Radar Vacinal ACS — patch de release v2.1.4 (2026-09-15)
 * Preserva o motor V2.1 em engine-core.js e aplica correção de fronteira etária + GA4 sanitizado.
 * V2.1.2 reforçou a atualização automática do PWA.
 * V2.1.3 adicionou verificação manual de atualização em "Sobre e dados".
 * V2.1.4 corrige a exibição da versão real no modal e no backup JSON.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory;
  } else {
    root.RadarEngine = factory(root.RadarEngine, root, typeof document !== 'undefined' ? document : null);
  }
})(typeof self !== 'undefined' ? self : this, function (core, win, doc) {
  'use strict';

  if (!core || typeof core.analisarCalendario !== 'function') {
    throw new Error('Radar Engine core não carregado.');
  }

  var RELEASE_VERSION = '2.1.4';
  var GA4_ID = 'G-1R4X13FDVY';
  var originalAnalyze = core.analisarCalendario;

  function atNoon(value) {
    var d = value instanceof Date ? new Date(value.getTime()) : new Date(value || Date.now());
    d.setHours(12, 0, 0, 0);
    return d;
  }

  function findDoseRule(calendar, doseId) {
    if (!calendar || !Array.isArray(calendar.groups)) return null;
    for (var i = 0; i < calendar.groups.length; i++) {
      var group = calendar.groups[i];
      for (var j = 0; j < group.doses.length; j++) {
        if (group.doses[j].id === doseId) return group.doses[j].rule || {};
      }
    }
    return null;
  }

  function inclusiveMonthStillOpen(child, rule, today) {
    if (!child || !child.birthDate || !rule || rule.maxMonths == null) return false;
    var closeExclusive = core.addMonths(child.birthDate, rule.maxMonths + 1);
    return atNoon(today) < atNoon(closeExclusive);
  }

  function repairWindowClosed(item, child, rule, today) {
    if (!item || item.status !== 'window_closed' || !inclusiveMonthStillOpen(child, rule, today)) return;

    if (rule.type === 'eligibility_window') {
      item.status = 'eligible';
      item.tDateStr = item.tDateStr === 'Janela encerrada' ? 'Elegível' : item.tDateStr;
      return;
    }

    if (rule.type !== 'relative_to_previous_dose') return;

    var applied = Array.isArray(child.applied) ? child.applied : [];
    if (applied.indexOf(rule.afterDoseId) === -1) {
      item.status = 'future';
      item.tDateStr = 'Após a dose anterior';
      return;
    }

    var dates = child.appliedDates && typeof child.appliedDates === 'object' ? child.appliedDates : {};
    var previousDate = dates[rule.afterDoseId];
    if (!core.validIsoDate(previousDate)) {
      item.status = 'relative_pending';
      item.tDateStr = (rule.offsetDays % 30 === 0 ? Math.round(rule.offsetDays / 30) + ' meses' : rule.offsetDays + ' dias') + ' após a dose anterior — confirme a data na caderneta';
      return;
    }

    var due = core.addDays(previousDate, rule.offsetDays || 0);
    var diff = core.getDaysDiff(due, today);
    item.daysDiff = diff;
    if (diff > 0) {
      item.status = 'future';
      item.tDateStr = 'A partir de ' + core.formatDate(due);
    } else {
      item.status = 'eligible';
      item.tDateStr = 'Elegível desde ' + core.formatDate(due);
    }
  }

  function patchedAnalyze(child, calendar, today) {
    var result = originalAnalyze(child, calendar, today);
    if (!result || !Array.isArray(result.doses)) return result;

    result.doses.forEach(function (item) {
      var rule = findDoseRule(calendar, item.id);
      if (rule && rule.maxMonths != null) repairWindowClosed(item, child, rule, today);
    });

    var profileType = child && child.profileType ? child.profileType : 'crianca';
    var special = profileType === 'gestante' || profileType === 'trabsaude';
    var hasDelayed = result.doses.some(function (d) { return d.status === 'delayed'; });
    var hasAlert = result.doses.some(function (d) {
      return d.status === 'alert' || d.status === 'eligible' || d.status === 'relative_pending' || d.status === 'history_unknown';
    });
    result.generalStatus = hasDelayed ? 'danger' : ((hasAlert || special) ? 'alert' : 'ok');
    result.requiresReview = special;
    return result;
  }

  var patched = {};
  Object.keys(core).forEach(function (key) { patched[key] = core[key]; });
  patched.analisarCalendario = patchedAnalyze;
  patched.releaseVersion = RELEASE_VERSION;

  function initGtag() {
    if (!win || !doc || win.__RADAR_GA4_214_INITIALIZED__) return;
    win.__RADAR_GA4_214_INITIALIZED__ = true;
    win.dataLayer = win.dataLayer || [];
    win.gtag = win.gtag || function () { win.dataLayer.push(arguments); };
    win.gtag('js', new Date());
    win.gtag('config', GA4_ID, { send_page_view: true, anonymize_ip: true });

    if (!doc.querySelector('script[data-radar-ga4]')) {
      var script = doc.createElement('script');
      script.async = true;
      script.setAttribute('data-radar-ga4', 'true');
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
      doc.head.appendChild(script);
    }
  }

  function hookRadarAnalytics() {
    if (!win || !doc || win.__RADAR_ANALYTICS_214_HOOKED__) return;
    try {
      if (typeof RadarAnalytics === 'undefined' || !RadarAnalytics) return;
      RadarAnalytics.track = function (event, params) {
        if (!event || typeof event !== 'string') return;
        var clean = {};
        if (params && typeof params === 'object') {
          if (params.type === 'ficha' || params.type === 'busca_ativa') clean.type = params.type;
          if (typeof params.placement === 'string' && /^(home|after_pdf|after_image|after_export|pos_valor)$/.test(params.placement)) {
            clean.placement = params.placement;
          }
        }
        win.gtag('event', event, clean);
      };
      win.RadarAnalytics = RadarAnalytics;
      win.__RADAR_ANALYTICS_214_HOOKED__ = true;
    } catch (e) {
      console.error('[Radar 2.1.4] Não foi possível acoplar o analytics:', e);
    }
  }

  function setUpdateStatus(message, state) {
    if (!doc) return;
    var el = doc.getElementById('radar-manual-update-status');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'text-xs mt-2 ' + (state === 'error' ? 'text-red-600' : state === 'ok' ? 'text-emerald-700' : 'text-slate-500');
  }

  function waitForWorker(registration) {
    return new Promise(function (resolve) {
      if (!registration) return resolve(false);

      if (registration.waiting) {
        registration.waiting.postMessage('SKIP_WAITING');
        return resolve(true);
      }

      var worker = registration.installing;
      if (!worker) return resolve(false);

      var done = false;
      function finish(value) {
        if (done) return;
        done = true;
        resolve(value);
      }

      worker.addEventListener('statechange', function () {
        if (worker.state === 'installed') {
          if (registration.waiting) registration.waiting.postMessage('SKIP_WAITING');
          finish(true);
        } else if (worker.state === 'activated') {
          finish(true);
        } else if (worker.state === 'redundant') {
          finish(false);
        }
      });

      setTimeout(function () { finish(false); }, 10000);
    });
  }

  async function manualUpdateCheck() {
    if (!win || !win.navigator || !win.navigator.serviceWorker) {
      setUpdateStatus('Este navegador não oferece atualização por Service Worker.', 'error');
      return;
    }

    var button = doc && doc.getElementById('radar-manual-update-btn');
    if (button) {
      button.disabled = true;
      button.textContent = 'Verificando...';
    }
    setUpdateStatus('Consultando a versão publicada...', 'neutral');

    try {
      var registration = await win.navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' });
      await registration.update();

      var updateFound = await waitForWorker(registration);
      if (updateFound) {
        setUpdateStatus('Atualização encontrada. Aplicando...', 'ok');
        setTimeout(function () { win.location.reload(); }, 1200);
        return;
      }

      setUpdateStatus('Você já está usando a versão mais recente disponível.', 'ok');
      if (win.RadarAnalytics && typeof win.RadarAnalytics.track === 'function') {
        win.RadarAnalytics.track('update_check');
      }
    } catch (e) {
      console.error('[Radar 2.1.4] Falha na verificação manual de atualização:', e);
      setUpdateStatus('Não foi possível verificar agora. Confirme a internet e tente novamente.', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Verificar atualização';
      }
    }
  }

  function injectManualUpdateControl() {
    if (!doc || doc.getElementById('radar-manual-update-btn')) return;
    var modal = doc.getElementById('modal-sobre');
    if (!modal) return;
    var scroller = modal.querySelector('.overflow-y-auto');
    if (!scroller) return;

    var box = doc.createElement('div');
    box.id = 'radar-manual-update-box';
    box.className = 'bg-slate-50 border border-slate-200 rounded-xl p-4';

    var title = doc.createElement('p');
    title.className = 'font-bold text-slate-800 text-sm';
    title.textContent = 'Atualizações';

    var description = doc.createElement('p');
    description.className = 'text-xs text-slate-500 mt-1';
    description.textContent = 'Se o Radar parecer desatualizado, faça uma verificação manual sem apagar seus dados.';

    var button = doc.createElement('button');
    button.type = 'button';
    button.id = 'radar-manual-update-btn';
    button.className = 'mt-3 w-full bg-slate-800 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60';
    button.textContent = 'Verificar atualização';
    button.addEventListener('click', manualUpdateCheck);

    var status = doc.createElement('p');
    status.id = 'radar-manual-update-status';
    status.className = 'text-xs text-slate-500 mt-2';
    status.textContent = 'Versão instalada: ' + RELEASE_VERSION;

    box.appendChild(title);
    box.appendChild(description);
    box.appendChild(button);
    box.appendChild(status);
    scroller.appendChild(box);
  }

  function syncDisplayedVersion() {
    if (!doc) return;
    var versionEl = doc.getElementById('sobre-app-version');
    if (versionEl) versionEl.textContent = RELEASE_VERSION;
    var statusEl = doc.getElementById('radar-manual-update-status');
    if (statusEl && /^Versão instalada:/.test(statusEl.textContent || '')) {
      statusEl.textContent = 'Versão instalada: ' + RELEASE_VERSION;
    }
  }

  function hookLegacyVersionWriters() {
    if (!win || !win.app || win.__RADAR_SHOW_SOBRE_214_HOOKED__) return;
    if (typeof win.app.showSobre === 'function') {
      var legacyShowSobre = win.app.showSobre;
      win.app.showSobre = function () {
        var result = legacyShowSobre.apply(this, arguments);
        syncDisplayedVersion();
        return result;
      };
      win.__RADAR_SHOW_SOBRE_214_HOOKED__ = true;
    }
  }

  function hookBackupExportVersion() {
    if (!win || !win.app || win.__RADAR_BACKUP_214_HOOKED__) return;
    if (typeof win.app.exportBackup !== 'function') return;

    win.app.exportBackup = function () {
      try {
        var meta = (typeof VACCINE_META !== 'undefined' && VACCINE_META) ? VACCINE_META : {};
        var payload = {
          _type: 'radar-vacinal-acs-backup',
          backupVersion: 1,
          exportedAt: new Date().toISOString(),
          appVersion: RELEASE_VERSION,
          schemaVersion: meta.schemaVersion || 2,
          vaccineDataVersion: meta.vaccineDataVersion || null,
          data: { children: win.app.state.children, profile: win.app.state.profile }
        };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = doc.createElement('a');
        a.href = url;
        a.download = 'radar-acs-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        doc.body.appendChild(a);
        a.click();
        doc.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        if (win.RadarAnalytics && typeof win.RadarAnalytics.track === 'function') win.RadarAnalytics.track('backup_exported');
      } catch (e) {
        alert('Não foi possível gerar o backup neste dispositivo.');
      }
    };
    win.__RADAR_BACKUP_214_HOOKED__ = true;
  }

  function requestServiceWorkerUpdate() {
    if (!win || !win.navigator || !win.navigator.serviceWorker) return;
    try {
      win.navigator.serviceWorker.getRegistration().then(function (registration) {
        if (!registration || typeof registration.update !== 'function') return;
        registration.update().catch(function () {});
      }).catch(function () {});
    } catch (e) {}
  }

  function finalizeReleaseRuntime() {
    initGtag();
    hookRadarAnalytics();
    injectManualUpdateControl();
    hookLegacyVersionWriters();
    hookBackupExportVersion();
    syncDisplayedVersion();
  }

  if (win && doc) {
    win.RadarManualUpdateCheck = manualUpdateCheck;
    setTimeout(finalizeReleaseRuntime, 0);
    setTimeout(requestServiceWorkerUpdate, 750);
    win.addEventListener('DOMContentLoaded', finalizeReleaseRuntime);
    win.addEventListener('load', function () {
      finalizeReleaseRuntime();
      requestServiceWorkerUpdate();
    });
    win.addEventListener('pageshow', function () {
      finalizeReleaseRuntime();
      requestServiceWorkerUpdate();
    });
    doc.addEventListener('visibilitychange', function () {
      if (!doc.hidden) {
        finalizeReleaseRuntime();
        requestServiceWorkerUpdate();
      }
    });
  }

  return patched;
});
