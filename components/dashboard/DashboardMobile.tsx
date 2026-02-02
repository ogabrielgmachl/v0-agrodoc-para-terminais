"use client"

import Link from "next/link"
import { User } from "lucide-react"

import { cn, formatToneladas } from "@/lib/utils"

import { useState, useEffect } from "react"
import {
  Truck,
  LogOut,
  X,
  Ship,
  ChevronLeft,
  ChevronRight,
  Settings,
  Moon,
  Sun,
  ChevronDown,
  Search,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react"
import type { DayStatsByDate } from "@/lib/load-trucks"
import React from "react"
import { SugarCaneIcon } from "@/components/icons"
import EmbarqueModuleMobile from "./EmbarqueModuleMobile"
import { DayViewMobileOverlay } from "./DayViewMobileOverlay"

interface TruckData {
  id: string
  licensePlate: string
  grossWeight: number
  // Campos de autorização (doublecheck do laboratório)
  autorizacao: "APROVADO" | "RECUSADO" | null
  dataAutorizacao: string | null
  nomeUsuarioAutorizacao: string | null
  // Análises finais
  cor: number | null
  pol: number | null
  umi: number | null
  cin: number | null
  ri: number | null
  // Análises anteriores (NIR)
  corAnterior: number | null
  polAnterior: number | null
  umiAnterior: number | null
  cinAnterior: number | null
  riAnterior: number | null
  status: "approved" | "rejected" | "apurado"
  client: string
  supplier: string
  nfNumber: string | null
  isRepeated: boolean
  hasOtherOutOfSpec: boolean
  houveDoublecheck: boolean
}

interface DashboardMobileProps {
  isDarkMode: boolean
  onToggleTheme: () => void
  onLogout: () => void
  currentYear: number
  currentMonthIndex: number
  selectedDay: Date | null
  trucksByDate: Record<string, TruckData[]>
  dayStatsByDate: DayStatsByDate
  setCurrentYear: (year: number) => void
  setCurrentMonthIndex: (month: number) => void
  setSelectedDay: (day: Date | null) => void
  getTruckData: (date: Date) => number
  handleDayClick: (date: Date, truckCount: number) => void
  handlePreviousMonth: () => void
  handleNextMonth: () => void
  handleExportCSV: () => void
  getFilteredTrucks: () => TruckData[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  filterStatus: "all" | "approved" | "apurado" | "rejected"
  setFilterStatus: (status: "all" | "approved" | "apurado" | "rejected") => void
  tableViewMode: "main" | "by-client"
  setTableViewMode: (mode: "main" | "by-client") => void
  currentPage: number
  setCurrentPage: (page: number) => void
  itemsPerPage: number
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
      umi: number
      cin: number
      ri: number
    }
  }
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
  formatInteger: (value: number) => string
  formatRi: (value: number) => string
  formatUmi: (value: number) => string
  formatCin: (value: number) => string
  formatPol: (value: number) => string
  formatCor: (value: number) => string
  username: string
  handleLogout: () => void
  onTabChange: (tab: string) => void
  shipsByDate?: Record<string, any[]>
  onRefreshData?: () => void
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

const monthsShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

// Mobile: use clearer weekday abbreviations for readability
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const generateCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startingDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const days = []

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLastDay - i,
      month: "prev" as const,
      date: new Date(year, month - 1, prevMonthLastDay - i),
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      month: "current" as const,
      date: new Date(year, month, day),
    })
  }

  // Calculate exact number of weeks needed (avoid extra week)
  const totalDays = startingDayOfWeek + daysInMonth
  const weeksNeeded = Math.ceil(totalDays / 7)
  const remainingCells = (weeksNeeded * 7) - days.length
  
  for (let day = 1; day <= remainingCells; day++) {
    days.push({
      day,
      month: "next" as const,
      date: new Date(year, month + 1, day),
    })
  }

  return days
}

