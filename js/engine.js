/* Radar Vacinal ACS — loader de release 2.1.4 */
(function (root) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    var core = require('./engine-core.js');
    var applyPatch = require('./engine-release-patch.js');
    module.exports = applyPatch(core, null, null);
    return;
  }

  if (typeof document === 'undefined' || !document.write) {
    throw new Error('Loader do Radar sem document disponível.');
  }

  document.write('<script src="./js/engine-core.js"><\/script><script src="./js/engine-release-patch.js"><\/script><script src="./js/ui-release-fix.js"><\/script><script src="./js/pwa-analytics-diagnostic.js"><\/script>');
})(typeof self !== 'undefined' ? self : this);
