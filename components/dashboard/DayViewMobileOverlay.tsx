"use client"

import { useState, useEffect, useMemo } from "react"
import { X, Truck, CheckCircle, AlertTriangle, XCircle, ChevronRight, Clock, Search, History, Beaker, Scan, CheckCircle2, ChevronLeft, FileText, TrendingUp, Activity } from "lucide-react"
import { formatCor, formatPol, formatUmi, formatCin, formatRi, formatDateTimePtBr, formatWeight } from "@/lib/utils"

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

interface DayViewMobileOverlayProps {
  selectedDay: Date
  isDarkMode: boolean
  trucksByDate: Record<string, TruckData[]>
  onClose: () => void
  initialSearchTerm?: string
  onPreviousDay?: () => void
  onNextDay?: () => void
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

// Compact Circular Gauge for Mobile
interface CompactGaugeProps {
  value: number
  weightedValue: number | null
  max: number
  min?: number
  label: string
  formatter: (val: number) => string
  isDarkMode: boolean
}

const CompactGauge = ({ value, weightedValue, max, min = 0, label, formatter, isDarkMode }: CompactGaugeProps) => {
  const range = max - min
  const percentage = ((value - min) / range) * 100
  const weightedPercentage = weightedValue !== null ? ((weightedValue - min) / range) * 100 : null
  
  const isValueOutOfSpec = isOutOfSpec(label.toLowerCase(), value)
  const isWeightedOutOfSpec = weightedValue !== null ? isOutOfSpec(label.toLowerCase(), weightedValue) : false
  
  const size = 90
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  const offset = circumference - (percentage / 100) * circumference
  const weightedOffset = weightedPercentage !== null ? circumference - (weightedPercentage / 100) * circumference : circumference
  
  return (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
      isDarkMode 
        ? "bg-gradient-to-b from-slate-800/60 to-slate-800/40 border-slate-700/50" 
        : "bg-gradient-to-b from-white to-slate-50/80 border-slate-200/80"
    }`}>
      {/* Label */}
      <h4 className={`text-xs font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{label}</h4>
      
      {/* Gauge */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isDarkMode ? "#334155" : "#e2e8f0"}
            strokeWidth={strokeWidth}
          />
          
          {/* Weighted arc */}
          {weightedValue !== null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius - 4}
              fill="none"
              stroke={isWeightedOutOfSpec ? "#ef4444" : "#10b981"}
              strokeWidth={strokeWidth - 2}
              strokeDasharray={circumference}
              strokeDashoffset={weightedOffset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          )}
          
          {/* Arithmetic arc */}
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
            className="transition-all duration-700"
          />
        </svg>
        
