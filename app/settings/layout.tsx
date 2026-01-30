import type React from "react"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  // Layout simples para garantir altura mínima e evitar travas de rolagem em páginas /settings/*
  return <div className="min-h-screen w-full overflow-x-hidden">{children}</div>
}
