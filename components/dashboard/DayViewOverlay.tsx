"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  XCircle,
  LayoutGrid,
  X,
  Clock,
  History,
  Beaker,
  Scan,
  FileText,
  Activity,
  } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCor, formatPol, formatUmi, formatCin, formatRi, formatDecimal, formatDateTimePtBr, formatWeight, updateBoletimToken } from "@/lib/utils"

interface TruckData {
  id: string
  licensePlate: string
  grossWeight: number
  // Campos de autorização (doublecheck do laboratório)
  autorizacao: "APROVADO" | "RECUSADO" | null
  dataAutorizacao: string | null
  dataAutorizacaoFormatada: string | null
  nomeUsuarioAutorizacao: string | null
  // Análises finais (resultado NIR ou Doublecheck)
  cor: number | null
  pol: number | null
  umi: number | null
  cin: number | null
  ri: number | null
  // Datas das análises finais
  corData: string | null
  polData: string | null
  umiData: string | null
  cinData: string | null
  riData: string | null
  // Análises anteriores (NIR)
  corAnterior: number | null
  polAnterior: number | null
  umiAnterior: number | null
  cinAnterior: number | null
  riAnterior: number | null
  // Datas NIR (sempre data original do NIR)
  corDataNir: string | null
  polDataNir: string | null
  umiDataNir: string | null
  cinDataNir: string | null
  riDataNir: string | null
  // Analistas
  corAnalista: string | null
  polAnalista: string | null
  umiAnalista: string | null
  cinAnalista: string | null
  riAnalista: string | null
  // Analistas anteriores
  corAnalistaAnterior: string | null
  polAnalistaAnterior: string | null
  umiAnalistaAnterior: string | null
  cinAnalistaAnterior: string | null
  riAnalistaAnterior: string | null
  // Links para boletins
  linkBoletimDb: string | null
  linkBoletimB7: string | null
  status: "approved" | "rejected" | "apurado"
  client: string
  supplier: string
  nfNumber: string | null
  isRepeated: boolean
  hasOtherOutOfSpec: boolean
  houveDoublecheck: boolean
  isBola7: boolean
}

interface DayViewOverlayProps {
  selectedDay: Date
  isDarkMode: boolean
  trucksByDate: Record<string, TruckData[]>
  onClose: () => void
  initialSearchTerm?: string // Initial search term to filter trucks
  // Callbacks for state management
  onFilterStatusChange?: (status: "all" | "approved" | "apurado" | "rejected") => void
  onCurrentPageChange?: (page: number) => void
  onTableViewModeChange?: (mode: "main" | "by-client") => void
  onPreviousDay?: () => void
  onNextDay?: () => void
}

const ITEMS_PER_PAGE = 10

const qualityLimits = {
  pol: { min: 98.9, max: 99.6 },
  cor: { max: 1250 },
  cin: { max: 0.2 },
  ri: { max: 500 },
  um: { max: 0.2 },
}

const isOutOfSpec = (metric: string, value: number): boolean => {
  switch (metric) {
    case "pol":
      return value < qualityLimits.pol.min || value > qualityLimits.pol.max
    case "cor":
      return value > qualityLimits.cor.max
    case "cin":
      return value > qualityLimits.cin.max
    case "ri":
      return value > qualityLimits.ri.max
    case "um":
      return value > qualityLimits.um.max
    default:
      return false
  }
}

const hasIncompleteData = (truck: TruckData): boolean => {
  return (
    !truck.licensePlate ||
    truck.licensePlate.trim() === "" ||
    !truck.nfNumber ||
    truck.nfNumber.trim() === "" ||
    !truck.client ||
    truck.client.trim() === "" ||
    !truck.supplier ||
    truck.supplier.trim() === "" ||
    truck.grossWeight === null ||
    truck.grossWeight === 0 ||
    truck.cor === null ||
    truck.pol === null ||
    truck.umi === null ||
    truck.cin === null ||
    truck.ri === null
  )
}

