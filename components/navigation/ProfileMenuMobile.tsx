"use client"

import { X, Sun, Moon, LogOut, User } from "lucide-react"
import Link from "next/link"

interface ProfileMenuMobileProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode: boolean
  onToggleTheme: () => void
  onLogout: () => void
}

export function ProfileMenuMobile({ isOpen, onClose, isDarkMode, onToggleTheme, onLogout }: ProfileMenuMobileProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[9998] transition-opacity" onClick={onClose} />

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[9999] rounded-t-2xl shadow-2xl transition-transform duration-300 ${
          isDarkMode ? "bg-[#0a0f1e]" : "bg-white"
        }`}
        style={{ maxHeight: "75vh" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className={`w-10 h-1 rounded-full ${isDarkMode ? "bg-gray-600" : "bg-gray-300"}`} />
        </div>

        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 pb-3 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
        >
          <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Menu</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${isDarkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-2">
          {/* Meus dados */}
          <Link
            href="/settings/account"
            onClick={onClose}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isDarkMode ? "hover:bg-gray-800 text-gray-200" : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="font-medium">Meus dados</span>
          </Link>

          {/* Toggle Tema */}
          <button
            onClick={() => {
              onToggleTheme()
              onClose()
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isDarkMode ? "hover:bg-gray-800 text-gray-200" : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            <span className="font-medium">{isDarkMode ? "Tema Claro" : "Tema Escuro"}</span>
          </button>

          {/* Sair */}
          <button
            onClick={() => {
              onLogout()
              onClose()
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isDarkMode ? "hover:bg-red-500/10 text-red-400" : "hover:bg-red-50 text-red-600"
            }`}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>

        {/* Safe area padding for devices with home indicator */}
        <div className="h-6" />
      </div>
    </>
  )
}