export function DashboardMobile({
  isDarkMode,
  onToggleTheme,
  onLogout,
  currentYear,
  currentMonthIndex,
  selectedDay,
  trucksByDate,
  dayStatsByDate,
  setCurrentYear,
  setCurrentMonthIndex,
  setSelectedDay,
  getTruckData,
  handleDayClick,
  handlePreviousMonth,
  handleNextMonth,
  handleExportCSV,
  getFilteredTrucks,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  tableViewMode,
  setTableViewMode,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  currentModule,
  currentProduct,
  setCurrentModule,
  setCurrentProduct,
  monthStats,
  embarqueStats,
  formatInteger,
  formatRi,
  formatUmi,
  formatCin,
  formatPol,
  formatCor,
  username,
  handleLogout,
  shipsByDate = {},
  onRefreshData,
}: DashboardMobileProps) {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [isBottomSheetClosing, setIsBottomSheetClosing] = useState(false)
  const [isMonthSelectOpen, setIsMonthSelectOpen] = useState(false)
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  const [tempMonthIndex, setTempMonthIndex] = useState(currentMonthIndex)
  const [tempYear, setTempYear] = useState(currentYear)
  const [recepcaoView, setRecepcaoView] = useState<"calendar" | "summary">("calendar")
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
  const [isHeaderMenuClosing, setIsHeaderMenuClosing] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Global search state
  const [globalSearchTerm, setGlobalSearchTerm] = useState("")
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    truck: TruckData
    dateStr: string
    date: Date
  }[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const calendarDays = generateCalendarDays(currentYear, currentMonthIndex)

  const getQualityStatus = (date: Date): "complete" | "incomplete" | null => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const trucks = trucksByDate[dateStr] || []

    if (trucks.length === 0) return null

    // Check if any truck has incomplete data
    for (const truck of trucks) {
      if (hasIncompleteData(truck)) {
        return "incomplete"
      }
    }

    return "complete"
  }

  const handleMobileDayClick = (date: Date) => {
    const truckCount = getTruckData(date)
    handleDayClick(date, truckCount)
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

  const getDerivedTruckLists = (day: Date | null) => {
    if (!day) return { all: [], incomplete: [], complete: [] }
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
    const all = trucksByDate[dateStr] || []
    const incomplete = all.filter(hasIncompleteData)
    const complete = all.filter((t) => !hasIncompleteData(t))
    return { all, incomplete, complete }
  }

  const getKPIs = () => {
    if (!selectedDay) return { total: 0, approved: 0, apurado: 0, rejected: 0 }
    const { all, complete } = getDerivedTruckLists(selectedDay)
    return {
      total: all.length,
      approved: complete.filter((t) => t.status === "approved").length,
      apurado: complete.filter((t) => t.status === "apurado").length,
      rejected: complete.filter((t) => t.status === "rejected").length,
    }
  }

  const getTrucksWithoutAnalysis = () => {
    if (!selectedDay) return 0
    const dateStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`
    const dayTrucks = trucksByDate[dateStr] || []
    return dayTrucks.filter(hasIncompleteData).length
  }

  React.useEffect(() => {
    setShowOnlyIncomplete(false)
  }, [selectedDay])

  const handleOpenMonthSelect = () => {
    setTempMonthIndex(currentMonthIndex)
    setTempYear(currentYear)
    setIsMonthSelectOpen(true)
  }

  const handleApplyMonthSelection = () => {
    setCurrentMonthIndex(tempMonthIndex)
    setCurrentYear(tempYear)
    setIsMonthSelectOpen(false)
  }

  const closeHeaderMenu = () => {
    setIsHeaderMenuClosing(true)
    setTimeout(() => {
      setIsHeaderMenuOpen(false)
      setIsHeaderMenuClosing(false)
    }, 250)
  }
  
  // Global search function - searches across all dates
  const handleGlobalSearch = (term: string) => {
    setGlobalSearchTerm(term)
    
    if (!term || term.trim().length < 2) {
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    const searchLower = term.toLowerCase().trim()
    const results: { truck: TruckData; dateStr: string; date: Date }[] = []
    
    // Search through all trucks in trucksByDate
    for (const [dateStr, trucks] of Object.entries(trucksByDate)) {
      for (const truck of trucks) {
        const matchesPlate = truck.licensePlate?.toLowerCase().includes(searchLower)
        const matchesNF = truck.nfNumber?.toLowerCase().includes(searchLower)
        const matchesClient = truck.client?.toLowerCase().includes(searchLower)
        const matchesSupplier = truck.supplier?.toLowerCase().includes(searchLower)
        
        if (matchesPlate || matchesNF || matchesClient || matchesSupplier) {
          const [year, month, day] = dateStr.split("-").map(Number)
          results.push({
            truck,
            dateStr,
            date: new Date(year, month - 1, day),
          })
        }
      }
    }
    
    // Sort by date (most recent first)
    results.sort((a, b) => b.date.getTime() - a.date.getTime())
    
    setSearchResults(results.slice(0, 50)) // Limit to 50 results
    setIsSearching(false)
  }
  
  // Navigate to search result
  const handleSearchResultClick = (result: { truck: TruckData; dateStr: string; date: Date }) => {
    const resultDate = result.date
    
    // Update month/year if needed
    if (resultDate.getMonth() !== currentMonthIndex || resultDate.getFullYear() !== currentYear) {
      setCurrentMonthIndex(resultDate.getMonth())
      setCurrentYear(resultDate.getFullYear())
    }
    
    // Set search query to the truck's license plate so it's filtered in day view
    setSearchQuery(result.truck.licensePlate)
    
    // Open day view
    setSelectedDay(resultDate)
    setShowGlobalSearch(false)
    setGlobalSearchTerm("")
    setSearchResults([])
  }

  const handleModuleChange = (module: "recepcao" | "embarque") => {
    setCurrentModule(module)
    closeHeaderMenu()
  }

  const handleProductChange = (product: "acucar" | "soja" | "milho") => {
    setCurrentProduct(product)
    // closeHeaderMenu() // Removed to allow product selection without closing the menu
  }

  const minSwipeDistance = 60

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      // Swipe para esquerda = próximo mês
      const now = new Date()
      if (!(currentYear === now.getFullYear() && currentMonthIndex >= now.getMonth())) {
        handleNextMonth()
      }
    }

    if (isRightSwipe) {
      // Swipe para direita = mês anterior
      if (!(currentYear === 2025 && currentMonthIndex === 11)) {
        handlePreviousMonth()
      }
    }
  }

  const getDayQualityIndicator = (date: Date): "rejected" | "apurado" | null => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const trucks = trucksByDate[dateStr] || []

    if (trucks.length === 0) return null

    // Check only trucks with complete data
    const completeTrucks = trucks.filter((t) => {
      return (
        t.licensePlate &&
        t.licensePlate.trim() !== "" &&
        t.nfNumber &&
        t.nfNumber.trim() !== "" &&
        t.client &&
        t.client.trim() !== "" &&
        t.supplier &&
        t.supplier.trim() !== "" &&
        t.grossWeight !== null &&
        t.grossWeight !== 0 &&
        t.cor !== null &&
        t.pol !== null &&
        t.umi !== null &&
        t.cin !== null &&
        t.ri !== null
      )
    })

    if (completeTrucks.length === 0) return null

    // Priority: rejected > apurado
    if (completeTrucks.some((t) => t.status === "rejected")) return "rejected"
    if (completeTrucks.some((t) => t.status === "apurado")) return "apurado"

    return null
  }

  const handleRefresh = () => {
    if (onRefreshData) {
      setIsRefreshing(true)
      onRefreshData()
      setTimeout(() => setIsRefreshing(false), 2000) // Simulate refresh delay
    }
  }

  const closeBottomSheet = () => {
    setIsBottomSheetClosing(true)
    setTimeout(() => {
      setIsBottomSheetOpen(false)
      setIsBottomSheetClosing(false)
    }, 250)
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isDarkMode ? "bg-[#050816]" : "bg-gray-100"}`}>
      {/* ====== HEADER FIXO ====== */}
      <header
        className={`flex-shrink-0 z-40 flex items-center justify-between px-4 py-3 ${
          isDarkMode ? "bg-[#050816] border-b border-white/10" : "bg-white border-b border-gray-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {currentModule === "recepcao" ? (
            <div className={`p-2 rounded-xl ${isDarkMode ? "bg-emerald-500/20" : "bg-blue-500/10"}`}>
              <Truck className={`h-5 w-5 ${isDarkMode ? "text-emerald-400" : "text-blue-600"}`} />
            </div>
          ) : (
            <div className={`p-2 rounded-xl ${isDarkMode ? "bg-emerald-500/20" : "bg-blue-500/10"}`}>
              <Ship className={`h-5 w-5 ${isDarkMode ? "text-emerald-400" : "text-blue-600"}`} />
            </div>
          )}
          <button
            onClick={() => setIsHeaderMenuOpen(true)}
            className={`flex items-center gap-1 transition-all touch-press rounded-lg px-1 -ml-1 ${
              isDarkMode ? "hover:bg-white/5 active:bg-white/10" : "hover:bg-gray-50 active:bg-gray-100"
            }`}
          >
            <h1 className={`font-semibold text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {currentModule === "recepcao" ? "Recepção" : "Embarque"} de Açúcar
            </h1>
            <ChevronDown className={`h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button
            onClick={() => setShowGlobalSearch(true)}
            className={`p-2.5 rounded-xl transition-all touch-press ${
              isDarkMode ? "hover:bg-white/10 active:bg-white/20" : "hover:bg-gray-100 active:bg-gray-200"
            }`}
          >
            <Search className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
          </button>
          
          <button
            onClick={() => setIsBottomSheetOpen(true)}
            className={`p-2.5 rounded-xl transition-all touch-press ${
              isDarkMode ? "hover:bg-white/10 active:bg-white/20" : "hover:bg-gray-100 active:bg-gray-200"
            }`}
          >
            <Settings className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
          </button>
        </div>
      </header>

      {/* ====== BODY 100% - Calendário Fullscreen ou Embarque ====== */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {currentModule === "embarque" && shipsByDate ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <EmbarqueModuleMobile
              shipsByDate={shipsByDate}
              isDarkMode={isDarkMode}
              currentYear={currentYear}
              currentMonthIndex={currentMonthIndex}
              handlePreviousMonth={handlePreviousMonth}
              handleNextMonth={handleNextMonth}
              embarqueStats={embarqueStats}
            />
          </div>
        ) : (
          <div
            className={`flex-1 min-h-0 flex flex-col ${isDarkMode ? "bg-[#050816]" : "bg-white"}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Month Navigation */}
            <div
              className={`sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b ${
                isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
              }`}
            >
              <button
                onClick={handlePreviousMonth}
                disabled={currentYear === 2025 && currentMonthIndex === 11}
                className={`p-2.5 rounded-xl transition-all touch-press ${
                  isDarkMode ? "hover:bg-white/10 disabled:opacity-30" : "hover:bg-gray-100 disabled:opacity-30"
                }`}
              >
                <ChevronLeft className={`h-5 w-5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`} />
              </button>

              <div className="flex-1 flex flex-col items-center">
                <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  {months[currentMonthIndex]} {currentYear}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setRecepcaoView("calendar")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      recepcaoView === "calendar"
                        ? isDarkMode
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-blue-100 text-blue-700 border border-blue-300"
                        : isDarkMode
                          ? "text-gray-400 hover:text-gray-300"
                          : "text-gray-500 hover:text-gray-600"
                    }`}
                  >
                    Calendário
                  </button>
                  <button
                    onClick={() => setRecepcaoView("summary")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      recepcaoView === "summary"
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
                disabled={currentYear === new Date().getFullYear() && currentMonthIndex >= new Date().getMonth()}
                className={`p-2.5 rounded-xl transition-all touch-press ${
                  isDarkMode ? "hover:bg-white/10 disabled:opacity-30" : "hover:bg-gray-100 disabled:opacity-30"
                }`}
              >
                <ChevronRight className={`h-5 w-5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`} />
              </button>
            </div>

            {recepcaoView === "calendar" ? (
              <>
                {/* Week Days Header */}
                <div
                  className={cn(
                    "grid grid-cols-7 px-3 py-2 flex-shrink-0 border-b",
                    isDarkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
                  )}
                >
                  {weekDays.map((day, index) => (
                    <div
                      key={index}
                      className={cn(
                        "text-center text-xs font-medium tracking-wide py-1",
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid - Fullscreen */}
                <div className="flex-1 min-h-0 grid grid-cols-7 auto-rows-fr gap-px">
                  {calendarDays.map((dayInfo, index) => {
                    const truckCount = getTruckData(dayInfo.date)
                    const qualityIndicator = getDayQualityIndicator(dayInfo.date)
                    const hasIncomplete = getQualityStatus(dayInfo.date) === "incomplete"
                    const isToday =
                      dayInfo.date.getDate() === new Date().getDate() &&
                      dayInfo.date.getMonth() === new Date().getMonth() &&
                      dayInfo.date.getFullYear() === new Date().getFullYear()

                    // Check if date is in the past
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const clickedDate = new Date(dayInfo.date)
                    clickedDate.setHours(0, 0, 0, 0)
                    const isPastDate = clickedDate < today

                    return (
                      <div
                        key={index}
                        onClick={() => dayInfo.month === "current" && truckCount > 0 && handleMobileDayClick(dayInfo.date)}
                        className={cn(
                          // Slightly bigger cells for legibility + better touch
                          "relative flex flex-col p-2 transition-all border-b border-r min-h-[76px]",
                          dayInfo.month !== "current"
                            ? isDarkMode
                              ? "bg-white/[0.02]"
                              : "bg-gray-50"
                            : isDarkMode
                              ? "bg-transparent hover:bg-white/[0.02]"
                              : "bg-white hover:bg-gray-50/80",
                          isDarkMode ? "border-white/5" : "border-gray-200",
                          dayInfo.month === "current" && truckCount > 0 ? "cursor-pointer" : ""
                        )}
                      >
                        {/* Número do dia - badge circular */}
                        <div className="mb-2">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold",
                              dayInfo.month !== "current" || (truckCount === 0 && isPastDate)
                                ? "text-gray-400"
                                : isDarkMode
                                  ? "text-gray-100"
                                  : "text-gray-900"
                            )}
                          >
                            {dayInfo.day}
                          </span>
                        </div>

                        {/* Pill badge de caminhões */}
                        {dayInfo.month === "current" && truckCount > 0 && (
                          <div className="flex-1 flex items-start">
                            <div className={cn(
                              // Bigger pill for readability + better touch
                              "inline-flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-all",
                              hasIncomplete
                                ? isDarkMode 
                                  ? "bg-rose-500/15 border border-rose-500/30" 
                                  : "bg-rose-100 border border-rose-300"
                                : isDarkMode
                                  ? "bg-emerald-500/15 border border-emerald-500/30"
                                  : "bg-emerald-100 border border-emerald-300"
                            )}>
                              {/* Status dot */}
                              <div
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  qualityIndicator === "rejected" 
                                    ? "bg-red-500" 
                                    : qualityIndicator === "apurado"
                                      ? "bg-amber-500"
                                      : hasIncomplete
                                        ? isDarkMode ? "bg-rose-400" : "bg-rose-500"
                                        : isDarkMode ? "bg-emerald-400" : "bg-emerald-500"
                                )}
                              />
                              {/* Ícone */}
                              <Truck className={cn(
                                "h-3 w-3 shrink-0",
                                hasIncomplete
                                  ? isDarkMode ? "text-rose-300" : "text-rose-600"
                                  : isDarkMode ? "text-emerald-300" : "text-emerald-700"
                              )} />
                              {/* Número */}
                              <span className={cn(
                                "text-[11px] font-semibold",
                                hasIncomplete
                                  ? isDarkMode ? "text-rose-300" : "text-rose-700"
                                  : isDarkMode ? "text-emerald-300" : "text-emerald-700"
                              )}>
                                {truckCount}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className={`flex-1 min-h-0 overflow-y-auto p-4 ${isDarkMode ? "bg-[#050816]" : "bg-gray-50"}`}>
                <div className="space-y-4">
                  {/* Card Entradas */}
                  <div className={`rounded-2xl p-5 border-2 ${isDarkMode ? "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50" : "bg-gradient-to-br from-white to-gray-50 border-gray-200"}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-emerald-500/20" : "bg-blue-100"}`}>
                        <Truck className={`h-5 w-5 ${isDarkMode ? "text-emerald-400" : "text-blue-600"}`} />
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Entradas
                      </span>
                    </div>
                    <p className={`text-4xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {formatInteger(monthStats.totalTrucks)}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>caminhões no mês</p>
                  </div>

                  {/* Card Toneladas */}
                  <div className={`rounded-2xl p-5 border-2 ${isDarkMode ? "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50" : "bg-gradient-to-br from-white to-gray-50 border-gray-200"}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-emerald-500/20" : "bg-green-100"}`}>
                        <svg className={`h-5 w-5 ${isDarkMode ? "text-emerald-400" : "text-green-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Toneladas
                      </span>
                    </div>
                    <p className={`text-4xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {formatToneladas(monthStats.totalTonnage)}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>toneladas no mês</p>
                  </div>

                  {/* Card Média Geral */}
                  {monthStats.hasData && (
                    <div className={`rounded-2xl p-5 border-2 ${isDarkMode ? "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50" : "bg-gradient-to-br from-white to-gray-50 border-gray-200"}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-emerald-500/20" : "bg-amber-100"}`}>
                          <svg className={`h-5 w-5 ${isDarkMode ? "text-emerald-400" : "text-amber-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Média Geral
                        </span>
                      </div>

                      {/* RI - Destaque */}
                      <div className={`rounded-xl p-4 mb-3 ${
                        monthStats.qualityMetrics.ri > 500
                          ? isDarkMode ? "bg-red-500/15 border border-red-500/30" : "bg-red-50 border border-red-200"
                          : isDarkMode ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-emerald-50 border border-emerald-200"
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${
                            monthStats.qualityMetrics.ri > 500
                              ? isDarkMode ? "text-red-400" : "text-red-600"
                              : isDarkMode ? "text-emerald-400" : "text-emerald-600"
                          }`}>RI</span>
                          <span className={`text-2xl font-bold ${
                            monthStats.qualityMetrics.ri > 500
                              ? isDarkMode ? "text-red-300" : "text-red-700"
                              : isDarkMode ? "text-emerald-300" : "text-emerald-700"
                          }`}>{formatRi(monthStats.qualityMetrics.ri)}</span>
                        </div>
                      </div>

                      {/* Grid 2x2 para outras métricas */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "UMI", value: monthStats.qualityMetrics.umi, limit: 0.2, formatter: formatUmi },
                          { label: "CIN", value: monthStats.qualityMetrics.cin, limit: 0.2, formatter: formatCin },
                          { label: "POL", value: monthStats.qualityMetrics.pol, minLimit: 98.9, maxLimit: 99.6, formatter: formatPol },
                          { label: "COR", value: monthStats.qualityMetrics.cor, limit: 1250, formatter: formatCor },
                        ].map((metric) => {
                          const isOut = metric.minLimit 
                            ? (metric.value < metric.minLimit || metric.value > metric.maxLimit!)
                            : metric.value > metric.limit!
                          return (
                            <div 
                              key={metric.label}
                              className={`rounded-xl p-3 ${
                                isOut
                                  ? isDarkMode ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-100"
                                  : isDarkMode ? "bg-white/5 border border-white/10" : "bg-white border border-gray-100"
                              }`}
                            >
                              <p className={`text-[10px] font-bold uppercase mb-1 ${
                                isOut
                                  ? isDarkMode ? "text-red-400" : "text-red-500"
                                  : isDarkMode ? "text-gray-500" : "text-gray-500"
                              }`}>{metric.label}</p>
                              <p className={`text-lg font-bold ${
                                isOut
                                  ? isDarkMode ? "text-red-300" : "text-red-600"
                                  : isDarkMode ? "text-white" : "text-gray-900"
                              }`}>
                                {metric.formatter(metric.value)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ====== BOTTOM SHEET: Menu do Header (Módulo + Produto) ====== */}
      {isHeaderMenuOpen && (
        <>
          <div
            className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm ${isHeaderMenuClosing ? "backdrop-exit" : "backdrop-enter"}`}
            onClick={closeHeaderMenu}
          />
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 ${
              isDarkMode ? "bg-[#0a0f1e]" : "bg-white"
            } rounded-t-3xl shadow-2xl ${isHeaderMenuClosing ? "bottom-sheet-exit" : "bottom-sheet-enter"}`}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className={`w-10 h-1 rounded-full ${isDarkMode ? "bg-white/20" : "bg-gray-300"}`} />
            </div>

            {/* Header */}
            <div
              className={`flex items-center justify-between px-5 pb-4 border-b ${isDarkMode ? "border-white/10" : "border-gray-100"}`}
            >
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Navegar</h2>
              <button
                onClick={closeHeaderMenu}
                className={`p-2 rounded-xl ${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              >
                <X className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 pb-8 space-y-6">
              {/* Seletor de Módulo */}
              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                >
                  Módulo
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleModuleChange("recepcao")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all touch-press ${
                      currentModule === "recepcao"
                        ? isDarkMode
                          ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500"
                          : "bg-blue-500/10 text-blue-600 ring-2 ring-blue-500"
                        : isDarkMode
                          ? "bg-white/5 text-gray-300 hover:bg-white/10"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Truck className="h-6 w-6" />
                    <span className="font-semibold text-sm">Recepção</span>
                  </button>
                  <button
                    onClick={() => handleModuleChange("embarque")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all touch-press ${
                      currentModule === "embarque"
                        ? isDarkMode
                          ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500"
                          : "bg-blue-500/10 text-blue-600 ring-2 ring-blue-500"
                        : isDarkMode
                          ? "bg-white/5 text-gray-300 hover:bg-white/10"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Ship className="h-6 w-6" />
                    <span className="font-semibold text-sm">Embarque</span>
                  </button>
                </div>
              </div>

              {/* Seletor de Produto */}
              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                >
                  Produto
                </p>
                <button
                  onClick={() => handleProductChange("acucar")}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all touch-press ${
                    currentProduct === "acucar"
                      ? isDarkMode
                        ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500"
                        : "bg-blue-500/10 text-blue-600 ring-2 ring-blue-500"
                      : isDarkMode
                        ? "bg-white/5 text-gray-300 hover:bg-white/10"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <SugarCaneIcon className="h-6 w-6" />
                  <span className="font-semibold">Açúcar</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ====== BOTTOM SHEET: Configurações ====== */}
      {isBottomSheetOpen && (
        <>
          <div
            className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm ${isBottomSheetClosing ? "backdrop-exit" : "backdrop-enter"}`}
            onClick={closeBottomSheet}
          />
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 ${
              isDarkMode ? "bg-[#0a0f1e]" : "bg-white"
            } rounded-t-3xl shadow-2xl ${isBottomSheetClosing ? "bottom-sheet-exit" : "bottom-sheet-enter"}`}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className={`w-10 h-1 rounded-full ${isDarkMode ? "bg-white/20" : "bg-gray-300"}`} />
            </div>

            {/* Header */}
            <div
              className={`flex items-center justify-between px-5 pb-4 border-b ${isDarkMode ? "border-white/10" : "border-gray-100"}`}
            >
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Configurações</h2>
              <button
                onClick={closeBottomSheet}
                className={`p-2 rounded-xl ${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              >
                <X className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 pb-8">
              {/* User Info */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0 relative"
                  style={{
                    background: "linear-gradient(135deg, rgb(16, 185, 129), rgb(5, 150, 105))",
                  }}
                >
                  <User className="h-6 w-6 absolute opacity-20" />
                  <span className="relative">{username.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{username}</p>
                  <p className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>Usuário</p>
                </div>
              </div>

              {/* Settings Link */}
              <Link
                href="/settings/account"
                className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                  isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className={`h-5 w-5 ${isDarkMode ? "text-emerald-400" : "text-blue-600"}`} />
                  <span className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>Meus Dados</span>
                </div>
                <ChevronRight className={`h-4 w-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
              </Link>

              {/* Theme Toggle */}
              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-wide mb-2.5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                >
                  Aparência
                </p>
                <button
                  onClick={onToggleTheme}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                    isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isDarkMode ? (
                      <Moon className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Sun className="h-5 w-5 text-amber-500" />
                    )}
                    <span className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      Tema {isDarkMode ? "Escuro" : "Claro"}
                    </span>
                  </div>
                  <div
                    className={`relative w-12 h-7 rounded-full transition-colors ${isDarkMode ? "bg-emerald-500" : "bg-gray-300"}`}
                  >
                    <div
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                        isDarkMode ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </div>
                </button>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  isDarkMode
                    ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    : "bg-red-50 text-red-600 hover:bg-red-100"
                }`}
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sair da conta</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Month Select Modal */}
      {isMonthSelectOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm backdrop-enter"
            onClick={() => setIsMonthSelectOpen(false)}
          />
          <div
            className={`fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-3xl p-5 ${
              isDarkMode ? "bg-[#0a0f1e]" : "bg-white"
            } shadow-2xl max-h-[80vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Selecionar Mês</h3>
              <button
                onClick={() => setIsMonthSelectOpen(false)}
                className={`p-2 rounded-xl ${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              >
                <X className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
              </button>
            </div>

            {/* Year Selector */}
            <div className="flex items-center justify-center gap-4 mb-5">
              <button
                onClick={() => setTempYear(tempYear - 1)}
                disabled={tempYear <= 2025}
                className={`p-2.5 rounded-xl ${isDarkMode ? "hover:bg-white/10 disabled:opacity-30" : "hover:bg-gray-100 disabled:opacity-30"}`}
              >
                <ChevronLeft className={`h-5 w-5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`} />
              </button>
              <span className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{tempYear}</span>
              <button
                onClick={() => setTempYear(tempYear + 1)}
                disabled={tempYear >= new Date().getFullYear()}
                className={`p-2.5 rounded-xl ${isDarkMode ? "hover:bg-white/10 disabled:opacity-30" : "hover:bg-gray-100 disabled:opacity-30"}`}
              >
                <ChevronRight className={`h-5 w-5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`} />
              </button>
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {months.map((month, index) => {
                const now = new Date()
                const isDisabled = tempYear === now.getFullYear() && index > now.getMonth()
                const isSelected = tempMonthIndex === index

                return (
                  <button
                    key={month}
                    onClick={() => !isDisabled && setTempMonthIndex(index)}
                    disabled={isDisabled}
                    className={`p-3.5 rounded-xl text-sm font-semibold transition-all touch-press ${
                      isSelected
                        ? isDarkMode
                          ? "bg-emerald-500 text-white"
                          : "bg-blue-500 text-white"
                        : isDisabled
                          ? "opacity-30 cursor-not-allowed"
                          : isDarkMode
                            ? "bg-white/5 text-gray-300 hover:bg-white/10"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {monthsShort[index]}
                  </button>
                )
              })}
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyMonthSelection}
              className={`w-full py-3.5 rounded-xl font-semibold transition-all touch-press ${
                isDarkMode
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Aplicar
            </button>
          </div>
        </>
      )}

      {/* Day View Overlay */}
      {selectedDay && (
        <DayViewMobileOverlay
          selectedDay={selectedDay}
          onClose={() => {
            setSelectedDay(null)
            setSearchQuery("") // Clear search query when closing
          }}
          trucksByDate={trucksByDate}
          isDarkMode={isDarkMode}
          initialSearchTerm={searchQuery}
          onPreviousDay={() => {
            const newDate = new Date(selectedDay)
            newDate.setDate(newDate.getDate() - 1)
            setSelectedDay(newDate)
          }}
          onNextDay={() => {
            const newDate = new Date(selectedDay)
            newDate.setDate(newDate.getDate() + 1)
            setSelectedDay(newDate)
          }}
        />
      )}
      
      {/* Global Search Modal */}
      {showGlobalSearch && (
        <div className="fixed inset-0 z-[100] flex flex-col">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowGlobalSearch(false)
              setGlobalSearchTerm("")
              setSearchResults([])
            }}
          />
          
          {/* Search Container - Full height on mobile */}
          <div 
            className={`relative flex flex-col h-full safe-area-inset ${
              isDarkMode 
                ? "bg-[#0B1017]" 
                : "bg-white"
            }`}
          >
            {/* Search Header */}
            <div className={`flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 ${isDarkMode ? "border-white/10" : "border-gray-200"}`}>
              <Search className={`h-5 w-5 flex-shrink-0 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
              <input
                type="text"
                placeholder="Pesquisar placa, NF, cliente..."
                value={globalSearchTerm}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                autoFocus
                className={`flex-1 text-base outline-none bg-transparent ${
                  isDarkMode ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"
                }`}
              />
              <button
                onClick={() => {
                  setShowGlobalSearch(false)
                  setGlobalSearchTerm("")
                  setSearchResults([])
                }}
                className={`p-2 rounded-xl flex-shrink-0 ${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              >
                <X className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
              </button>
            </div>
            
            {/* Search Results */}
            <div className="flex-1 overflow-y-auto">
              {globalSearchTerm.length < 2 ? (
                <div className={`px-4 py-16 text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                  <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-medium">Digite para pesquisar</p>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                    Placa, nota fiscal, cliente ou fornecedor
                  </p>
                </div>
              ) : isSearching ? (
                <div className={`px-4 py-16 text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                  <div className="animate-spin h-10 w-10 border-2 border-current border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-sm">Pesquisando...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className={`px-4 py-16 text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                  <Truck className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-medium">Nenhum resultado</p>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                    Tente outro termo de pesquisa
                  </p>
                </div>
              ) : (
                <div>
                  <div className={`px-4 py-2 sticky top-0 ${isDarkMode ? "bg-[#0B1017] border-b border-white/5" : "bg-white border-b border-gray-100"}`}>
                    <span className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {searchResults.length} resultado{searchResults.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {searchResults.map((result, idx) => {
                    const statusColors = result.truck.status === "approved"
                      ? isDarkMode ? "text-green-400" : "text-green-600"
                      : result.truck.status === "apurado"
                        ? isDarkMode ? "text-amber-400" : "text-amber-600"
                        : isDarkMode ? "text-rose-400" : "text-rose-600"
                    
                    const StatusIcon = result.truck.status === "approved" 
                      ? CheckCircle2 
                      : result.truck.status === "apurado" 
                        ? AlertTriangle 
                        : XCircle
                    
                    return (
                      <button
                        key={`${result.dateStr}-${result.truck.id}-${idx}`}
                        onClick={() => handleSearchResultClick(result)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left border-b ${
                          isDarkMode ? "border-white/5 active:bg-white/5" : "border-gray-100 active:bg-gray-50"
                        }`}
                      >
                        {/* Status Icon */}
                        <div className={`flex-shrink-0 p-2.5 rounded-xl ${
                          result.truck.status === "approved"
                            ? isDarkMode ? "bg-green-500/20" : "bg-green-100"
                            : result.truck.status === "apurado"
                              ? isDarkMode ? "bg-amber-500/20" : "bg-amber-100"
                              : isDarkMode ? "bg-rose-500/20" : "bg-rose-100"
                        }`}>
                          <StatusIcon className={`h-5 w-5 ${statusColors}`} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                              {result.truck.licensePlate}
                            </span>
                            {result.truck.nfNumber && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                isDarkMode ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-600"
                              }`}>
                                NF {result.truck.nfNumber}
                              </span>
                            )}
                          </div>
                          <div className={`text-sm truncate ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                            {result.truck.client}
                          </div>
                        </div>
                        
                        {/* Date */}
                        <div className="flex-shrink-0">
                          <div className={`flex items-center gap-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="text-xs">
                              {result.date.toLocaleDateString("pt-BR", { 
                                day: "2-digit", 
                                month: "short" 
                              })}
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
