(function () {
  try {
    var prefs = JSON.parse(localStorage.getItem('notes-kanban:prefs') || 'null');
    var dark = prefs && prefs.theme ? prefs.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
