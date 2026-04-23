export function detectTheme(): 'light' | 'dark' {
  const root = document.documentElement;
  if (root.classList.contains('dark')) return 'dark';
  if (root.classList.contains('light')) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function onThemeChange(fn: (t: 'light' | 'dark') => void): () => void {
  const obs = new MutationObserver(() => fn(detectTheme()));
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const mqlListener = () => fn(detectTheme());
  mql.addEventListener('change', mqlListener);
  return () => {
    obs.disconnect();
    mql.removeEventListener('change', mqlListener);
  };
}