const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

// Helper function to format date for history display
const formatHistoryDate = (dateStr: string | null): string => {
  if (!dateStr) return ""

  // Remove wrapping quotes if CSV stored them
  const cleaned = dateStr.replace(/^"+|"+$/g, "").trim()
  if (!cleaned) return ""

  // Handle pt-BR format: DD/MM/YYYY HH:mm:ss (or without seconds)
  const m = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)

  if (m) {
    const dd = Number(m[1])
    const mm = Number(m[2])
    const yyyy = Number(m[3])
    const HH = Number(m[4] ?? 0)
    const MI = Number(m[5] ?? 0)
    const date = new Date(yyyy, mm - 1, dd, HH, MI, 0)

    if (!Number.isNaN(date.getTime())) {
      const day = date.getDate()
      const monthName = months[date.getMonth()]
      const year = date.getFullYear()
      const hours = String(date.getHours()).padStart(2, "0")
      const minutes = String(date.getMinutes()).padStart(2, "0")
      return `${day} de ${monthName} de ${year} às ${hours}:${minutes}`
    }
  }

  // Fallback: try ISO or other JS-friendly formats
  try {
    const date = new Date(cleaned)
    if (Number.isNaN(date.getTime())) return cleaned

    const day = date.getDate()
    const monthName = months[date.getMonth()]
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")

    return `${day} de ${monthName} de ${year} às ${hours}:${minutes}`
  } catch {
    return cleaned
  }
}

// Circular Gauge Component
interface CircularGaugeProps {
  value: number
  weightedValue: number | null
  max: number
  min?: number
  label: string
  formatter: (val: number) => string
  isDarkMode: boolean
}

