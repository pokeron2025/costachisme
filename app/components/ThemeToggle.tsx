'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const pref = localStorage.getItem('theme');
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = pref ? pref === 'dark' : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  if (!mounted) return null;

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="btn bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/20"
      aria-label="Cambiar tema"
      title="Cambiar tema"
    >
      {dark ? (
        /* Sol */
        <svg width="18" height="18" viewBox="0 0 24 24" className="fill-yellow-400"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zM1 13h3v-2H1v2zm10-9h2V1h-2v3zm7.04.46l1.79-1.8-1.41-1.41-1.8 1.79 1.42 1.42zM17 13h3v-2h-3v2zm-5 8h2v-3h-2v3zm6.24-1.84l1.8 1.79 1.41-1.41-1.79-1.8-1.42 1.42zM4.22 18.36l-1.79 1.8 1.41 1.41 1.8-1.79-1.42-1.42zM12 6a6 6 0 100 12 6 6 0 000-12z"/></svg>
      ) : (
        /* Luna */
        <svg width="18" height="18" viewBox="0 0 24 24" className="fill-slate-700 dark:fill-slate-200"><path d="M12 2a9.99 9.99 0 00-9.95 9.09A10 10 0 1012 2zm0 18a8 8 0 01-7.75-9.8 8.98 8.98 0 008.55 8.55c-.26.02-.52.03-.8.03z"/></svg>
      )}
      <span className="text-sm">{dark ? 'Claro' : 'Oscuro'}</span>
    </button>
  );
}
