// Apply the saved theme and motion preference before first paint, so there is no flash of the wrong theme (FR-20.2).
// External file (not inline) so the Content-Security-Policy can forbid inline scripts.
(function () {
  var prefs = {};
  try {
    prefs = JSON.parse(localStorage.getItem('notes-kanban:v1:prefs') || '{}') || {};
  } catch (e) {}
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var theme = prefs.theme === 'light' || prefs.theme === 'dark' ? prefs.theme : mq('(prefers-color-scheme: dark)') ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.reduceMotion = String(prefs.reduceMotion === true || mq('(prefers-reduced-motion: reduce)'));
})();
