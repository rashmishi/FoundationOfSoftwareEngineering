// Runs before the app so the saved theme, text size and motion choice are applied on first paint.
(function () {
  var root = document.documentElement;
  var settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('notes-board:settings') || '{}') || {};
  } catch (e) {
    settings = {};
  }
  var theme = settings.theme;
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-text-size', settings.textSize === 'large' || settings.textSize === 'xlarge' ? settings.textSize : 'normal');
  if (settings.animations === false) root.setAttribute('data-motion', 'off');
})();