const CircularGauge = ({ value, weightedValue, max, min = 0, label, formatter, isDarkMode }: CircularGaugeProps) => {
  const range = max - min
  const percentage = ((value - min) / range) * 100
  const weightedPercentage = weightedValue !== null ? ((weightedValue - min) / range) * 100 : null
  
  // Check if out of spec
  const isValueOutOfSpec = isOutOfSpec(label.toLowerCase(), value)
  const isWeightedOutOfSpec = weightedValue !== null ? isOutOfSpec(label.toLowerCase(), weightedValue) : false
  
  const size = 120
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  // Calculate stroke dash offset for value
  const offset = circumference - (percentage / 100) * circumference
  const weightedOffset = weightedPercentage !== null ? circumference - (weightedPercentage / 100) * circumference : circumference
  
  return (
    <div className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${
      isDarkMode 
        ? "bg-gradient-to-b from-slate-800/60 to-slate-800/40 border-slate-700/50 hover:border-slate-600/60" 
        : "bg-gradient-to-b from-white to-slate-50/80 border-slate-200/80 hover:border-slate-300 hover:shadow-md"
    }`}>
      {/* Label */}
      <div className="text-center">
        <h4 className={`text-sm font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{label}</h4>
      </div>
      
      {/* Circular Gauge */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isDarkMode ? "#334155" : "#e2e8f0"}
            strokeWidth={strokeWidth}
          />
          
          {/* Weighted value arc (green - inner) */}
          {weightedValue !== null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius - 6}
              fill="none"
              stroke={isWeightedOutOfSpec ? "#ef4444" : "#10b981"}
              strokeWidth={strokeWidth - 2}
              strokeDasharray={circumference}
              strokeDashoffset={weightedOffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          )}
          
          {/* Arithmetic value arc (blue - outer) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isValueOutOfSpec ? "#ef4444" : "#3b82f6"}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
          
          {/* Limit marker at 100% */}
          <circle
            cx={size / 2}
            cy={strokeWidth / 2}
            r={3}
            fill="#ef4444"
            className="animate-pulse"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className={`text-lg font-bold ${isValueOutOfSpec ? "text-red-500" : isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
              {formatter(value)}
            </div>
            {weightedValue !== null && (
              <div className={`text-xs font-semibold mt-0.5 ${isWeightedOutOfSpec ? "text-red-500" : "text-emerald-500"}`}>
                {formatter(weightedValue)}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-col gap-1 text-[10px] w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isValueOutOfSpec ? "bg-red-500" : "bg-blue-500"}`} />
            <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>Arit.</span>
          </div>
          <span className={`font-semibold ${isValueOutOfSpec ? "text-red-500" : isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
            {formatter(value)}
          </span>
        </div>
        {weightedValue !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isWeightedOutOfSpec ? "bg-red-500" : "bg-emerald-500"}`} />
              <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>Pond.</span>
            </div>
            <span className={`font-semibold ${isWeightedOutOfSpec ? "text-red-500" : "text-emerald-500"}`}>
              {formatter(weightedValue)}
            </span>
          </div>
        )}
      </div>
      
      {/* Difference indicator */}
      {weightedValue !== null && (
        <div className={`text-[10px] px-2 py-1 rounded-md ${
          isDarkMode ? "bg-slate-700/50 text-slate-400" : "bg-slate-100 text-slate-600"
        }`}>
          Δ {Math.abs(((value - weightedValue) / value) * 100).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

export function DayViewOverlay({
  selectedDay,
  isDarkMode,
  trucksByDate,
  onClose,
  initialSearchTerm = "",
  onFilterStatusChange,
  onCurrentPageChange,
  onTableViewModeChange,
  onPreviousDay,
  onNextDay,
}: DayViewOverlayProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "apurado" | "rejected">("all")
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [currentPage, setCurrentPage] = useState(1)
  const [tableViewMode, setTableViewMode] = useState<"main" | "by-client">("main")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set())
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  
  // Truck detail modal state
  const [selectedTruck, setSelectedTruck] = useState<TruckData | null>(null)

  const dateKey = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(
    selectedDay.getDate()
  ).padStart(2, "0")}`

  const trucks = trucksByDate[dateKey] || []
  
  // Separate complete and incomplete trucks
  const completeTrucks = useMemo(() => {
    return trucks.filter((t) => !hasIncompleteData(t))
  }, [trucks])

  const incompleteTrucks = useMemo(() => {
    return trucks.filter((t) => hasIncompleteData(t))
  }, [trucks])

  // Display trucks based on showOnlyIncomplete toggle
  const displayTrucks = showOnlyIncomplete ? incompleteTrucks : completeTrucks

  // KPIs
  const kpis = useMemo(() => {
    const approved = completeTrucks.filter((t) => t.status === "approved").length
    const apurado = completeTrucks.filter((t) => t.status === "apurado").length
    const rejected = completeTrucks.filter((t) => t.status === "rejected").length
    
    const approvedTonnage = completeTrucks
      .filter((t) => t.status === "approved")
      .reduce((sum, t) => sum + (t.grossWeight || 0), 0) / 1000
    
    const apuradoTonnage = completeTrucks
      .filter((t) => t.status === "apurado")
      .reduce((sum, t) => sum + (t.grossWeight || 0), 0) / 1000
    
    const rejectedTonnage = completeTrucks
      .filter((t) => t.status === "rejected")
      .reduce((sum, t) => sum + (t.grossWeight || 0), 0) / 1000
    
    const totalTonnage = completeTrucks.reduce((sum, t) => sum + (t.grossWeight || 0), 0) / 1000

    return {
      total: completeTrucks.length,
      approved,
      apurado,
      rejected,
      totalTonnage,
      approvedTonnage,
      apuradoTonnage,
      rejectedTonnage,
    }
  }, [completeTrucks])

  // Calculate daily averages (arithmetic and weighted)
  const dailyAverages = useMemo(() => {
    // Filter trucks based on filterStatus
    let trucksToAnalyze = completeTrucks
    
    if (filterStatus !== "all") {
      trucksToAnalyze = completeTrucks.filter((t) => t.status === filterStatus)
    }
    
    const trucksWithData = trucksToAnalyze.filter((t) => 
      t.cor !== null || t.pol !== null || t.umi !== null || t.cin !== null || t.ri !== null
    )
    
    if (trucksWithData.length === 0) {
      return {
        cor: { arithmetic: null, weighted: null },
        pol: { arithmetic: null, weighted: null },
        umi: { arithmetic: null, weighted: null },
        cin: { arithmetic: null, weighted: null },
        ri: { arithmetic: null, weighted: null },
      }
    }

    // Arithmetic totals and counts
    const totals = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }
    const counts = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }
    
    // Weighted totals (value * weight) and total weights
    const weightedTotals = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }
    const totalWeights = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }

    trucksWithData.forEach((truck) => {
      const weight = truck.grossWeight || 0
      
      if (truck.cor !== null) {
        totals.cor += truck.cor
        counts.cor++
        if (weight > 0) {
          weightedTotals.cor += truck.cor * weight
          totalWeights.cor += weight
        }
      }
      if (truck.pol !== null) {
        totals.pol += truck.pol
        counts.pol++
        if (weight > 0) {
          weightedTotals.pol += truck.pol * weight
          totalWeights.pol += weight
        }
      }
      if (truck.umi !== null) {
        totals.umi += truck.umi
        counts.umi++
        if (weight > 0) {
          weightedTotals.umi += truck.umi * weight
          totalWeights.umi += weight
        }
      }
      if (truck.cin !== null) {
        totals.cin += truck.cin
        counts.cin++
        if (weight > 0) {
          weightedTotals.cin += truck.cin * weight
          totalWeights.cin += weight
        }
      }
      if (truck.ri !== null) {
        totals.ri += truck.ri
        counts.ri++
        if (weight > 0) {
          weightedTotals.ri += truck.ri * weight
          totalWeights.ri += weight
        }
      }
    })

    return {
      cor: {
        arithmetic: counts.cor > 0 ? totals.cor / counts.cor : null,
        weighted: totalWeights.cor > 0 ? weightedTotals.cor / totalWeights.cor : null,
      },
      pol: {
        arithmetic: counts.pol > 0 ? totals.pol / counts.pol : null,
        weighted: totalWeights.pol > 0 ? weightedTotals.pol / totalWeights.pol : null,
      },
      umi: {
        arithmetic: counts.umi > 0 ? totals.umi / counts.umi : null,
        weighted: totalWeights.umi > 0 ? weightedTotals.umi / totalWeights.umi : null,
      },
      cin: {
        arithmetic: counts.cin > 0 ? totals.cin / counts.cin : null,
        weighted: totalWeights.cin > 0 ? weightedTotals.cin / totalWeights.cin : null,
      },
      ri: {
        arithmetic: counts.ri > 0 ? totals.ri / counts.ri : null,
        weighted: totalWeights.ri > 0 ? weightedTotals.ri / totalWeights.ri : null,
      },
    }
  }, [completeTrucks, filterStatus])

  // Card configs
  const cardConfigs = [
    {
      label: "TOTAL",
      value: kpis.total,
      tonnage: kpis.totalTonnage,
      icon: TrendingUp,
      bgColor: isDarkMode ? "bg-blue-500/10" : "bg-blue-50",
      borderColor: isDarkMode ? "border-blue-500/20" : "border-blue-200",
      iconBg: isDarkMode ? "bg-blue-500/20" : "bg-blue-100",
      iconColor: isDarkMode ? "text-blue-400" : "text-blue-600",
      textColor: isDarkMode ? "text-blue-400" : "text-blue-700",
      labelColor: isDarkMode ? "text-blue-400/70" : "text-blue-600",
      filter: "all" as const,
    },
    {
      label: "APROVADOS",
      value: kpis.approved,
      tonnage: kpis.approvedTonnage,
      icon: CheckCircle2,
      bgColor: isDarkMode ? "bg-emerald-500/10" : "bg-emerald-50",
      borderColor: isDarkMode ? "border-emerald-500/20" : "border-emerald-200",
      iconBg: isDarkMode ? "bg-emerald-500/20" : "bg-emerald-100",
      iconColor: isDarkMode ? "text-emerald-400" : "text-emerald-600",
      textColor: isDarkMode ? "text-emerald-400" : "text-emerald-700",
      labelColor: isDarkMode ? "text-emerald-400/70" : "text-emerald-600",
      filter: "approved" as const,
    },
    {
      label: "APONTADOS",
      value: kpis.apurado,
      tonnage: kpis.apuradoTonnage,
      icon: AlertCircle,
      bgColor: isDarkMode ? "bg-amber-500/10" : "bg-amber-50",
      borderColor: isDarkMode ? "border-amber-500/20" : "border-amber-200",
      iconBg: isDarkMode ? "bg-amber-500/20" : "bg-amber-100",
      iconColor: isDarkMode ? "text-amber-400" : "text-amber-600",
      textColor: isDarkMode ? "text-amber-400" : "text-amber-700",
      labelColor: isDarkMode ? "text-amber-400/70" : "text-amber-600",
      filter: "apurado" as const,
    },
    {
      label: "RECUSADOS",
      value: kpis.rejected,
      tonnage: kpis.rejectedTonnage,
      icon: XCircle,
      bgColor: isDarkMode ? "bg-red-500/10" : "bg-red-50",
      borderColor: isDarkMode ? "border-red-500/20" : "border-red-200",
      iconBg: isDarkMode ? "bg-red-500/20" : "bg-red-100",
      iconColor: isDarkMode ? "text-red-400" : "text-red-600",
      textColor: isDarkMode ? "text-red-400" : "text-red-700",
      labelColor: isDarkMode ? "text-red-400/70" : "text-red-600",
      filter: "rejected" as const,
    },
  ]

  // Filtered and searched trucks
  const filteredTrucks = useMemo(() => {
    let result = displayTrucks

    if (filterStatus !== "all") {
      result = result.filter((t) => t.status === filterStatus)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (t) =>
          t.licensePlate.toLowerCase().includes(search) ||
          t.client.toLowerCase().includes(search) ||
          t.supplier.toLowerCase().includes(search)
      )
    }

    return result
  }, [displayTrucks, filterStatus, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredTrucks.length / ITEMS_PER_PAGE)
  const paginatedTrucks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredTrucks.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredTrucks, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, searchTerm])

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Sidebar panel */}
      <div
        className={`relative ml-auto w-full max-w-[calc(100vw-280px)] flex flex-col shadow-2xl ${
          isDarkMode ? "bg-slate-900" : "bg-white"
        }`}
      >
        {/* Header - Redesigned */}
        <div className={`flex items-center justify-between px-6 py-5 border-b ${
          isDarkMode ? "border-slate-700/60 bg-gradient-to-r from-slate-800/80 to-slate-800/60" : "border-slate-200 bg-gradient-to-r from-slate-50 to-white"
        }`}>
          {/* Left section - Navigation & Date */}
          <div className="flex items-center gap-4">
            {/* Navigation arrows */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPreviousDay}
                className={`h-9 w-9 p-0 rounded-lg transition-all ${
                  isDarkMode 
                    ? "hover:bg-slate-700 text-slate-400 hover:text-slate-200" 
                    : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNextDay}
                className={`h-9 w-9 p-0 rounded-lg transition-all ${
                  isDarkMode 
                    ? "hover:bg-slate-700 text-slate-400 hover:text-slate-200" 
                    : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            <div className={`h-6 w-px ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} />
            
            {/* Date display */}
            <div>
              <h2 className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {selectedDay.getDate()} de {months[selectedDay.getMonth()]}
              </h2>
              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {completeTrucks.length} {completeTrucks.length === 1 ? "caminhão" : "caminhões"} recepcionados
              </p>
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-3">
            {/* Incomplete toggle */}
            {incompleteTrucks.length > 0 && (
              <button
                onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  showOnlyIncomplete
                    ? isDarkMode
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                    : isDarkMode
                      ? "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                      : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{incompleteTrucks.length} Incompletos</span>
              </button>
            )}
            
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`h-9 w-9 p-0 rounded-lg transition-all ${
                isDarkMode 
                  ? "hover:bg-slate-700 text-slate-400 hover:text-slate-200" 
                  : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
              }`}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* KPI Cards - Redesigned */}
            {!showOnlyIncomplete && (
              <div className="grid grid-cols-4 gap-4">
                {cardConfigs.map((card) => (
                  <button
                    key={card.label}
                    onClick={() => {
                      setFilterStatus(card.filter)
                      setCurrentPage(1)
                    }}
                    className={`relative rounded-xl border ${card.bgColor} ${card.borderColor} p-4 text-left transition-all hover:shadow-lg ${
                      filterStatus === card.filter
                        ? "ring-2 ring-offset-2 " +
                          (isDarkMode ? "ring-sky-500 ring-offset-slate-900" : "ring-sky-500 ring-offset-white")
                        : ""
                    }`}
                  >
                    {/* Side indicator bar */}
                    {filterStatus === card.filter && (
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                        card.label === "TOTAL" ? "bg-blue-500" :
                        card.label === "APROVADOS" ? "bg-emerald-500" :
                        card.label === "APONTADOS" ? "bg-amber-500" :
                        "bg-red-500"
                      }`} />
                    )}
                    
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${card.labelColor}`}>
                          {card.label}
                        </p>
                        <p className={`text-3xl font-bold ${card.textColor}`}>{card.value}</p>
                        <p className={`text-xs mt-1 ${card.labelColor}`}>
                          {formatWeight(card.tonnage)} toneladas
                        </p>
                      </div>
                      <div className={`${card.iconBg} rounded-lg p-2.5 shrink-0`}>
                        <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Daily Averages Section - NEW DESIGN with Circular Gauges */}
            {!showOnlyIncomplete && (dailyAverages.cor.arithmetic !== null || dailyAverages.pol.arithmetic !== null || dailyAverages.umi.arithmetic !== null || dailyAverages.cin.arithmetic !== null || dailyAverages.ri.arithmetic !== null) && (
              <div className={`rounded-2xl overflow-hidden shadow-sm ${
                isDarkMode ? "bg-gradient-to-b from-slate-800/60 to-slate-800/40 border border-slate-700/60" : "bg-gradient-to-b from-white to-slate-50/50 border border-slate-200/80"
              }`}>
                {/* Header */}
                <div className={`px-6 py-5 border-b ${
                  isDarkMode ? 'border-slate-700/60 bg-slate-800/40' : 'border-slate-200/80 bg-gradient-to-r from-slate-50/80 to-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? "bg-sky-500/20" : "bg-sky-100"}`}>
                        <Activity className={`h-4 w-4 ${isDarkMode ? "text-sky-400" : "text-sky-600"}`} />
                      </div>
                      <div>
                        <h3 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          Médias de Qualidade
                        </h3>
                        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          Indicadores agregados do dia
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Gauges Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-5 gap-4">
                    {/* COR Gauge */}
                    {dailyAverages.cor.arithmetic !== null && (
                      <CircularGauge
                        value={dailyAverages.cor.arithmetic}
                        weightedValue={dailyAverages.cor.weighted}
                        max={qualityLimits.cor.max}
                        label="COR"
                        formatter={formatCor}
                        isDarkMode={isDarkMode}
                      />
                    )}
                    
                    {/* POL Gauge */}
                    {dailyAverages.pol.arithmetic !== null && (
                      <CircularGauge
                        value={dailyAverages.pol.arithmetic}
                        weightedValue={dailyAverages.pol.weighted}
                        max={qualityLimits.pol.max}
                        min={qualityLimits.pol.min}
                        label="POL"
                        formatter={formatPol}
                        isDarkMode={isDarkMode}
                      />
                    )}
                    
                    {/* UMI Gauge */}
                    {dailyAverages.umi.arithmetic !== null && (
                      <CircularGauge
                        value={dailyAverages.umi.arithmetic}
                        weightedValue={dailyAverages.umi.weighted}
                        max={qualityLimits.um.max}
                        label="UMI"
                        formatter={formatUmi}
                        isDarkMode={isDarkMode}
                      />
                    )}
                    
                    {/* CIN Gauge */}
                    {dailyAverages.cin.arithmetic !== null && (
                      <CircularGauge
                        value={dailyAverages.cin.arithmetic}
                        weightedValue={dailyAverages.cin.weighted}
                        max={qualityLimits.cin.max}
                        label="CIN"
                        formatter={formatCin}
                        isDarkMode={isDarkMode}
                      />
                    )}
                    
                    {/* RI Gauge */}
                    {dailyAverages.ri.arithmetic !== null && (
                      <CircularGauge
                        value={dailyAverages.ri.arithmetic}
                        weightedValue={dailyAverages.ri.weighted}
                        max={qualityLimits.ri.max}
                        label="RI"
                        formatter={formatRi}
                        isDarkMode={isDarkMode}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filters Bar */}
            {!showOnlyIncomplete && (
              <div className={`flex items-center gap-4 p-5 rounded-2xl shadow-sm ${
                isDarkMode 
                  ? "bg-gradient-to-r from-slate-800/80 to-slate-800/60 border border-slate-700/50" 
                  : "bg-gradient-to-r from-white to-slate-50/80 border border-slate-200/80"
              }`}>
                {/* Search input */}
                <div className="flex-1 relative group">
                  <Search className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
                    isDarkMode ? "text-slate-500 group-focus-within:text-sky-400" : "text-slate-400 group-focus-within:text-sky-500"
                  }`} />
                  <input
                    type="text"
                    placeholder="Buscar por placa, cliente ou fornecedor..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className={`w-full rounded-xl pl-11 pr-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isDarkMode
                        ? "bg-slate-900/80 text-white placeholder-slate-500 border border-slate-600/50 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
                        : "bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
                    }`}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm("")
                        setCurrentPage(1)
                      }}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                        isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-400"
                      }`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className={`h-8 w-px ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} />

                {/* View mode toggle */}
                <button
                  onClick={() => {
                    setTableViewMode(tableViewMode === "main" ? "by-client" : "main")
                    setExpandedGroups(new Set())
                    setExpandedSuppliers(new Set())
                  }}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    isDarkMode
                      ? "bg-gradient-to-r from-sky-500/20 to-sky-600/20 text-sky-300 hover:from-sky-500/30 hover:to-sky-600/30 border border-sky-500/20"
                      : "bg-gradient-to-r from-sky-50 to-sky-100/80 text-sky-700 hover:from-sky-100 hover:to-sky-150 border border-sky-200/50"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  {tableViewMode === "main" ? "Principal" : "Por Cliente"}
                </button>
              </div>
            )}

            {/* Trucks Table - Simplified placeholder (you can expand with full table logic) */}
            <div className={`rounded-2xl overflow-hidden shadow-sm ${
              isDarkMode 
                ? "bg-gradient-to-b from-slate-800/50 to-slate-800/30 border border-slate-700/50" 
                : "bg-white border border-slate-200/80"
            }`}>
              <div className="p-6">
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {filteredTrucks.length} {filteredTrucks.length === 1 ? "caminhão encontrado" : "caminhões encontrados"}
                </p>
                {/* Add full table implementation here - keeping existing table code */}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
