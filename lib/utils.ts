import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helpers
const isNil = (v: unknown) => v === null || v === undefined

// Inteiro com separador de milhares pt-BR (ex: 1.350)
export const formatInteger = (value: number | null) => {
  if (isNil(value)) return "—"
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// COR: XXX ou X.XXX (ex: 955, 1.290, 1.350)
export const formatCor = (value: number | null) => {
  if (isNil(value)) return "—"
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// POL: XX,XX (2 casas)
export const formatPol = (value: number | null) => {
  if (isNil(value)) return "—"
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// UMI: X,XX (2 casas)
export const formatUmi = (value: number | null) => {
  if (isNil(value)) return "—"
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// CIN: X,XX (2 casas)
export const formatCin = (value: number | null) => {
  if (isNil(value)) return "—"
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// RI: XXX (inteiro)
export const formatRi = (value: number | null) => {
  if (isNil(value)) return "—"
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// TONELADAS: Dividir por 1000 e exibir sem unidade (ex: 95, 9.555, 955)
export const formatToneladas = (value: number | null) => {
  if (isNil(value)) return "—"
  
  // Converter kg para toneladas
  const t = value / 1000
  return t.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// PESO simples: sem casas decimais (ex: 95, 9.555, 955, 0)
export const formatPeso = (value: number | null) => {
  if (isNil(value)) return "—"
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// Decimal com 1 casa
export const formatDecimal = (value: number | null) => {
  if (isNil(value)) return "—"
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// Peso inteligente: remove .0 mas mantém outros decimais (ex: 40.0 → 40, 35.1 → 35,1)
// Assume que o valor já está em toneladas
export const formatWeight = (value: number | null) => {
  if (isNil(value)) return "—"
  
  // Verifica se é um número inteiro (sem decimais significativos)
  if (value % 1 === 0) {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  
  // Tem decimais, mantém 1 casa
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// Formatar data no padrão brasileiro: "27/01/2026 às 16:54" ou apenas "27/01/2026"
export const formatDateTimePtBr = (dateString: string | null): string => {
  if (!dateString) return "—"
  
  try {
    // Tenta fazer parse da string de data
    const date = new Date(dateString)
    
    // Verifica se a data é válida
    if (isNaN(date.getTime())) return dateString // Retorna original se inválido
    
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    // Se não tem horário (00:00), retorna apenas a data
    if (hours === '00' && minutes === '00') {
      return `${day}/${month}/${year}`
    }
    
    return `${day}/${month}/${year} às ${hours}:${minutes}`
  } catch {
    return dateString // Retorna original se houver erro
  }
}

// Atualiza o token do link do boletim com a data atual (formato: DDYYYYMM)
export const updateBoletimToken = (url: string | null): string => {
  if (!url) return "#"
  
  try {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    
    // Novo token no formato DDYYYYMM (ex: 28202601)
    const newToken = `${day}${year}${month}`
    
    // Substitui o token no final do URL
    return url.replace(/token=\d+/, `token=${newToken}`)
  } catch {
    return url // Retorna original se houver erro
  }
}
