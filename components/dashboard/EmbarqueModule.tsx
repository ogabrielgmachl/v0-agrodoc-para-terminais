"use client"

import { useState, useMemo } from "react"
import { Ship, Weight, ChevronDown, ChevronUp, Anchor } from "lucide-react"
import type { ShipsByDate } from "@/lib/load-ships"
import { formatCor, formatPol, formatUmi, formatCin, formatRi } from "@/lib/utils"

interface EmbarqueModuleProps {
  shipsByDate: ShipsByDate
  isDarkMode: boolean
  currentYear: number
  currentMonthIndex: number
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

export default function EmbarqueModule({
  shipsByDate,
  isDarkMode,
  currentYear,
  currentMonthIndex,
}: EmbarqueModuleProps) {
  const [expandedShip, setExpandedShip] = useState<string | null>(null)

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

  const shipsByDepartureDateSessions = useMemo(() => {
    const sortedDateKeys = Object.keys(filteredShipsByDate).sort((a, b) => a.localeCompare(b))

    const allDates: Array<{ date: string; ships: AggregatedShip[]; isFuture: boolean }> = []

    sortedDateKeys.forEach((dateKey) => {
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

  const formatDateHeader = (dateStr: string) => {
    const parts = dateStr.split("-")
    if (parts.length !== 3) return dateStr

    const [, , day] = parts
    const dayNum = Number.parseInt(day, 10)

    const date = new Date(dateStr)
    const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" })

    return { day: dayNum, weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1) }
  }

  const formatTonnage = (value: number) => {
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " toneladas"
  }

  const isOutOfSpec = (field: string, value: number | null): boolean => {
    if (value === null) return false
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

  const toggleExpand = (dateKey: string, shipName: string, processo: string) => {
    const uniqueKey = `${dateKey}|${shipName}|${processo}`
    setExpandedShip((prev) => (prev === uniqueKey ? null : uniqueKey))
  }

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

  const getStatusBarColor = (status: "approved" | "apurado" | "rejected") => {
    switch (status) {
      case "approved":
        return isDarkMode ? "bg-emerald-500" : "bg-emerald-500"
      case "apurado":
        return isDarkMode ? "bg-amber-500" : "bg-amber-500"
      case "rejected":
        return isDarkMode ? "bg-red-500" : "bg-red-500"
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
    <div
      className={`h-full rounded-xl border overflow-hidden flex flex-col ${
        isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"
      }`}
    >
      <div
        className={`px-4 py-3 border-b flex items-center gap-2 ${
          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-200"
        }`}
      >
        <Anchor className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-blue-600"}`} />
        <h3 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Navios</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {shipsByDepartureDateSessions.map((session) => {
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
                        className={`rounded-xl overflow-hidden border transition-all ${
                          isDarkMode
                            ? "bg-slate-800/80 border-slate-700 hover:border-slate-600"
                            : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        <button
                          onClick={() => toggleExpand(session.date, ship.name, ship.processo || "")}
                          className="w-full text-left"
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
                                      {formatTonnage(ship.totalTonnage)}
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
                                  const hasValue = metric.value !== null

                                  return (
                                    <div
                                      key={metric.label}
                                      className={`p-3 rounded-lg text-center ${
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
                                        className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${
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
                                        className={`text-sm font-bold ${
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
                                        {metric.value !== null
                                          ? metric.label === "COR"
                                            ? formatCor(metric.value)
                                            : metric.label === "RI"
                                              ? formatRi(metric.value)
                                              : metric.label === "POL"
                                                ? formatPol(metric.value)
                                                : metric.label === "UMI"
                                                  ? formatUmi(metric.value)
                                                  : metric.label === "CIN"
                                                    ? formatCin(metric.value)
                                                    : metric.value
                                          : "—"}
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
        })}

        {shipsByDepartureDateSessions.length === 0 && (
          <div
            className={`px-4 py-12 rounded-xl text-center ${
              isDarkMode ? "text-slate-500" : "text-gray-400"
            }`}
          >
            <Anchor className={`h-10 w-10 mx-auto mb-3 opacity-30`} />
            <p className="text-sm font-medium">Nenhum navio neste mês</p>
          </div>
        )}
      </div>
    </div>
  )
}
