"use client"

import { X, TruckIcon, Ship, Droplets, Wheat, Weight, Activity, Settings, LogOut } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface SidebarMenuMobileProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode: boolean
  currentModule: "recepcao" | "embarque"
  currentProduct: "acucar" | "soja" | "milho"
  setCurrentModule: (module: "recepcao" | "embarque") => void
  setCurrentProduct: (product: "acucar" | "soja" | "milho") => void
  monthStats: {
    totalTrucks: number
    totalTonnage: number
    hasData: boolean
    qualityMetrics: {
      cor: number
      pol: number
      umi: number // Trocado "um" por "umi"
      cin: number
      ri: number
    }
  }
  formatInteger: (value: number | null) => string
  formatRi: (value: number | null) => string
  formatUmi: (value: number | null) => string
  formatCin: (value: number | null) => string
  formatPol: (value: number | null) => string
  formatCor: (value: number | null) => string
  username?: string
}

export function SidebarMenuMobile({
  isOpen,
  onClose,
  isDarkMode,
  currentModule,
  currentProduct,
  setCurrentModule,
  setCurrentProduct,
  monthStats,
  formatInteger,
  formatRi,
  formatUmi,
  formatCin,
  formatPol,
  formatCor,
  username,
}: SidebarMenuMobileProps) {
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  const productNames: Record<"acucar" | "soja" | "milho", string> = {
    acucar: "Açúcar",
    soja: "Soja",
    milho: "Milho",
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[9999] transition-opacity" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        className={`fixed top-0 left-0 h-[100dvh] w-full z-[9999] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isDarkMode ? "bg-[#050816]" : "bg-white"}`}
      >
        <div className="flex flex-col h-full">
          {/* Header com logo e botão fechar */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
          >
            <div className="flex items-center gap-2">
              <Image
                src="/images/agrodoc-icon.png"
                alt="AGRODOC"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <span className={`text-base font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>AGRODOC</span>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-md ${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              aria-label="Fechar menu"
            >
              <X className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Seção NAVEGAÇÃO */}
              <div>
                <div className={`text-xs font-bold mb-3 px-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  NAVEGAÇÃO
                </div>

                <div className="space-y-3">
                  {/* Módulo */}
                  <div className={`rounded-lg p-3 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                    <p
                      className={`text-[10px] font-semibold mb-2 px-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                    >
                      MÓDULO
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCurrentModule("recepcao")
                          onClose()
                        }}
                        className={`flex-1 flex flex-col items-center justify-center rounded-md p-3 transition-colors ${
                          currentModule === "recepcao"
                            ? isDarkMode
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-blue-500 text-white"
                            : isDarkMode
                              ? "bg-white/5 text-gray-400 hover:bg-white/10"
                              : "bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                        title="Recepção"
                      >
                        <TruckIcon className="h-5 w-5 mb-1" />
                        <span className="text-xs font-medium">Recepção</span>
                      </button>
                      <button
                        onClick={() => {
                          setCurrentModule("embarque")
                          setCurrentProduct("acucar") // Embarque só tem açúcar por enquanto
                          onClose()
                        }}
                        className={`flex-1 flex flex-col items-center justify-center rounded-md p-3 transition-colors ${
                          currentModule === "embarque"
                            ? isDarkMode
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-blue-500 text-white"
                            : isDarkMode
                              ? "bg-white/5 text-gray-400 hover:bg-white/10"
                              : "bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                        title="Embarque"
                      >
                        <Ship className="h-5 w-5 mb-1" />
                        <span className="text-xs font-medium">Embarque</span>
                      </button>
                    </div>
                  </div>

                  {/* Produto */}
                  <div className={`rounded-lg p-3 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                    <p
                      className={`text-[10px] font-semibold mb-2 px-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                    >
                      PRODUTO
                    </p>
                    <div className={`grid ${currentModule === "recepcao" ? "grid-cols-3" : "grid-cols-1"} gap-2`}>
                      <button
                        onClick={() => {
                          setCurrentProduct("acucar")
                          onClose()
                        }}
                        className={`flex flex-col items-center justify-center rounded-md p-2 transition-colors ${
                          currentProduct === "acucar"
                            ? isDarkMode
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-blue-500 text-white"
                            : isDarkMode
                              ? "bg-white/5 text-gray-400 hover:bg-white/10"
                              : "bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                        title="Açúcar"
                      >
                        <Droplets className="h-4 w-4 mb-1" />
                        <span className="text-[10px] font-medium">Açúcar</span>
                      </button>
                      {currentModule === "recepcao" && (
                        <>
                          <button
                            disabled
                            className={`flex flex-col items-center justify-center rounded-md p-2 opacity-40 cursor-not-allowed ${
                              isDarkMode ? "bg-white/5 text-gray-500" : "bg-white text-gray-400"
                            }`}
                            title="Soja (em breve)"
                          >
                            <Wheat className="h-4 w-4 mb-1" />
                            <span className="text-[10px] font-medium">Soja</span>
                          </button>
                          <button
                            disabled
                            className={`flex flex-col items-center justify-center rounded-md p-2 opacity-40 cursor-not-allowed ${
                              isDarkMode ? "bg-white/5 text-gray-500" : "bg-white text-gray-400"
                            }`}
                            title="Milho (em breve)"
                          >
                            <Wheat className="h-4 w-4 mb-1" />
                            <span className="text-[10px] font-medium">Milho</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="pt-4 border-t"
                style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
              >
                <h3 className={`text-lg font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
                  {currentModule === "recepcao"
                    ? `Recepção de ${productNames[currentProduct]}`
                    : `Embarque de ${productNames[currentProduct]}`}
                </h3>
              </div>

              <div className="space-y-3">
                <div className={`rounded-xl p-4 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TruckIcon className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-blue-600"}`} />
                    <span className={`text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      ENTRADAS
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {monthStats.hasData ? formatInteger(monthStats.totalTrucks) : "-"}
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>caminhões</p>
                </div>

                <div className={`rounded-xl p-4 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Weight className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-green-600"}`} />
                    <span className={`text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      TONELADAS
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {monthStats.hasData ? formatInteger(monthStats.totalTonnage) : "-"}
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>toneladas</p>
                </div>

                <div className={`rounded-xl p-4 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-amber-600"}`} />
                    <span className={`text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      MÉDIA GERAL
                    </span>
                  </div>
                  {monthStats.hasData ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`col-span-2 rounded-lg p-2.5 ${isDarkMode ? "bg-white/5" : "bg-white"}`}>
                        <p className={`text-[10px] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>RI</p>
                        <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {formatRi(monthStats.qualityMetrics?.ri ?? 0)}
                        </p>
                      </div>
                      <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-white/5" : "bg-white"}`}>
                        <p className={`text-[10px] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>UMI</p>
                        <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {formatUmi(monthStats.qualityMetrics?.umi ?? 0)}
                        </p>
                      </div>
                      <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-white/5" : "bg-white"}`}>
                        <p className={`text-[10px] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>CIN</p>
                        <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {formatCin(monthStats.qualityMetrics?.cin ?? 0)}
                        </p>
                      </div>
                      <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-white/5" : "bg-white"}`}>
                        <p className={`text-[10px] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>POL</p>
                        <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {formatPol(monthStats.qualityMetrics?.pol ?? 0)}
                        </p>
                      </div>
                      <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-white/5" : "bg-white"}`}>
                        <p className={`text-[10px] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>COR</p>
                        <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {formatCor(monthStats.qualityMetrics?.cor ?? 0)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>Sem dados</p>
                  )}
                </div>
            </div>
          </div>
        </div>

        {/* Footer com dados do usuário e opções */}
        <div
          className={`flex-shrink-0 border-t p-4 space-y-3 ${
            isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
          }`}
        >
          {/* User Profile Card */}
          <div
            className={`flex items-center gap-3 rounded-lg p-3 ${
              isDarkMode ? "bg-white/5" : "bg-white"
            }`}
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgb(16, 185, 129), rgb(5, 150, 105))",
              }}
            >
              <span className="text-xs font-bold text-white">
                {username ? username.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {username || "Usuário"}
              </p>
              <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Usuário
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Link
              href="/settings/account"
              onClick={onClose}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                isDarkMode
                  ? "hover:bg-white/10 text-gray-300 hover:text-white"
                  : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Meus Dados</span>
            </Link>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                isDarkMode
                  ? "hover:bg-red-500/10 text-gray-300 hover:text-red-400"
                  : "hover:bg-red-50 text-gray-700 hover:text-red-600"
              }`}
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  )
}
