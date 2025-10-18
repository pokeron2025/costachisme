'use client';

import Link from 'next/link';
import React from 'react';

export default function SiteHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b bg-[var(--header-bg)]/85 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        {/* Marca */}
        <Link href="/" className="flex items-center gap-2">
          {/* Logo simple inline (puedes reemplazar por /logo.svg si ya lo tienes) */}
          <svg width="24" height="24" viewBox="0 0 256 256" aria-hidden="true">
            <rect x="0" y="0" width="256" height="256" rx="56" fill="currentColor" />
            <path d="M44 104C72 128 120 128 148 104S224 80 212 116"
              stroke="#fff" strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M44 152C72 128 120 128 148 152S224 176 212 140"
              stroke="#fff" strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="196" cy="64" r="10" fill="#fff"/>
          </svg>
          <span className="font-semibold tracking-tight text-[var(--header-fg)]">
            Costachisme <span className="opacity-70">· Salina Cruz</span>
          </span>
        </Link>

        {/* (Opcional) Espacio para un menú futuro */}
        <nav className="hidden sm:flex items-center gap-3 text-sm text-[var(--header-fg)]/80">
          {/* <Link href="/acerca" className="hover:underline">Acerca</Link> */}
        </nav>
      </div>
    </header>
  );
}