        {/* Center values */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-sm font-bold ${isValueOutOfSpec ? "text-red-500" : isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
            {formatter(value)}
          </div>
          {weightedValue !== null && (
            <div className={`text-[10px] font-semibold ${isWeightedOutOfSpec ? "text-red-500" : "text-emerald-500"}`}>
              {formatter(weightedValue)}
            </div>
          )}
        </div>
      </div>
      
      {/* Compact legend */}
      <div className="space-y-0.5 text-[9px] w-full">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isValueOutOfSpec ? "bg-red-500" : "bg-blue-500"}`} />
            <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>A</span>
          </div>
          <span className={`font-semibold ${isValueOutOfSpec ? "text-red-500" : isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
            {formatter(value)}
          </span>
        </div>
        {weightedValue !== null && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isWeightedOutOfSpec ? "bg-red-500" : "bg-emerald-500"}`} />
              <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>P</span>
            </div>
            <span className={`font-semibold ${isWeightedOutOfSpec ? "text-red-500" : "text-emerald-500"}`}>
              {formatter(weightedValue)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function DayViewMobileOverlay({
  selectedDay,
  isDarkMode,
  trucksByDate,
  onClose,
  initialSearchTerm = "",
  onPreviousDay,
  onNextDay,
}: DayViewMobileOverlayProps) {
  const [activeTab, setActiveTab] = useState<"resumo" | "caminhoes">("resumo")
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "apurado" | "rejected">("all")
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  
  const dateKey = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(
    selectedDay.getDate()
  ).padStart(2, "0")}`

  const trucks = trucksByDate[dateKey] || []
  
  const completeTrucks = useMemo(() => {
    return trucks.filter((t) => !hasIncompleteData(t))
  }, [trucks])

  const incompleteTrucks = useMemo(() => {
    return trucks.filter((t) => hasIncompleteData(t))
  }, [trucks])

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

  // Daily averages
  const dailyAverages = useMemo(() => {
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

    const totals = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }
    const counts = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className={`px-4 py-4 border-b ${
        isDarkMode ? "border-slate-700/60 bg-gradient-to-r from-slate-800/80 to-slate-800/60" : "border-slate-200 bg-gradient-to-r from-slate-50 to-white"
      }`}>
        {/* Top row - Navigation */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onPreviousDay}
              className={`p-2 rounded-lg transition-all ${
                isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-600"
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={onNextDay}
              className={`p-2 rounded-lg transition-all ${
                isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-600"
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-all ${
              isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-600"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Date info */}
        <div>
          <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            {selectedDay.getDate()} de {months[selectedDay.getMonth()]}
          </h2>
          <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            {completeTrucks.length} {completeTrucks.length === 1 ? "caminhão" : "caminhões"}
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab("resumo")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "resumo"
                ? isDarkMode
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "bg-sky-100 text-sky-700 border border-sky-200"
                : isDarkMode
                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            Resumo
          </button>
          <button
            onClick={() => setActiveTab("caminhoes")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "caminhoes"
                ? isDarkMode
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "bg-sky-100 text-sky-700 border border-sky-200"
                : isDarkMode
                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            Caminhões
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "resumo" ? (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Total */}
              <div className={`p-4 rounded-xl border ${
                isDarkMode 
                  ? "bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20" 
                  : "bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className={`h-4 w-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                  <span className={`text-xs font-semibold ${isDarkMode ? "text-blue-400/70" : "text-blue-600"}`}>TOTAL</span>
                </div>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-blue-400" : "text-blue-700"}`}>{kpis.total}</p>
                <p className={`text-[10px] mt-1 ${isDarkMode ? "text-blue-400/70" : "text-blue-600"}`}>
                  {formatWeight(kpis.totalTonnage)} t
                </p>
              </div>
              
              {/* Aprovados */}
              <div className={`p-4 rounded-xl border ${
                isDarkMode 
                  ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20" 
                  : "bg-gradient-to-br from-emerald-50 to-emerald-50/50 border-emerald-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                  <span className={`text-xs font-semibold ${isDarkMode ? "text-emerald-400/70" : "text-emerald-600"}`}>OK</span>
                </div>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}>{kpis.approved}</p>
                <p className={`text-[10px] mt-1 ${isDarkMode ? "text-emerald-400/70" : "text-emerald-600"}`}>
                  {formatWeight(kpis.approvedTonnage)} t
                </p>
              </div>
              
              {/* Apontados */}
              <div className={`p-4 rounded-xl border ${
                isDarkMode 
                  ? "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20" 
                  : "bg-gradient-to-br from-amber-50 to-amber-50/50 border-amber-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`h-4 w-4 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                  <span className={`text-xs font-semibold ${isDarkMode ? "text-amber-400/70" : "text-amber-600"}`}>APONT.</span>
                </div>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-amber-400" : "text-amber-700"}`}>{kpis.apurado}</p>
                <p className={`text-[10px] mt-1 ${isDarkMode ? "text-amber-400/70" : "text-amber-600"}`}>
                  {formatWeight(kpis.apuradoTonnage)} t
                </p>
              </div>
              
              {/* Recusados */}
              <div className={`p-4 rounded-xl border ${
                isDarkMode 
                  ? "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20" 
                  : "bg-gradient-to-br from-red-50 to-red-50/50 border-red-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className={`h-4 w-4 ${isDarkMode ? "text-red-400" : "text-red-600"}`} />
                  <span className={`text-xs font-semibold ${isDarkMode ? "text-red-400/70" : "text-red-600"}`}>RECUS.</span>
                </div>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-red-400" : "text-red-700"}`}>{kpis.rejected}</p>
                <p className={`text-[10px] mt-1 ${isDarkMode ? "text-red-400/70" : "text-red-600"}`}>
                  {formatWeight(kpis.rejectedTonnage)} t
                </p>
              </div>
            </div>

            {/* Averages Section */}
            {(dailyAverages.cor.arithmetic !== null || dailyAverages.pol.arithmetic !== null || dailyAverages.umi.arithmetic !== null || dailyAverages.cin.arithmetic !== null || dailyAverages.ri.arithmetic !== null) && (
              <div className={`rounded-xl border overflow-hidden ${
                isDarkMode ? "bg-slate-800/60 border-slate-700/60" : "bg-white border-slate-200"
              }`}>
                <div className={`px-4 py-3 border-b ${
                  isDarkMode ? "border-slate-700/60 bg-slate-800/40" : "border-slate-200 bg-slate-50"
                }`}>
                  <div className="flex items-center gap-2">
                    <Activity className={`h-4 w-4 ${isDarkMode ? "text-sky-400" : "text-sky-600"}`} />
                    <h3 className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      Médias de Qualidade
                    </h3>
                  </div>
                </div>
                
                <div className="p-4">
                  {/* 2-column grid for mobile */}
                  <div className="grid grid-cols-2 gap-3">
                    {dailyAverages.cor.arithmetic !== null && (
                      <CompactGauge
                        value={dailyAverages.cor.arithmetic}
                        weightedValue={dailyAverages.cor.weighted}
                        max={qualityLimits.cor.max}
                        label="COR"
                        formatter={formatCor}
                        isDarkMode={isDarkMode}
                      />
                    )}
                    
                    {dailyAverages.pol.arithmetic !== null && (
                      <CompactGauge
                        value={dailyAverages.pol.arithmetic}
                        weightedValue={dailyAverages.pol.weighted}
                        max={qualityLimits.pol.max}
                        min={qualityLimits.pol.min}
                        label="POL"
                        formatter={formatPol}
                        isDarkMode={isDarkMode}
                      />
                    )}
                    
                    {dailyAverages.umi.arithmetic !== null && (
                      <CompactGauge
                        value={dailyAverages.umi.arithmetic}
                        weightedValue={dailyAverages.umi.weighted}
                        max={qualityLimits.um.max}
                        label="UMI"
                        formatter={formatUmi}
                        isDarkMode={isDarkMode}
                      />
                    )}
                    
                    {dailyAverages.cin.arithmetic !== null && (
                      <CompactGauge
                        value={dailyAverages.cin.arithmetic}
                        weightedValue={dailyAverages.cin.weighted}
                        max={qualityLimits.cin.max}
                        label="CIN"
                        formatter={formatCin}
                        isDarkMode={isDarkMode}
                      />
                    )}
                    
                    {dailyAverages.ri.arithmetic !== null && (
                      <CompactGauge
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
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                isDarkMode ? "text-slate-500" : "text-slate-400"
              }`} />
              <input
                type="text"
                placeholder="Buscar placa, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full rounded-xl pl-10 pr-4 py-3 text-sm ${
                  isDarkMode
                    ? "bg-slate-800 text-white placeholder-slate-500 border border-slate-700"
                    : "bg-white text-slate-900 placeholder-slate-400 border border-slate-200"
                }`}
              />
            </div>
            
            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {["all", "approved", "apurado", "rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    filterStatus === status
                      ? isDarkMode
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        : "bg-sky-100 text-sky-700 border border-sky-200"
                      : isDarkMode
                        ? "bg-slate-800 text-slate-400 border border-slate-700"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {status === "all" ? "Todos" : status === "approved" ? "Aprovados" : status === "apurado" ? "Apontados" : "Recusados"}
                </button>
              ))}
            </div>
            
            {/* Trucks list */}
            <div className="space-y-3">
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {filteredTrucks.length} {filteredTrucks.length === 1 ? "caminhão" : "caminhões"}
              </p>
              
              {filteredTrucks.map((truck) => (
                <div
                  key={truck.id}
                  className={`p-4 rounded-xl border ${
                    isDarkMode 
                      ? "bg-slate-800/60 border-slate-700/50" 
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {truck.licensePlate}
                      </p>
                      <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {truck.client}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      truck.status === "approved"
                        ? isDarkMode
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-emerald-100 text-emerald-700"
                        : truck.status === "apurado"
                          ? isDarkMode
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-amber-100 text-amber-700"
                          : isDarkMode
                            ? "bg-red-500/20 text-red-400"
                            : "bg-red-100 text-red-700"
                    }`}>
                      {truck.status === "approved" ? "OK" : truck.status === "apurado" ? "APONT" : "RECUS"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    <div>
                      <p className={isDarkMode ? "text-slate-500" : "text-slate-400"}>COR</p>
                      <p className={`font-semibold ${truck.cor !== null && isOutOfSpec("cor", truck.cor) ? "text-red-500" : isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        {truck.cor !== null ? formatCor(truck.cor) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className={isDarkMode ? "text-slate-500" : "text-slate-400"}>POL</p>
                      <p className={`font-semibold ${truck.pol !== null && isOutOfSpec("pol", truck.pol) ? "text-red-500" : isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        {truck.pol !== null ? formatPol(truck.pol) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className={isDarkMode ? "text-slate-500" : "text-slate-400"}>UMI</p>
                      <p className={`font-semibold ${truck.umi !== null && isOutOfSpec("um", truck.umi) ? "text-red-500" : isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        {truck.umi !== null ? formatUmi(truck.umi) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className={isDarkMode ? "text-slate-500" : "text-slate-400"}>CIN</p>
                      <p className={`font-semibold ${truck.cin !== null && isOutOfSpec("cin", truck.cin) ? "text-red-500" : isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        {truck.cin !== null ? formatCin(truck.cin) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className={isDarkMode ? "text-slate-500" : "text-slate-400"}>RI</p>
                      <p className={`font-semibold ${truck.ri !== null && isOutOfSpec("ri", truck.ri) ? "text-red-500" : isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        {truck.ri !== null ? formatRi(truck.ri) : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
