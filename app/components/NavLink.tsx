"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

// ✅ export nombrado + export default (evita "is not a module")
export function NavLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-md text-sm font-medium transition",
        active ? "bg-[#2f7f72] text-white" : "text-white/90 hover:bg-white/10",
        className,
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

export default NavLink;
