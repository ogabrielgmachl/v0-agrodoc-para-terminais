"use client"

import Link from "next/link"

import Image from "next/image"
import { useMemo, useState, useEffect } from "react" // Import useState and useEffect
import {
  ChevronLeft,
  ChevronRight,
  TruckIcon,
  Moon,
  Sun,
  Weight,
  Activity,
  LogOut,
  Ship,
  ChevronDown,
  Search,
  X,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DayStatsByDate } from "@/lib/load-trucks"
import { formatInteger, formatCor, formatPol, formatUmi, formatCin, formatRi, formatToneladas } from "@/lib/utils"
import { DayViewOverlay } from "./DayViewOverlay"
import type { DayShipsStats } from "@/lib/load-ships"
// Import icons from updates
import { SugarCaneIcon, SoybeanIcon, CornIcon } from "@/components/icons"
// Import EmbarqueModule
import EmbarqueModule from "./EmbarqueModule"
// Import calculateEmbarqueMonthStats
import { calculateEmbarqueMonthStats } from "@/lib/embarque-stats"

// Interfaces e tipos necessários
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

const qualityLimits = {
  pol: { min: 98.9, max: 99.6 }, // Changed to 98.90 and 99.60
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

interface DashboardMobileProps {
  currentYear: number
  currentMonthIndex: number
  selectedDay: Date | null
  sidebarOpen: boolean
  isDarkMode: boolean
  detailsSidebarOpen: boolean
  searchQuery: string
  currentPage: number
  filterStatus: "all" | "approved" | "apurado" | "rejected"
  isFullscreen: boolean
  showLogoutMenu: boolean
  trucks: TruckData[]
  isLoadingTrucks: boolean
  trucksByDate: Record<string, TruckData[]>
  dayStatsByDate: DayStatsByDate
  showDayAverageDialog: boolean
  showAverageCards: boolean
  tableViewMode: "main" | "by-client"
  expandedGroups: Set<string>
  expandedSuppliers: Set<string>
  currentModule: "recepcao" | "embarque"
  currentProduct: "acucar" | "soja" | "milho"
  recepcaoMenuExpanded: boolean
  navigationExpanded: boolean
  showRotativeStock: boolean
  itemsPerPage: number
  isMonthSelectOpen: boolean // Add this prop
  onRefreshData?: () => void // Added for refresh functionality

  setCurrentYear: (year: number) => void
  setCurrentMonthIndex: (month: number) => void
  setSelectedDay: (day: Date | null) => void
  setSidebarOpen: (open: boolean) => void
  setIsDarkMode: (dark: boolean) => void
  setReportsMenuOpen: (open: boolean) => void
  setDetailsSidebarOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setCurrentPage: (page: number) => void
  setFilterStatus: (status: "all" | "approved" | "apurado" | "rejected") => void
  setIsFullscreen: (fullscreen: boolean) => void
  setShowLogoutMenu: (show: boolean) => void
  setShowDayAverageDialog: (show: boolean) => void
  setShowAverageCards: (show: boolean) => void
  setTableViewMode: (mode: "main" | "by-client") => void
  setExpandedGroups: (groups: Set<string>) => void
  setExpandedSuppliers: (suppliers: Set<string>) => void
  setCurrentModule: (module: "recepcao" | "embarque") => void
  setCurrentProduct: (product: "acucar" | "soja" | "milho") => void
  setRecepcaoMenuExpanded: (expanded: boolean) => void
  setNavigationExpanded: (expanded: boolean) => void
  setShowRotativeStock: (show: boolean) => void
  setIsMonthSelectOpen: (open: boolean) => void // Add this setter

  getTruckData: (date: Date) => number
  getFilteredTrucks: () => TruckData[]
  getPaginatedTrucks: () => TruckData[]
  getDailyAverages: (date: Date | null) => any
  handleDayClick: (date: Date, truckCount: number) => void
  handlePreviousMonth: () => void
  handleNextMonth: () => void
  handleLogout: () => void
  handleExportCSV: () => void
  toggleSidebar: () => void
  handleModuleChange: (module: "recepcao" | "embarque", product: "acucar" | "soja" | "milho") => void
  selectedDateFormatted: string
  hasDayStats: boolean
  statsToday: any
  getLast7DaysData: any[]
  monthStats: any
  selectedDayDateStr: string | null
  totalPages: number
  // Removed duplicated 'Ship' type import
  shipsByDate?: Record<string, any[]> // Changed type to any[] to avoid redeclaration
  shipStatsByDate?: Record<string, DayShipsStats>
}

// Define ITEMS_PER_PAGE constant
const ITEMS_PER_PAGE = 10

export function DashboardMobile({
  currentYear,
  currentMonthIndex,
  selectedDay,
  sidebarOpen,
  isDarkMode,
  detailsSidebarOpen,
  searchQuery,
  currentPage,
  filterStatus,
  showLogoutMenu,
  trucksByDate,
  showAverageCards,
  tableViewMode,
  expandedGroups,
  expandedSuppliers,
  currentModule,
  currentProduct,
  navigationExpanded,
  itemsPerPage: propItemsPerPage, // Renamed to avoid conflict
  setSidebarOpen,
  setIsDarkMode,
  setDetailsSidebarOpen,
  setSearchQuery,
  setCurrentPage,
  setFilterStatus,
  setShowLogoutMenu,
  setShowAverageCards,
  setTableViewMode,
  setExpandedGroups,
  setExpandedSuppliers,
  setCurrentModule,
  setCurrentProduct,
  setNavigationExpanded,
  setSelectedDay,
  getTruckData,
  handleDayClick,
  handlePreviousMonth,
  handleNextMonth,
  handleLogout,
  selectedDateFormatted,
  monthStats,
  isMonthSelectOpen, // Use the prop
  setIsMonthSelectOpen, // Use the setter
  shipsByDate = {},
  shipStatsByDate = {},
  totalPages: propTotalPages, // Renamed to avoid conflict
  onRefreshData, // Use the passed function
}: DashboardMobileProps) {
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  // Use a new state for searchTerm to avoid conflicts with props.searchQuery
  const [searchTerm, setSearchTerm] = useState(searchQuery || "")
  const [isRefreshing, setIsRefreshing] = useState(false) // Declare setIsRefreshing state
  
  // Global search state
  const [globalSearchTerm, setGlobalSearchTerm] = useState("")
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    truck: TruckData
    dateStr: string
    date: Date
  }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
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

  const currentMonth = `${months[currentMonthIndex]} de ${currentYear}`
  const weekDays = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."]

  const calendarDays = useMemo(() => {
    return generateCalendarDays(currentYear, currentMonthIndex)
  }, [currentYear, currentMonthIndex])

  const productNames: Record<"acucar" | "soja" | "milho", string> = {
    acucar: "Açúcar",
    soja: "Soja",
    milho: "Milho",
  }

  const getQualityStatus = (date: Date): "complete" | "incomplete" => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const trucks = trucksByDate[dateStr] || []

    if (trucks.length === 0) return "complete"

    // Check if any truck has incomplete data
    for (const truck of trucks) {
      if (hasIncompleteData(truck)) {
        return "incomplete"
      }
    }

    return "complete"
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

  // Handle ESC key to close search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showGlobalSearch) {
        setShowGlobalSearch(false)
        setGlobalSearchTerm("")
        setSearchResults([])
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showGlobalSearch])
  
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
      setSidebarOpen(false) // Close sidebar when changing month/year
      setIsDarkMode(false) // Close dark mode when changing month/year
      setCurrentPage(1) // Reset current page when changing month/year
      setFilterStatus("all") // Reset filter status when changing month/year
      setTableViewMode("main") // Reset table view mode when changing month/year
      setExpandedGroups(new Set()) // Reset expanded groups when changing month/year
      setExpandedSuppliers(new Set()) // Reset expanded suppliers when changing month/year
      setShowOnlyIncomplete(false) // Reset incomplete filter when changing month/year
      setIsMonthSelectOpen(true) // Open month select when changing month/year
    }
    
    // Set search query to the truck's license plate so it's filtered in day view
    setSearchQuery(result.truck.licensePlate)
    
    // Open day view with details sidebar
    setSelectedDay(resultDate)
    setDetailsSidebarOpen(true) // Open details sidebar to show DayViewOverlay
    setShowGlobalSearch(false)
    setGlobalSearchTerm("")
    setSearchResults([])
  }

  const getDayQualityIndicator = (date: Date): "rejected" | "apurado" | null => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const trucks = trucksByDate[dateStr] || []

    if (trucks.length === 0) return null

    // Check only trucks with complete data
    const completeTrucks = trucks.filter((t) => !hasIncompleteData(t))
    if (completeTrucks.length === 0) return null

    // Priority: rejected > apurado
    if (completeTrucks.some((t) => t.status === "rejected")) return "rejected"
    if (completeTrucks.some((t) => t.status === "apurado")) return "apurado"

    return null
  }

  const getTrucksWithoutAnalysis = (day: Date | null) => {
    if (!day) return 0
    const dayTrucks = getTruckDetails(day) // Use same base as cards
    const awaitingTrucks = dayTrucks.filter(hasIncompleteData)

    // Debug logging when DEBUG_CSV is enabled
    if (process.env.NEXT_PUBLIC_DEBUG_CSV === "true") {
      console.log(`[v0] Awaiting count for ${day.toISOString().split("T")[0]}:`, {
        totalTrucks: dayTrucks.length,
        awaitingCount: awaitingTrucks.length,
        approvedCount: dayTrucks.filter((t) => t.status === "approved").length,
        rejectedCount: dayTrucks.filter((t) => t.status === "rejected").length,
        apuradoCount: dayTrucks.filter((t) => t.status === "apurado").length,
      })
    }

    return awaitingTrucks.length
  }

  const getTruckDetails = (date: Date | null) => {
    if (!date) return []
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const trucks = trucksByDate[dateStr] || []
    return trucks.map((truck) => {
      const isOutOfSpecValues = {
        cor: truck.cor !== null && isOutOfSpec("cor", truck.cor),
        pol: truck.pol !== null && isOutOfSpec("pol", truck.pol),
        um: truck.umi !== null && isOutOfSpec("um", truck.umi),
        cin: truck.cin !== null && isOutOfSpec("cin", truck.cin),
        ri: truck.ri !== null && isOutOfSpec("ri", truck.ri),
      }
      const hasOtherOutOfSpec = Object.values(isOutOfSpecValues).some((val) => val)
      return { ...truck, hasOtherOutOfSpec }
    })
  }

  const getDerivedTruckLists = (day: Date | null) => {
    const all = getTruckDetails(day)
    const incomplete = all.filter(hasIncompleteData)
    const complete = all.filter((t) => !hasIncompleteData(t))
    return { all, incomplete, complete }
  }

  useEffect(() => {
    setShowOnlyIncomplete(false)
  }, [selectedDay])

  // Filter trucks based on incomplete data filter, search, and status
  const getFilteredTrucks = () => {
    if (!selectedDay) return []
    const dateStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`
    let trucks = trucksByDate[dateStr] || []

    if (showOnlyIncomplete) {
      trucks = trucks.filter(hasIncompleteData)
    } else {
      // Only apply search and status filters
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        trucks = trucks.filter(
          (t) =>
            t.licensePlate.toLowerCase().includes(term) ||
            t.client.toLowerCase().includes(term) ||
            t.supplier.toLowerCase().includes(term) ||
            (t.nfNumber && t.nfNumber.toLowerCase().includes(term)),
        )
      }

      if (filterStatus !== "all") {
        trucks = trucks.filter((t) => !hasIncompleteData(t) && t.status === filterStatus)
      }
    }

    return trucks
  }

  // Use getFilteredTrucks and ITEMS_PER_PAGE
  const getPaginatedTrucks = () => {
    const filtered = getFilteredTrucks()
    return filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  }

  // Use getFilteredTrucks and ITEMS_PER_PAGE
  const totalPages = Math.ceil(getFilteredTrucks().length / ITEMS_PER_PAGE)

  // Define defaultCellStyle here
  const defaultCellStyle = `px-4 py-3 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`

  // Calculate Embarque Month Stats using the imported function
  const embarqueStats = useMemo(() => {
    return calculateEmbarqueMonthStats({
      shipsByDate,
      year: currentYear,
      monthIndex: currentMonthIndex,
      onlyUntilToday: true,
    })
  }, [shipsByDate, currentYear, currentMonthIndex])

  const handleRefresh = () => {
    setIsRefreshing(true)
    if (onRefreshData) {
      onRefreshData()
    }
    setTimeout(() => {
      setIsRefreshing(false)
    }, 2000) // Simulate refresh delay
  }

  return (
    <div className={`flex h-screen flex-col ${isDarkMode ? "bg-[#050816]" : "bg-gray-100"}`}>
      {isDarkMode && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div
            className="absolute -left-32 -top-32 h-[700px] w-[700px] rounded-full bg-emerald-400/20 blur-[200px]"
            style={{ filter: "blur(150px)" }}
          />
          <div
            className="absolute right-0 top-1/4 h-[600px] w-[600px] rounded-full bg-yellow-400/10 blur-[180px]"
            style={{ filter: "blur(180px)" }}
          />
          <div
            className="absolute -bottom-40 left-1/3 h-[550px] w-[550px] rounded-full bg-sky-500/15 blur-[160px]"
            style={{ filter: "blur(160px)" }}
          />
          <div
            className="absolute right-1/4 bottom-1/4 h-[450px] w-[450px] rounded-full bg-emerald-500/12 blur-[140px]"
            style={{ filter: "blur(140px)" }}
          />
        </div>
      )}

      {!detailsSidebarOpen && (
        <header
          className={`relative z-50 flex shrink-0 items-center justify-between border-b px-3 py-2.5 sm:px-4 sm:py-3 backdrop-blur-sm ${isDarkMode ? "border-white/10 bg-[#060b1a]/90" : "bg-white"}`}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`h-9 w-9 sm:h-10 sm:w-10 ${isDarkMode ? "text-gray-100 hover:bg-white/10 hover:text-white" : "text-gray-600"}`}
              title={sidebarOpen ? "Ocultar sidebar" : "Expandir sidebar"}
            >
              {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-6 w-6 items-center justify-center sm:h-9 sm:w-9">
                <Image
                  src="/images/agrodoc-icon.png"
                  alt="AGRODOC"
                  width={37}
                  height={37}
                  className="h-6 w-6 sm:h-9 sm:w-9"
                />
              </div>
              <span className={`text-sm sm:text-lg font-bold ${isDarkMode ? "text-gray-100" : "text-gray-700"}`}>
                AGRODOC
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {!detailsSidebarOpen && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousMonth}
                  disabled={currentYear === 2025 && currentMonthIndex === 11}
                  className={`h-8 w-8 sm:h-10 sm:w-10 ${isDarkMode ? "text-gray-100 hover:bg-white/10 hover:text-white" : "text-gray-600"}`}
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>

                <h1
                  className={`min-w-[120px] text-center text-xs sm:min-w-[180px] sm:text-lg lg:text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-700"}`}
                >
                  {currentMonth}
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={
                    currentYear > new Date().getFullYear() ||
                    (currentYear === new Date().getFullYear() && currentMonthIndex >= new Date().getMonth())
                  }
                  className={`h-8 w-8 sm:h-10 sm:w-10 ${isDarkMode ? "text-gray-100 hover:bg-white/10 hover:text-white" : "text-gray-600"}`}
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
              {/* Search Button */}
              <button
                onClick={() => setShowGlobalSearch(true)}
                className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center transition-colors ${
                  isDarkMode 
                    ? "text-gray-400 hover:bg-white/10 hover:text-white" 
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
                title="Pesquisar caminhões"
              >
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              
              <div className="relative">
              <button
                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                className="group relative h-8 w-8 sm:h-10 sm:w-10 rounded-full overflow-hidden"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br from-green-600 to-green-700 rounded-full ${isDarkMode ? "opacity-80" : ""}`}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </button>

              {showLogoutMenu && (
                <>
                  <div className="fixed inset-0 z-60" onClick={() => setShowLogoutMenu(false)} />
                  <div
                    className={`absolute right-0 top-full mt-2 z-70 w-56 rounded-xl shadow-lg backdrop-blur-xl border overflow-hidden ${isDarkMode ? "bg-[#0B1017] border-white/10" : "bg-white border-gray-200"}`}
                  >
                    <div className={`px-3 py-2 border-b ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                      >
                        Configurações
                      </p>
                    </div>

                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-sm ${isDarkMode ? "text-gray-100 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      <div className="flex items-center gap-3">
                        {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        <span>Tema {isDarkMode ? "Escuro" : "Claro"}</span>
                      </div>
                      <div
                        className={`relative w-10 h-5 rounded-full transition-colors ${isDarkMode ? "bg-green-600" : "bg-gray-300"}`}
                      >
                        <div
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isDarkMode ? "translate-x-5" : "translate-x-0.5"}`}
                        />
                      </div>
                    </button>

                    <div className={`border-t ${isDarkMode ? "border-white/10" : "border-gray-100"}`} />

                    <div className={`px-3 py-2 border-b ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                      >
                        Conta
                      </p>
                    </div>

                    <Link
                      href="/settings/account"
                      className={`flex w-full items-center gap-3 px-4 py-3 text-sm ${isDarkMode ? "text-gray-100 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>Meus dados</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-sm ${isDarkMode ? "text-gray-100 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sair</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Success notification */}

      <div className="relative z-0 flex min-h-0 flex-1 overflow-hidden">
        {!detailsSidebarOpen && (
          <aside
            className={`${
              sidebarOpen ? "w-64 sm:w-72" : "w-0"
            } transition-all duration-300 ease-in-out shrink-0 flex flex-col overflow-hidden z-40 ${isDarkMode ? "bg-[#050816]/90 border-r border-white/12" : "border-r border-gray-200 bg-white"}`}
          >
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <button
                  onClick={() => setNavigationExpanded(!navigationExpanded)}
                  className={`w-full flex items-center justify-between text-xs font-bold mb-2 px-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  <span>NAVEGAÇÃO</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${navigationExpanded ? "" : "-rotate-90"}`} />
                </button>

                {navigationExpanded && (
                  <div className="space-y-2">
                    <div className={`rounded-lg p-2 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                      <p
                        className={`text-[10px] font-semibold mb-1.5 px-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                      >
                        MÓDULO
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setCurrentModule("recepcao")}
                          className={`flex-1 flex flex-col items-center justify-center rounded-md p-2 ${
                            currentModule === "recepcao"
                              ? isDarkMode
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-blue-500 text-white"
                              : isDarkMode
                                ? "bg-white/5 text-gray-400"
                                : "bg-white text-gray-600"
                          }`}
                          title="Recepção"
                        >
                          <TruckIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentModule("embarque")
                            setCurrentProduct("acucar")
                          }}
                          className={`flex-1 flex flex-col items-center justify-center rounded-md p-2 ${
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
                          <Ship className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className={`rounded-lg p-2 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                      <p
                        className={`text-[10px] font-semibold mb-1.5 px-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                      >
                        PRODUTO
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setCurrentProduct("acucar")}
                          className={`flex-1 flex flex-col items-center justify-center rounded-md p-2 ${
                            currentProduct === "acucar"
                              ? isDarkMode
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-blue-500 text-white"
                              : isDarkMode
                                ? "bg-white/5 text-gray-400"
                                : "bg-white text-gray-600"
                          }`}
                          title="Açúcar"
                        >
                          <SugarCaneIcon className="h-4 w-4" />
                        </button>
                        {currentModule === "recepcao" && (
                          <>
                            <button
                              disabled
                              className={`flex-1 flex flex-col items-center justify-center rounded-md p-2 opacity-40 cursor-not-allowed ${
                                isDarkMode ? "bg-white/5 text-gray-500" : "bg-white text-gray-400"
                              }`}
                              title="Soja (em breve)"
                            >
                              <SoybeanIcon className="h-4 w-4" />
                            </button>
                            <button
                              disabled
                              className={`flex-1 flex flex-col items-center justify-center rounded-md p-2 opacity-40 cursor-not-allowed ${
                                isDarkMode ? "bg-white/5 text-gray-500" : "bg-white text-gray-400"
                              }`}
                              title="Milho (em breve)"
                            >
                              <CornIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                className="mb-4 pt-4 border-t"
                style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
              >
                <h3 className={`text-lg sm:text-xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
                  {currentModule === "recepcao"
                    ? `Recepção de ${productNames[currentProduct]}`
                    : `Embarque de ${productNames[currentProduct]}`}
                </h3>
              </div>
              <div className="space-y-3">
                {currentModule === "recepcao" ? (
                  <>
                    {/* KPIs de Recepção - Design Melhorado */}
                    <div className={`rounded-xl p-4 border-2 transition-all ${isDarkMode ? "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50" : "bg-gradient-to-br from-white to-gray-50 border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${isDarkMode ? "bg-emerald-500/20" : "bg-blue-100"}`}>
                            <TruckIcon className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-blue-600"}`} />
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                            Entradas
                          </span>
                        </div>
                      </div>
                      <p className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {monthStats.hasData ? formatInteger(monthStats.totalTrucks) : "0"}
                      </p>
                      <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>caminhões no mês</p>
                    </div>

                    <div className={`rounded-xl p-4 border-2 transition-all ${isDarkMode ? "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50" : "bg-gradient-to-br from-white to-gray-50 border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${isDarkMode ? "bg-emerald-500/20" : "bg-green-100"}`}>
                            <Weight className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-green-600"}`} />
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                            Toneladas
                          </span>
                        </div>
                      </div>
                      <p className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {monthStats.hasData ? formatToneladas(monthStats.totalTonnage) : "—"}
                      </p>
                      <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>toneladas no mês</p>
                    </div>

                    <div className={`rounded-xl p-4 border-2 transition-all ${isDarkMode ? "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50" : "bg-gradient-to-br from-white to-gray-50 border-gray-200"}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-2 rounded-lg ${isDarkMode ? "bg-emerald-500/20" : "bg-amber-100"}`}>
                          <Activity className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-amber-600"}`} />
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Média Geral
                        </span>
                      </div>
                      {monthStats.hasData ? (
                        <div className="space-y-2">
                          {/* RI - Destaque maior */}
                          <div className={`rounded-lg p-3 ${
                            monthStats.qualityMetrics?.ri && monthStats.qualityMetrics.ri > 500
                              ? isDarkMode ? "bg-red-500/15 border border-red-500/30" : "bg-red-50 border border-red-200"
                              : isDarkMode ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-emerald-50 border border-emerald-200"
                          }`}>
                            <div className="flex items-center justify-between">
                              <p className={`text-[10px] font-bold uppercase ${
                                monthStats.qualityMetrics?.ri && monthStats.qualityMetrics.ri > 500
                                  ? isDarkMode ? "text-red-400" : "text-red-600"
                                  : isDarkMode ? "text-emerald-400" : "text-emerald-600"
                              }`}>RI</p>
                              <p className={`text-xl font-bold ${
                                monthStats.qualityMetrics?.ri && monthStats.qualityMetrics.ri > 500
                                  ? isDarkMode ? "text-red-300" : "text-red-700"
                                  : isDarkMode ? "text-emerald-300" : "text-emerald-700"
                              }`}>
                                {formatRi(monthStats.qualityMetrics?.ri ?? 0)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Grid 2x2 para outras métricas */}
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "UMI", value: monthStats.qualityMetrics?.umi ?? 0, limit: 0.2, formatter: formatUmi },
                              { label: "CIN", value: monthStats.qualityMetrics?.cin ?? 0, limit: 0.2, formatter: formatCin },
                              { label: "POL", value: monthStats.qualityMetrics?.pol ?? 0, minLimit: 98.9, maxLimit: 99.6, formatter: formatPol },
                              { label: "COR", value: monthStats.qualityMetrics?.cor ?? 0, limit: 1250, formatter: formatCor },
                            ].map((metric) => {
                              const isOut = metric.minLimit 
                                ? (metric.value < metric.minLimit || metric.value > metric.maxLimit!)
                                : metric.value > metric.limit!
                              return (
                                <div 
                                  key={metric.label}
                                  className={`rounded-lg p-2.5 ${
                                    isOut
                                      ? isDarkMode ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-100"
                                      : isDarkMode ? "bg-white/5 border border-white/10" : "bg-white border border-gray-100"
                                  }`}
                                >
                                  <p className={`text-[10px] font-medium mb-0.5 ${
                                    isOut
                                      ? isDarkMode ? "text-red-400" : "text-red-500"
                                      : isDarkMode ? "text-gray-500" : "text-gray-500"
                                  }`}>{metric.label}</p>
                                  <p className={`text-base font-bold ${
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
                      ) : (
                        <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                          Sem dados disponíveis
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`rounded-xl p-4 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Ship className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-blue-600"}`} />
                        <span className={`text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                          NAVIOS
                        </span>
                      </div>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  {embarqueStats.hasData ? formatInteger(embarqueStats.totalShips) : "0"}
                </p>
                      <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>navios no mês</p>
                    </div>

                    <div className={`rounded-xl p-4 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Weight className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-green-600"}`} />
                        <span className={`text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                          TONELADAS
                        </span>
                      </div>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {embarqueStats.hasData ? formatToneladas(embarqueStats.totalTonnage) : "—"}
                        </p>
                        <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                          toneladas
                        </p>
                    </div>

                    <div className={`rounded-xl p-4 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-amber-600"}`} />
                        <span className={`text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                          MÉDIA GERAL
                        </span>
                      </div>
                      {embarqueStats.hasData ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className={`col-span-2 rounded-lg p-2.5 ${isDarkMode ? "bg-white/5" : "bg-white"}`}>
                            <p className={`text-[10px] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>RI</p>
                            <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                              {formatRi(embarqueStats.qualityMetrics?.ri ?? 0)}
                            </p>
                          </div>
                          <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-white/5" : "bg-white"}`}>
                            <p className={`text-[10px] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>UMI</p>
                            <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                              {formatUmi(embarqueStats.qualityMetrics?.umi ?? 0)}
                            </p>
                          </div>
                          <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-white/5" : "bg-white"}`}>
                            <p className={`text-[10px] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>CIN</p>
                            <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                              {formatCin(embarqueStats.qualityMetrics?.cin ?? 0)}
                            </p>
                          </div>
                          <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-white/5" : "bg-white"}`}>
                            <p className={`text-[10px] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>POL</p>
                            <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                              {formatPol(embarqueStats.qualityMetrics?.pol ?? 0)}
                            </p>
                          </div>
                          <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-white/5" : "bg-white"}`}>
                            <p className={`text-[10px] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>COR</p>
                            <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                              {formatCor(embarqueStats.qualityMetrics?.cor ?? 0)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                          Sem dados disponíveis
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </aside>
        )}

        <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          {currentModule === "recepcao" ? (
            <div className="flex-1 overflow-hidden">
              <div
                className={`relative z-0 h-full overflow-hidden ${isDarkMode ? "border-t border-white/10 bg-[#020617]/80" : "border-t border-gray-200 bg-white"}`}
              >
                <div className="grid h-full grid-cols-7 auto-rows-fr overflow-y-auto calendar-scroll">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className={`sticky top-0 z-10 flex items-center justify-center p-1.5 sm:p-2 text-[10px] sm:text-xs font-medium ${isDarkMode ? "border border-gray-600/20 bg-gray-700/5" : "border-gray-200 bg-white text-gray-600"}`}
                    >
                      <span className="hidden sm:inline">{day}</span>
                      <span className="inline sm:hidden">{day.substring(0, 1)}</span>
                    </div>
                  ))}

                  {calendarDays.map((dayData, idx) => {
                    const truckCount = getTruckData(dayData.date)
                    const qualityStatus = getQualityStatus(dayData.date)
                    const showGrayCard = truckCount === undefined || truckCount === 0

                    const isCurrentMonth = dayData.month === "current"

                    // Check if date is in the past
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const clickedDate = new Date(dayData.date)
                    clickedDate.setHours(0, 0, 0, 0)
                    const isPastDate = clickedDate < today

                    const cardColorClasses = !isCurrentMonth
                      ? isDarkMode
                        ? "border border-gray-600/10 bg-gray-700/5"
                        : "bg-gray-100/50 border border-gray-200/50"
                      : showGrayCard
                        ? isPastDate
                          ? isDarkMode
                            ? "border border-slate-600/40 bg-slate-800/40"
                            : "bg-slate-200 border border-slate-300"
                          : isDarkMode
                            ? "border border-white/5 bg-white/5"
                            : "bg-gray-200"
                        : qualityStatus === "incomplete"
                          ? isDarkMode
                            ? "bg-rose-500/18 border border-rose-500/25"
                            : "bg-rose-100 border border-rose-300"
                          : isDarkMode
                            ? "border border-emerald-500/25 bg-emerald-500/15"
                            : "bg-emerald-100 border border-emerald-300"

                    const iconColorClasses = !isCurrentMonth
                      ? "text-gray-400"
                      : showGrayCard
                        ? isPastDate
                          ? isDarkMode
                            ? "text-slate-400"
                            : "text-slate-500"
                          : isDarkMode
                            ? "text-gray-500"
                            : "text-gray-400"
                        : qualityStatus === "incomplete"
                          ? isDarkMode
                            ? "text-rose-300"
                            : "text-rose-600"
                          : isDarkMode
                            ? "text-emerald-300"
                            : "text-emerald-600"

                    const textColorClasses = !isCurrentMonth
                      ? "text-gray-400"
                      : showGrayCard
                        ? isPastDate
                          ? isDarkMode
                            ? "text-slate-300"
                            : "text-slate-700"
                          : isDarkMode
                            ? "text-gray-500"
                            : "text-gray-500"
                        : qualityStatus === "incomplete"
                          ? isDarkMode
                            ? "text-rose-300"
                            : "text-rose-700"
                          : isDarkMode
                            ? "text-emerald-300"
                            : "text-emerald-700"

                    return (
                      <div
                        key={idx}
                        className={`group relative flex flex-col border-b border-r p-2 sm:p-3 min-h-[110px] sm:min-h-[130px] transition-all ${
                          dayData.month !== "current"
                            ? isDarkMode
                              ? "bg-white/[0.02]"
                              : "bg-gray-50"
                            : isDarkMode
                              ? "bg-transparent hover:bg-white/[0.02]"
                              : "bg-white hover:bg-gray-50/80"
                        } ${isDarkMode ? "border-white/5" : "border-gray-200"} ${
                          isCurrentMonth && truckCount > 0 ? "cursor-pointer" : ""
                        }`}
                        onClick={() => isCurrentMonth && truckCount > 0 && handleDayClick(dayData.date, truckCount)}
                      >
                        {/* Número do dia - posição superior esquerda */}
                        <div className="mb-2">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-xs font-semibold transition-colors ${
                              !isCurrentMonth || showGrayCard
                                ? "text-gray-400"
                                : isDarkMode
                                  ? "text-gray-100"
                                  : "text-gray-900"
                            }`}
                          >
                            {dayData.day}
                          </span>
                        </div>

                        {/* Badge de caminhões - estilo pill */}
                        {isCurrentMonth && truckCount > 0 && (
                          <div className="flex-1 flex items-start">
                            <div className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-200 group-hover:scale-105 group-hover:shadow-md ${
                              qualityStatus === "incomplete"
                                ? isDarkMode 
                                  ? "bg-rose-500/15 border border-rose-500/30" 
                                  : "bg-rose-100 border border-rose-300"
                                : isDarkMode
                                  ? "bg-emerald-500/15 border border-emerald-500/30"
                                  : "bg-emerald-100 border border-emerald-300"
                            }`}>
                              {/* Indicador de status - borda lateral transformada em dot */}
                              <div
                                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                  (() => {
                                    const qualityIndicator = getDayQualityIndicator(dayData.date)
                                    if (qualityIndicator === "rejected") return "bg-red-500"
                                    if (qualityIndicator === "apurado") return "bg-amber-500"
                                    return qualityStatus === "incomplete" 
                                      ? isDarkMode ? "bg-rose-400" : "bg-rose-500"
                                      : isDarkMode ? "bg-emerald-400" : "bg-emerald-500"
                                  })()
                                }`}
                              />
                              <TruckIcon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 ${iconColorClasses}`} />
                              <span className={`text-[10px] sm:text-xs font-bold ${textColorClasses}`}>
                                {truckCount.toLocaleString("pt-BR")}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Hover Preview Melhorado - Estilo Card */}
                        {isCurrentMonth && truckCount > 0 && (
                          <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-lg z-10 ${
                            isDarkMode 
                              ? "bg-slate-900/95 backdrop-blur-sm" 
                              : "bg-white/98 backdrop-blur-sm shadow-xl"
                          }`}>
                            <div className="p-3 w-full">
                              {/* Header do preview */}
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200/20">
                                <Calendar className={`h-3.5 w-3.5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                                <p className={`text-[11px] font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                  {truckCount} caminhõe{truckCount > 1 ? "s" : ""}
                                </p>
                              </div>
                              
                              {/* Status breakdown com ícones */}
                              {(() => {
                                const dateStr = `${dayData.date.getFullYear()}-${String(dayData.date.getMonth() + 1).padStart(2, "0")}-${String(dayData.date.getDate()).padStart(2, "0")}`
                                const trucks = trucksByDate[dateStr] || []
                                const approved = trucks.filter(t => t.status === "approved").length
                                const apurado = trucks.filter(t => t.status === "apurado").length
                                const rejected = trucks.filter(t => t.status === "rejected").length
                                
                                return (
                                  <div className="space-y-1.5">
                                    {approved > 0 && (
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                          <span className={`text-[10px] font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                            Aprovados
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-emerald-500">
                                          {approved}
                                        </span>
                                      </div>
                                    )}
                                    {apurado > 0 && (
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                                          <span className={`text-[10px] font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                            Apontados
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-amber-500">
                                          {apurado}
                                        </span>
                                      </div>
                                    )}
                                    {rejected > 0 && (
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <XCircle className="h-3 w-3 text-red-500" />
                                          <span className={`text-[10px] font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                            Recusados
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-red-500">
                                          {rejected}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="relative h-full min-h-[600px]">
                  {Object.keys(trucksByDate).length === 0 && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                      <div
                        className={`mx-auto rounded-full p-6 mb-4 w-fit ${isDarkMode ? "bg-white/5" : "bg-gray-100"}`}
                      >
                        <svg
                          className={`w-16 h-16 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <p className={`text-base font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Nenhum dado disponível
                      </p>
                      <p className={`text-sm max-w-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                        Os dados de recepção para este período serão exibidos aqui quando disponíveis.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmbarqueModule
              shipsByDate={shipsByDate}
              isDarkMode={isDarkMode}
              currentYear={currentYear}
              currentMonthIndex={currentMonthIndex}
            />
          )}
        </main>

        {detailsSidebarOpen && selectedDay && (
        <DayViewOverlay
          selectedDay={selectedDay}
          isDarkMode={isDarkMode}
          trucksByDate={trucksByDate}
          initialSearchTerm={searchQuery}
          onClose={() => {
            setSelectedDay(null)
            setDetailsSidebarOpen(false) // Close details sidebar to show header/sidebar again
            setSearchQuery("") // Clear search query when closing
            setExpandedGroups(new Set()) // Reset expanded groups
            setExpandedSuppliers(new Set()) // Reset expanded suppliers
            setShowOnlyIncomplete(false) // Reset incomplete filter
          }}
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
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowGlobalSearch(false)
                setGlobalSearchTerm("")
                setSearchResults([])
              }}
            />
            
            {/* Search Container */}
            <div 
              className={`relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl overflow-hidden ${
                isDarkMode 
                  ? "bg-[#0B1017] border border-white/10" 
                  : "bg-white border border-gray-200"
              }`}
            >
              {/* Search Input */}
              <div className={`flex items-center gap-3 px-5 py-4 border-b ${isDarkMode ? "border-white/10" : "border-gray-200"}`}>
                <Search className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                <input
                  type="text"
                  placeholder="Pesquisar por placa, NF, cliente ou fornecedor..."
                  value={globalSearchTerm}
                  onChange={(e) => handleGlobalSearch(e.target.value)}
                  autoFocus
                  className={`flex-1 text-base outline-none bg-transparent ${
                    isDarkMode ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"
                  }`}
                />
                {globalSearchTerm && (
                  <button
                    onClick={() => {
                      setGlobalSearchTerm("")
                      setSearchResults([])
                    }}
                    className={`p-1 rounded-full ${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
                  >
                    <X className={`h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                  </button>
                )}
              </div>
              
              {/* Search Results */}
              <div className={`max-h-[60vh] overflow-y-auto ${isDarkMode ? "scrollbar-dark" : ""}`}>
                {globalSearchTerm.length < 2 ? (
                  <div className={`px-5 py-12 text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Digite pelo menos 2 caracteres para pesquisar</p>
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                      Pesquise por placa, nota fiscal, cliente ou fornecedor
                    </p>
                  </div>
                ) : isSearching ? (
                  <div className={`px-5 py-12 text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    <div className="animate-spin h-8 w-8 border-2 border-current border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-sm">Pesquisando...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className={`px-5 py-12 text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    <TruckIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhum resultado encontrado</p>
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                      Tente outro termo de pesquisa
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-white/5">
                    <div className={`px-5 py-2 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                      <span className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {searchResults.length} resultado{searchResults.length > 1 ? "s" : ""} encontrado{searchResults.length > 1 ? "s" : ""}
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
                          className={`w-full px-5 py-3 flex items-center gap-4 text-left transition-colors ${
                            isDarkMode ? "hover:bg-white/5" : "hover:bg-gray-50"
                          }`}
                        >
                          {/* Status Icon */}
                          <div className={`flex-shrink-0 p-2 rounded-lg ${
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
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  isDarkMode ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-600"
                                }`}>
                                  NF {result.truck.nfNumber}
                                </span>
                              )}
                            </div>
                            <div className={`text-sm truncate ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                              {result.truck.client} - {result.truck.supplier}
                            </div>
                          </div>
                          
                          {/* Date */}
                          <div className="flex-shrink-0 text-right">
                            <div className={`flex items-center gap-1.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                              <Calendar className="h-3.5 w-3.5" />
                              <span className="text-sm">
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
              
              {/* Footer */}
              <div className={`px-5 py-3 border-t flex items-center justify-between ${
                isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
              }`}>
                <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                  Pressione ESC para fechar
                </span>
                <button
                  onClick={() => {
                    setShowGlobalSearch(false)
                    setGlobalSearchTerm("")
                    setSearchResults([])
                  }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    isDarkMode 
                      ? "text-gray-400 hover:text-white hover:bg-white/10" 
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
