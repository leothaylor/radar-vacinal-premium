/* Radar Vacinal ACS — correção visual da release 2.1.4 */
(function (root, doc) {
  'use strict';

  if (!doc) return;

  function applyVersionCardFix() {
    var versionEl = doc.getElementById('sobre-app-version');
    if (!versionEl) return;

    var appCard = versionEl.parentElement;
    var grid = appCard && appCard.parentElement;

    // Mantém o elemento legado no DOM para compatibilidade com showSobre(),
    // mas remove o card visual que exibia a constante antiga APP_VERSION=2.0.0.
    if (appCard) appCard.style.display = 'none';

    // O topo passa a mostrar apenas Base vacinal + Revisão.
    if (grid) {
      grid.classList.remove('grid-cols-3');
      grid.classList.add('grid-cols-2');
    }
  }

  applyVersionCardFix();
  doc.addEventListener('DOMContentLoaded', applyVersionCardFix);
  if (root && root.addEventListener) {
    root.addEventListener('pageshow', applyVersionCardFix);
  }
})(typeof self !== 'undefined' ? self : this, typeof document !== 'undefined' ? document : null);
