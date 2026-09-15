/*
 * Radar Vacinal ACS — patch de release v2.1.2 (2026-09-15)
 * Preserva o motor V2.1 em engine-core.js e aplica correção de fronteira etária + GA4 sanitizado.
 * V2.1.2 reforça a atualização do PWA instalado com checagem explícita do service worker.
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

  var RELEASE_VERSION = '2.1.2';
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
    if (!win || !doc || win.__RADAR_GA4_212_INITIALIZED__) return;
    win.__RADAR_GA4_212_INITIALIZED__ = true;
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
    if (!win || !doc || win.__RADAR_ANALYTICS_212_HOOKED__) return;
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
      win.__RADAR_ANALYTICS_212_HOOKED__ = true;
    } catch (e) {
      console.error('[Radar 2.1.2] Não foi possível acoplar o analytics:', e);
    }
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
    var versionEl = doc && doc.getElementById('sobre-app-version');
    if (versionEl) versionEl.textContent = RELEASE_VERSION;
  }

  if (win && doc) {
    setTimeout(finalizeReleaseRuntime, 0);
    setTimeout(requestServiceWorkerUpdate, 750);
    win.addEventListener('DOMContentLoaded', finalizeReleaseRuntime);
    win.addEventListener('load', function () {
      finalizeReleaseRuntime();
      requestServiceWorkerUpdate();
    });
    win.addEventListener('pageshow', requestServiceWorkerUpdate);
    doc.addEventListener('visibilitychange', function () {
      if (!doc.hidden) requestServiceWorkerUpdate();
    });
  }

  return patched;
});
