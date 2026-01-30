"use client"

import { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Weight, Ship, Anchor } from "lucide-react"
import type { ShipsByDate } from "@/lib/load-ships"
import { formatInteger, formatRi, formatUmi, formatCin, formatPol, formatCor, formatToneladas } from "@/lib/utils"

interface EmbarqueModuleMobileProps {
  shipsByDate: ShipsByDate
  isDarkMode: boolean
  currentYear: number
  currentMonthIndex: number
  handlePreviousMonth: () => void
  handleNextMonth: () => void
  embarqueStats?: {
    hasData: boolean
    totalShips: number
    totalTonnage: number
    qualityMetrics: {
      cor: number
      pol: number
      umi: number
      cin: number
      ri: number
    }
  }
}

interface AggregatedShip {
  name: string
  totalTonnage: number
  processCount: number
  lastDate: string
  dataPrevista: string
  destination: string
  processo: string
  avgQuality: {
    cor: number | null
    pol: number | null
    umi: number | null
    cin: number | null
    ri: number | null
  }
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

const getShipQualityStatus = (ship: AggregatedShip): "approved" | "apurado" | "rejected" => {
  const corOut = ship.avgQuality.cor !== null && ship.avgQuality.cor > 1250
  const polOut = ship.avgQuality.pol !== null && (ship.avgQuality.pol < 98.9 || ship.avgQuality.pol > 99.6)
  const umiOut = ship.avgQuality.umi !== null && ship.avgQuality.umi > 0.2
  const cinOut = ship.avgQuality.cin !== null && ship.avgQuality.cin > 0.2
  const riOut = ship.avgQuality.ri !== null && ship.avgQuality.ri > 500

  if (riOut) {
    return "rejected"
  } else if (corOut || polOut || umiOut || cinOut) {
    return "apurado"
  } else {
    return "approved"
  }
}

export default function EmbarqueModuleMobile({
  shipsByDate,
  isDarkMode,
  currentYear,
  currentMonthIndex,
  handlePreviousMonth,
  handleNextMonth,
  embarqueStats,
}: EmbarqueModuleMobileProps) {
  const [expandedShip, setExpandedShip] = useState<string | null>(null)
  const [embarqueView, setEmbarqueView] = useState<"embarques" | "summary">("embarques")

  const filteredShipsByDate = useMemo(() => {
    const monthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, "0")}`
    const filtered: ShipsByDate = {}

    Object.entries(shipsByDate).forEach(([dateKey, ships]) => {
      if (dateKey.startsWith(monthKey)) {
        filtered[dateKey] = ships
      }
    })

    return filtered
  }, [shipsByDate, currentYear, currentMonthIndex])

  const shipsByDateSessions = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sortedDateKeys = Array.from(Object.keys(filteredShipsByDate)).sort((a, b) => a.localeCompare(b))

    const allDates: Array<{ date: string; ships: AggregatedShip[]; isFuture: boolean }> = []

    sortedDateKeys.forEach((dateKey) => {
      const [year, month, day] = dateKey.split("-").map(Number)
      const dateKeyDate = new Date(year, month - 1, day)

      if (dateKeyDate > today) {
        return
      }

      const shipsForThisDate = filteredShipsByDate[dateKey]

      const shipsArray: AggregatedShip[] = shipsForThisDate.map((ship) => ({
        name: ship.navio.trim().toUpperCase(),
        totalTonnage: ship.quantidade || 0,
        processCount: 1,
        lastDate: dateKey,
        dataPrevista: ship.dataPrevista || dateKey,
        destination: ship.destino || "",
        processo: ship.processo,
        avgQuality: {
          cor: ship.cor,
          pol: ship.pol,
          umi: ship.umi,
          cin: ship.cin,
          ri: ship.ri,
        },
      }))

      allDates.push({
        date: dateKey,
        ships: shipsArray,
        isFuture: false,
      })
    })

    return allDates
  }, [filteredShipsByDate])

  const formatTonnage = (value: number) => {
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
  }

  const formatDateHeader = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === "") {
      return { day: 1, weekday: "Dom" }
    }

    const parts = dateStr.split("-")

    let year: number, month: number, day: number

    if (parts.length === 3 && parts[0].length === 4) {
      year = Number.parseInt(parts[0], 10)
      month = Number.parseInt(parts[1], 10) - 1
      day = Number.parseInt(parts[2], 10)
    } else if (parts.length === 3 && parts[2].length === 4) {
      day = Number.parseInt(parts[0], 10)
      month = Number.parseInt(parts[1], 10) - 1
      year = Number.parseInt(parts[2], 10)
    } else {
      return { day: 1, weekday: "Dom" }
    }

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return { day: 1, weekday: "Dom" }
    }

    const date = new Date(year, month, day)

    if (isNaN(date.getTime())) {
      return { day: 1, weekday: "Dom" }
    }

    const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" })

    return {
      day,
      weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    }
  }

  const formatDateFull = (dateStr: string) => {
    const parts = dateStr.split("-")
    if (parts.length !== 3) return dateStr

    const [year, month, day] = parts
    const dayNum = Number.parseInt(day, 10)
    const monthNum = Number.parseInt(month, 10) - 1

    const date = new Date(Number(year), monthNum, dayNum)
    const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" })
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)

    return `${dayNum} de ${monthNames[monthNum]} • ${capitalizedWeekday}`
  }

  const toggleExpand = (dateKey: string, shipName: string, processo: string) => {
    const uniqueKey = `${dateKey}|${shipName}|${processo || ""}`
    setExpandedShip((prev) => (prev === uniqueKey ? null : uniqueKey))
  }

  const isOutOfSpec = (field: string, value: number | null) => {
    if (value === null || value === undefined) return false
    switch (field) {
      case "cor":
        return value > 1250
      case "pol":
        return value < 98.9 || value > 99.6
      case "umi":
        return value > 0.2
      case "cin":
        return value > 0.2
      case "ri":
        return value > 500
      default:
        return false
    }
  }

  const getStatusBarColor = (status: "approved" | "apurado" | "rejected") => {
    switch (status) {
      case "approved":
        return "bg-emerald-500"
      case "apurado":
        return "bg-amber-500"
      case "rejected":
        return "bg-red-500"
    }
  }

  const getStatusText = (status: "approved" | "apurado" | "rejected") => {
    switch (status) {
      case "approved":
        return "Aprovado"
      case "apurado":
        return "Apurado"
      case "rejected":
        return "Rejeitado"
    }
  }

  return (
    <div className={`min-h-full ${isDarkMode ? "bg-slate-900" : "bg-gray-50"}`}>
      {/* Header */}
      <div
        className={`sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b ${
          isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
        }`}
      >
        <button
          onClick={handlePreviousMonth}
          disabled={currentYear === 2025 && currentMonthIndex === 11}
          className={`p-2.5 rounded-xl transition-all active:scale-95 ${
            isDarkMode ? "hover:bg-white/10 disabled:opacity-30" : "hover:bg-gray-100 disabled:opacity-30"
          }`}
        >
          <ChevronLeft className={`h-5 w-5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`} />
        </button>

        <div className="flex-1 flex flex-col items-center">
          <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {monthNames[currentMonthIndex]} {currentYear}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setEmbarqueView("embarques")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                embarqueView === "embarques"
                  ? isDarkMode
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-blue-100 text-blue-700 border border-blue-300"
                  : isDarkMode
                    ? "text-gray-400 hover:text-gray-300"
                    : "text-gray-500 hover:text-gray-600"
              }`}
            >
              Embarques
            </button>
            <button
              onClick={() => setEmbarqueView("summary")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                embarqueView === "summary"
                  ? isDarkMode
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-blue-100 text-blue-700 border border-blue-300"
                  : isDarkMode
                    ? "text-gray-400 hover:text-gray-300"
                    : "text-gray-500 hover:text-gray-600"
              }`}
            >
              Resumo
            </button>
          </div>
        </div>

        <button
          onClick={handleNextMonth}
          className={`p-2.5 rounded-xl transition-all active:scale-95 ${
            isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
          }`}
        >
          <ChevronRight className={`h-5 w-5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`} />
        </button>
      </div>

      {embarqueView === "summary" ? (
        // ====== RESUMO DO MÊS ======
        <div className={`flex-1 overflow-y-auto ${isDarkMode ? "bg-slate-900" : "bg-gray-50"}`}>
          <div className="p-4 space-y-4">
            {/* Card - Total de Navios */}
            <div
              className={`rounded-2xl p-4 border-2 ${
                isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Total de Navios
              </p>
              <p className={`text-4xl font-bold ${isDarkMode ? "text-emerald-400" : "text-blue-600"}`}>
                {embarqueStats?.hasData ? formatInteger(embarqueStats.totalShips) : "0"}
              </p>
            </div>

            {/* Card - Total de Toneladas */}
            <div
              className={`rounded-2xl p-4 border-2 ${
                isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Total de Toneladas
              </p>
              <p className={`text-4xl font-bold ${isDarkMode ? "text-emerald-400" : "text-blue-600"}`}>
                {embarqueStats?.hasData ? formatToneladas(embarqueStats.totalTonnage) : "—"}
              </p>
            </div>

            {/* Cards - Média Geral */}
            {embarqueStats?.hasData && (
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-3 px-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Média Geral
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "RI", value: embarqueStats.qualityMetrics.ri, formatter: formatRi },
                    { label: "UMI", value: embarqueStats.qualityMetrics.umi, formatter: formatUmi },
                    { label: "CIN", value: embarqueStats.qualityMetrics.cin, formatter: formatCin },
                    { label: "POL", value: embarqueStats.qualityMetrics.pol, formatter: formatPol },
                    { label: "COR", value: embarqueStats.qualityMetrics.cor, formatter: formatCor },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className={`p-3 rounded-xl border ${
                        isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"
                      }`}
                    >
                      <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {metric.label}
                      </p>
                      <p className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {metric.formatter(metric.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ====== LISTA DE EMBARQUES ======
        <div className={`flex-1 overflow-y-auto p-4 ${isDarkMode ? "bg-slate-900" : "bg-gray-50"}`}>
          {shipsByDateSessions.length === 0 ? (
            <div
              className={`px-4 py-12 rounded-xl text-center ${
                isDarkMode ? "text-slate-500" : "text-gray-400"
              }`}
            >
              <Anchor className={`h-10 w-10 mx-auto mb-3 opacity-30`} />
              <p className="text-sm font-medium">Nenhum navio neste mês</p>
            </div>
          ) : (
            shipsByDateSessions.map((session) => {
              const { day, weekday } = formatDateHeader(session.date)
              const hasShips = session.ships.length > 0

              return (
                <div key={session.date} className="mb-5 last:mb-0">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {day}
                      </span>
                      <span className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                        {weekday}
                      </span>
                    </div>
                    <div className={`flex-1 h-px ${isDarkMode ? "bg-slate-700" : "bg-gray-200"}`} />
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        hasShips
                          ? isDarkMode
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-blue-50 text-blue-600"
                          : isDarkMode
                            ? "bg-slate-700 text-slate-500"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Ship className="h-3 w-3" />
                      <span>{session.ships.length}</span>
                    </div>
                  </div>

                  {hasShips ? (
                    <div className="space-y-3">
                      {session.ships.map((ship) => {
                        const uniqueKey = `${session.date}|${ship.name}|${ship.processo || ""}`
                        const isExpanded = expandedShip === uniqueKey
                        const status = getShipQualityStatus(ship)

                        return (
                          <div
                            key={uniqueKey}
                            className={`rounded-2xl overflow-hidden border transition-all ${
                              isDarkMode
                                ? "bg-slate-800 border-slate-700"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <button
                              onClick={() => toggleExpand(session.date, ship.name, ship.processo || "")}
                              className="w-full text-left active:scale-[0.99] transition-transform"
                            >
                              <div className="flex">
                                {/* Status Bar */}
                                <div className={`w-1.5 ${getStatusBarColor(status)}`} />
                                
                                {/* Content */}
                                <div className="flex-1 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      {/* Ship Name */}
                                      <h4 className={`font-bold text-base truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                        {ship.name}
                                      </h4>
                                      
                                      {/* Tonnage */}
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <Weight className={`h-4 w-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
                                        <span className={`text-lg font-bold ${isDarkMode ? "text-emerald-400" : "text-blue-600"}`}>
                                          {formatTonnage(ship.totalTonnage)} toneladas
                                        </span>
                                      </div>

                                      {/* Date */}
                                      <p className={`text-xs mt-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                                        {formatDateFull(session.date)}
                                      </p>
                                    </div>

                                    {/* Expand Icon */}
                                    <div className={`p-2 rounded-lg ${isDarkMode ? "bg-slate-700/50" : "bg-gray-50"}`}>
                                      {isExpanded ? (
                                        <ChevronUp className={`h-4 w-4 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`} />
                                      ) : (
                                        <ChevronDown className={`h-4 w-4 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`} />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className={`border-t ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
                                <div className="p-4">
                                  {/* Status Badge */}
                                  <div className="flex items-center justify-between mb-4">
                                    <span className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                                      Média de Qualidade
                                    </span>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                      status === "approved"
                                        ? isDarkMode
                                          ? "bg-emerald-500/20 text-emerald-400"
                                          : "bg-emerald-100 text-emerald-700"
                                        : status === "apurado"
                                          ? isDarkMode
                                            ? "bg-amber-500/20 text-amber-400"
                                            : "bg-amber-100 text-amber-700"
                                          : isDarkMode
                                            ? "bg-red-500/20 text-red-400"
                                            : "bg-red-100 text-red-700"
                                    }`}>
                                      {getStatusText(status)}
                                    </span>
                                  </div>

                                  {/* Quality Metrics */}
                                  <div className="grid grid-cols-5 gap-2">
                                    {[
                                      { label: "COR", value: ship.avgQuality.cor, field: "cor" },
                                      { label: "POL", value: ship.avgQuality.pol, field: "pol" },
                                      { label: "UMI", value: ship.avgQuality.umi, field: "umi" },
                                      { label: "CIN", value: ship.avgQuality.cin, field: "cin" },
                                      { label: "RI", value: ship.avgQuality.ri, field: "ri" },
                                    ].map((metric) => {
                                      const outOfSpec = isOutOfSpec(metric.field, metric.value)
                                      const hasValue = metric.value !== null && metric.value !== undefined
                                      const displayValue =
                                        !hasValue
                                          ? "-"
                                          : metric.label === "COR" || metric.label === "RI"
                                            ? Math.round(metric.value).toLocaleString("pt-BR")
                                            : metric.value.toFixed(2).replace(".", ",")

                                      return (
                                        <div
                                          key={metric.label}
                                          className={`p-2 rounded-lg text-center ${
                                            !hasValue
                                              ? isDarkMode
                                                ? "bg-slate-700/50"
                                                : "bg-gray-50"
                                              : outOfSpec
                                                ? isDarkMode
                                                  ? "bg-red-500/15 border border-red-500/30"
                                                  : "bg-red-50 border border-red-200"
                                                : isDarkMode
                                                  ? "bg-emerald-500/15 border border-emerald-500/30"
                                                  : "bg-emerald-50 border border-emerald-200"
                                          }`}
                                        >
                                          <p
                                            className={`text-[9px] font-bold uppercase tracking-wide ${
                                              !hasValue
                                                ? isDarkMode
                                                  ? "text-slate-500"
                                                  : "text-gray-400"
                                                : outOfSpec
                                                  ? isDarkMode
                                                    ? "text-red-400"
                                                    : "text-red-600"
                                                  : isDarkMode
                                                    ? "text-emerald-400"
                                                    : "text-emerald-600"
                                            }`}
                                          >
                                            {metric.label}
                                          </p>
                                          <p
                                            className={`mt-0.5 text-xs font-semibold tabular-nums ${
                                              !hasValue
                                                ? isDarkMode
                                                  ? "text-slate-500"
                                                  : "text-gray-400"
                                                : outOfSpec
                                                  ? isDarkMode
                                                    ? "text-red-300"
                                                    : "text-red-700"
                                                  : isDarkMode
                                                    ? "text-emerald-300"
                                                    : "text-emerald-700"
                                            }`}
                                          >
                                            {displayValue}
                                          </p>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div
                      className={`px-4 py-6 rounded-xl text-center border-2 border-dashed ${
                        isDarkMode ? "border-slate-700 text-slate-500" : "border-gray-200 text-gray-400"
                      }`}
                    >
                      <Ship className={`h-6 w-6 mx-auto mb-2 opacity-40`} />
                      <p className="text-sm font-medium">Nenhum embarque</p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
