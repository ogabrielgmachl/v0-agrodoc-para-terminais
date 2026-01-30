"use client"

import { useState } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { LayoutGrid, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QualityMetrics {
  pol: number | null
  cor: number | null
  umi: number | null
  cin: number | null
  ri: number | null
}

interface TruckQualityData {
  id: string
  licensePlate: string
  metrics: QualityMetrics
}

interface QualityChartProps {
  trucks: TruckQualityData[]
  isDarkMode?: boolean
  chartType?: "bar" | "line"
}

const qualityLimits = {
  pol: { min: 98.9, max: 99.6 },
  cor: { max: 1250 },
  cin: { max: 0.2 },
  ri: { max: 500 },
  umi: { max: 0.2 },
}

/**
 * Componente de visualização de métricas de qualidade com gráficos
 */
export function QualityChart({ trucks, isDarkMode = false, chartType = "bar" }: QualityChartProps) {
  const [viewMode, setViewMode] = useState<"table" | "chart">("table")
  const [selectedChart, setSelectedChart] = useState<"bar" | "line">(chartType)

  // Calcula médias das métricas
  const averages = trucks.reduce(
    (acc, truck) => {
      if (truck.metrics.pol !== null) {
        acc.pol.sum += truck.metrics.pol
        acc.pol.count++
      }
      if (truck.metrics.cor !== null) {
        acc.cor.sum += truck.metrics.cor
        acc.cor.count++
      }
      if (truck.metrics.umi !== null) {
        acc.umi.sum += truck.metrics.umi
        acc.umi.count++
      }
      if (truck.metrics.cin !== null) {
        acc.cin.sum += truck.metrics.cin
        acc.cin.count++
      }
      if (truck.metrics.ri !== null) {
        acc.ri.sum += truck.metrics.ri
        acc.ri.count++
      }
      return acc
    },
    {
      pol: { sum: 0, count: 0 },
      cor: { sum: 0, count: 0 },
      umi: { sum: 0, count: 0 },
      cin: { sum: 0, count: 0 },
      ri: { sum: 0, count: 0 },
    }
  )

  const chartData = [
    {
      metric: "POL",
      média: averages.pol.count > 0 ? (averages.pol.sum / averages.pol.count).toFixed(2) : 0,
      mínimo: qualityLimits.pol.min,
      máximo: qualityLimits.pol.max,
    },
    {
      metric: "COR",
      média: averages.cor.count > 0 ? Math.round(averages.cor.sum / averages.cor.count) : 0,
      limite: qualityLimits.cor.max,
    },
    {
      metric: "UMI",
      média: averages.umi.count > 0 ? (averages.umi.sum / averages.umi.count).toFixed(3) : 0,
      limite: qualityLimits.umi.max,
    },
    {
      metric: "CIN",
      média: averages.cin.count > 0 ? (averages.cin.sum / averages.cin.count).toFixed(3) : 0,
      limite: qualityLimits.cin.max,
    },
    {
      metric: "RI",
      média: averages.ri.count > 0 ? Math.round(averages.ri.sum / averages.ri.count) : 0,
      limite: qualityLimits.ri.max,
    },
  ]

  // Dados para tabela
  const tableData = trucks.slice(0, 10).map((truck) => ({
    placa: truck.licensePlate,
    pol: truck.metrics.pol?.toFixed(2) || "-",
    cor: truck.metrics.cor?.toFixed(0) || "-",
    umi: truck.metrics.umi?.toFixed(3) || "-",
    cin: truck.metrics.cin?.toFixed(3) || "-",
    ri: truck.metrics.ri?.toFixed(0) || "-",
  }))

  return (
    <div className={`space-y-4 ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
      {/* Toggle Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className={`gap-2 ${
              isDarkMode
                ? "border-slate-700 hover:bg-slate-800"
                : "border-slate-300 hover:bg-slate-50"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Tabela
          </Button>
          <Button
            variant={viewMode === "chart" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("chart")}
            className={`gap-2 ${
              isDarkMode
                ? "border-slate-700 hover:bg-slate-800"
                : "border-slate-300 hover:bg-slate-50"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Gráfico
          </Button>
        </div>

        {viewMode === "chart" && (
          <div className="flex items-center gap-2">
            <Button
              variant={selectedChart === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChart("bar")}
              className={
                isDarkMode
                  ? "border-slate-700 hover:bg-slate-800"
                  : "border-slate-300 hover:bg-slate-50"
              }
            >
              Barras
            </Button>
            <Button
              variant={selectedChart === "line" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChart("line")}
              className={
                isDarkMode
                  ? "border-slate-700 hover:bg-slate-800"
                  : "border-slate-300 hover:bg-slate-50"
              }
            >
              Linhas
            </Button>
          </div>
        )}
      </div>

      {/* Content Area */}
      {viewMode === "table" ? (
        <div className="overflow-x-auto">
          <table
            className={`w-full text-sm ${
              isDarkMode ? "border-slate-700" : "border-slate-200"
            }`}
          >
            <thead>
              <tr className={isDarkMode ? "bg-slate-800" : "bg-slate-100"}>
                <th
                  className={`px-3 py-2 text-left border ${
                    isDarkMode ? "border-slate-700" : "border-slate-200"
                  }`}
                >
                  Placa
                </th>
                <th
                  className={`px-3 py-2 text-right border ${
                    isDarkMode ? "border-slate-700" : "border-slate-200"
                  }`}
                >
                  POL
                </th>
                <th
                  className={`px-3 py-2 text-right border ${
                    isDarkMode ? "border-slate-700" : "border-slate-200"
                  }`}
                >
                  COR
                </th>
                <th
                  className={`px-3 py-2 text-right border ${
                    isDarkMode ? "border-slate-700" : "border-slate-200"
                  }`}
                >
                  UMI
                </th>
                <th
                  className={`px-3 py-2 text-right border ${
                    isDarkMode ? "border-slate-700" : "border-slate-200"
                  }`}
                >
                  CIN
                </th>
                <th
                  className={`px-3 py-2 text-right border ${
                    isDarkMode ? "border-slate-700" : "border-slate-200"
                  }`}
                >
                  RI
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={idx}>
                  <td
                    className={`px-3 py-2 border ${
                      isDarkMode ? "border-slate-700" : "border-slate-200"
                    }`}
                  >
                    {row.placa}
                  </td>
                  <td
                    className={`px-3 py-2 text-right border ${
                      isDarkMode ? "border-slate-700" : "border-slate-200"
                    }`}
                  >
                    {row.pol}
                  </td>
                  <td
                    className={`px-3 py-2 text-right border ${
                      isDarkMode ? "border-slate-700" : "border-slate-200"
                    }`}
                  >
                    {row.cor}
                  </td>
                  <td
                    className={`px-3 py-2 text-right border ${
                      isDarkMode ? "border-slate-700" : "border-slate-200"
                    }`}
                  >
                    {row.umi}
                  </td>
                  <td
                    className={`px-3 py-2 text-right border ${
                      isDarkMode ? "border-slate-700" : "border-slate-200"
                    }`}
                  >
                    {row.cin}
                  </td>
                  <td
                    className={`px-3 py-2 text-right border ${
                      isDarkMode ? "border-slate-700" : "border-slate-200"
                    }`}
                  >
                    {row.ri}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trucks.length > 10 && (
            <p className="text-xs mt-2 text-center opacity-60">
              Exibindo 10 de {trucks.length} caminhões
            </p>
          )}
        </div>
      ) : (
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            {selectedChart === "bar" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="metric" stroke={isDarkMode ? "#94a3b8" : "#64748b"} />
                <YAxis stroke={isDarkMode ? "#94a3b8" : "#64748b"} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                    border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
                    borderRadius: "8px",
                    color: isDarkMode ? "#e2e8f0" : "#0f172a",
                  }}
                />
                <Legend />
                <Bar dataKey="média" fill={isDarkMode ? "#10b981" : "#059669"} name="Média" />
                <Bar dataKey="limite" fill={isDarkMode ? "#ef4444" : "#dc2626"} name="Limite" />
                <Bar dataKey="mínimo" fill={isDarkMode ? "#f59e0b" : "#d97706"} name="Mínimo" />
                <Bar dataKey="máximo" fill={isDarkMode ? "#3b82f6" : "#2563eb"} name="Máximo" />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="metric" stroke={isDarkMode ? "#94a3b8" : "#64748b"} />
                <YAxis stroke={isDarkMode ? "#94a3b8" : "#64748b"} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                    border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
                    borderRadius: "8px",
                    color: isDarkMode ? "#e2e8f0" : "#0f172a",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="média"
                  stroke={isDarkMode ? "#10b981" : "#059669"}
                  strokeWidth={2}
                  name="Média"
                />
                <Line
                  type="monotone"
                  dataKey="limite"
                  stroke={isDarkMode ? "#ef4444" : "#dc2626"}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Limite"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
