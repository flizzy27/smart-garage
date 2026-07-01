export const THEME_INIT_SCRIPT = `(function () {
  try {
    var el = document.documentElement;
    // The server renders data-theme from the user's DB preference. Prefer it so
    // theme is consistent across devices; fall back to the local cache, then
    // 'system'. This runs before paint so there is no light/dark flash.
    var theme = el.getAttribute('data-theme');
    if (!theme) {
      var raw = localStorage.getItem('smart-garage-settings');
      theme = raw ? JSON.parse(raw).theme : 'system';
    }
    var dark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    el.classList.toggle('dark', dark);
  } catch (e) {}
})();`;
