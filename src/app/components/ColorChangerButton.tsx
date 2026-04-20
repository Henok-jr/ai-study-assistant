'use client';

import { useEffect, useMemo, useState } from 'react';

type ThemeName = 'zinc' | 'blue' | 'emerald' | 'rose';

const THEME_STORAGE_KEY = 'asa-theme';

function applyTheme(theme: ThemeName) {
  // Set a data attribute on <html> so CSS can react to it.
  document.documentElement.dataset.theme = theme;
}

export default function ColorChangerButton() {
  const themes: ThemeName[] = useMemo(() => ['zinc', 'blue', 'emerald', 'rose'], []);
  const [theme, setTheme] = useState<ThemeName>('zinc');

  useEffect(() => {
    const saved = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null) ?? 'zinc';
    if (themes.includes(saved)) {
      setTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme('zinc');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cycleTheme() {
    const idx = themes.indexOf(theme);
    const next = themes[(idx + 1) % themes.length];
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  }

  const label =
    theme === 'zinc'
      ? 'Theme: Zinc'
      : theme === 'blue'
        ? 'Theme: Blue'
        : theme === 'emerald'
          ? 'Theme: Emerald'
          : 'Theme: Rose';

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
      aria-label="Change color theme"
      title="Change color theme"
    >
      {label}
    </button>
  );
}
