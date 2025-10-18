'use client';

import React from 'react';

function isNight(h: number) {
  // Noche: 18:00–05:59
  return h >= 18 || h < 6;
}

export default function TimeTheme() {
  React.useEffect(() => {
    const apply = () => {
      const h = new Date().getHours();
      const root = document.documentElement; // <html>
      if (isNight(h)) {
        root.classList.add('theme-night');
      } else {
        root.classList.remove('theme-night');
      }
    };

    apply();
    const id = setInterval(apply, 5 * 60 * 1000); // cada 5 minutos
    return () => clearInterval(id);
  }, []);

  return null;
}
