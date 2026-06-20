export const THEME_INIT_SCRIPT = `(function () {
  try {
    var raw = localStorage.getItem('smart-garage-settings');
    var theme = raw ? JSON.parse(raw).theme : 'system';
    var dark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();`;
