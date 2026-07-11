/* ============================================================
   ScoreQuest — paw loader mounter
   Fills any .paw-loader container with the six paw-print spans
   (auto on DOMContentLoaded, or SQPaw.mount(el) for containers
   created later). The prints themselves are pure CSS pixel art;
   this file only supplies the markup so callers don't repeat it.
   ============================================================ */
(function () {
  'use strict';
  function mount(el) {
    if (!el || el.childElementCount) return;
    for (var i = 0; i < 6; i++) {
      var s = document.createElement('span');
      s.className = 'paw';
      el.appendChild(s);
    }
  }
  function mountAll() {
    document.querySelectorAll('.paw-loader').forEach(mount);
  }
  window.SQPaw = { mount: mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
})();
