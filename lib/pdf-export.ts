import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { Truck } from "@/lib/load-trucks"

/**
 * Formata número com decimais
 */
const formatNumber = (value: number | null, decimals = 2): string => {
  if (value === null || value === undefined) return "-"
  return value.toFixed(decimals)
}

/**
 * Formata data para exibição
 */
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  return date.toLocaleDateString("pt-BR")
}

/**
 * Exporta relatório de caminhões para PDF
 */
export function exportTrucksToPDF(
  trucks: Truck[],
  date: string,
  title = "Relatório de Recepção de Caminhões"
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  // Cabeçalho
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(title, 14, 15)

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text(`Data: ${formatDate(date)}`, 14, 22)
  doc.text(`Total de Caminhões: ${trucks.length}`, 14, 28)

  // Estatísticas rápidas
  const approved = trucks.filter((t) => t.autorizacao === "APROVADO").length
  const rejected = trucks.filter((t) => t.autorizacao === "RECUSADO").length
  const pending = trucks.filter((t) => !t.autorizacao).length

  doc.text(`Aprovados: ${approved} | Recusados: ${rejected} | Pendentes: ${pending}`, 14, 34)

  // Tabela de caminhões
  const tableData = trucks.map((truck) => [
    truck.licensePlate,
    truck.client,
    truck.supplier,
    formatNumber(truck.grossWeight, 0),
    formatNumber(truck.pol),
    formatNumber(truck.cor, 0),
    formatNumber(truck.umi),
    formatNumber(truck.cin),
    formatNumber(truck.ri, 0),
    truck.autorizacao || "PENDENTE",
  ])

  autoTable(doc, {
    startY: 40,
    head: [
      [
        "Placa",
        "Cliente",
        "Fornecedor",
        "Peso (kg)",
        "POL",
        "COR",
        "UMI",
        "CIN",
        "RI",
        "Status",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [34, 197, 94], // green-500
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 15, halign: "right" },
      5: { cellWidth: 15, halign: "right" },
      6: { cellWidth: 15, halign: "right" },
      7: { cellWidth: 15, halign: "right" },
      8: { cellWidth: 15, halign: "right" },
      9: { cellWidth: 25, halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  })

  // Rodapé
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(
      `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString("pt-BR")}`,
      14,
      doc.internal.pageSize.height - 10
    )
  }

  // Salvar PDF
  const fileName = `recepcao_caminhoes_${date.replace(/-/g, "_")}.pdf`
  doc.save(fileName)
}

/**
 * Exporta análise de qualidade detalhada para PDF
 */
export function exportQualityAnalysisToPDF(
  trucks: Truck[],
  date: string,
  title = "Relatório de Análise de Qualidade"
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  // Cabeçalho
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(title, 14, 15)

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text(`Data: ${formatDate(date)}`, 14, 22)

  // Análise de qualidade por parâmetro
  const avgPol = trucks.filter((t) => t.pol).reduce((sum, t) => sum + (t.pol || 0), 0) / trucks.filter((t) => t.pol).length
  const avgCor = trucks.filter((t) => t.cor).reduce((sum, t) => sum + (t.cor || 0), 0) / trucks.filter((t) => t.cor).length
  const avgUmi = trucks.filter((t) => t.umi).reduce((sum, t) => sum + (t.umi || 0), 0) / trucks.filter((t) => t.umi).length
  const avgCin = trucks.filter((t) => t.cin).reduce((sum, t) => sum + (t.cin || 0), 0) / trucks.filter((t) => t.cin).length
  const avgRi = trucks.filter((t) => t.ri).reduce((sum, t) => sum + (t.ri || 0), 0) / trucks.filter((t) => t.ri).length

  doc.text("Médias de Qualidade:", 14, 28)
  doc.text(`POL: ${formatNumber(avgPol)} | COR: ${formatNumber(avgCor, 0)} | UMI: ${formatNumber(avgUmi)} | CIN: ${formatNumber(avgCin)} | RI: ${formatNumber(avgRi, 0)}`, 14, 34)

  // Tabela detalhada
  const tableData = trucks.map((truck) => [
    truck.licensePlate,
    formatNumber(truck.pol),
    formatNumber(truck.cor, 0),
    formatNumber(truck.umi),
    formatNumber(truck.cin),
    formatNumber(truck.ri, 0),
    truck.corAnalista || "-",
    truck.houveDoublecheck ? "Sim" : "Não",
    truck.autorizacao || "PENDENTE",
  ])

  autoTable(doc, {
    startY: 40,
    head: [
      [
        "Placa",
        "POL",
        "COR",
        "UMI",
        "CIN",
        "RI",
        "Analista",
        "Doublecheck",
        "Status",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [59, 130, 246], // blue-500
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 20, halign: "right" },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 40 },
      7: { cellWidth: 25, halign: "center" },
      8: { cellWidth: 25, halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  })

  // Rodapé
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(
      `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString("pt-BR")}`,
      14,
      doc.internal.pageSize.height - 10
    )
  }

  // Salvar PDF
  const fileName = `analise_qualidade_${date.replace(/-/g, "_")}.pdf`
  doc.save(fileName)
}
