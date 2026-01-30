/**
 * Utilitário para validação de arquivos CSV
 */

export interface CSVValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  rowCount: number
  columnCount: number
  headers: string[]
}

/**
 * Valida estrutura e conteúdo de um arquivo CSV
 */
export async function validateCSV(
  file: File,
  requiredHeaders?: string[]
): Promise<CSVValidationResult> {
  const result: CSVValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    rowCount: 0,
    columnCount: 0,
    headers: [],
  }

  try {
    // Valida tamanho do arquivo (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      result.errors.push("Arquivo muito grande. Tamanho máximo: 5MB")
      result.isValid = false
      return result
    }

    // Valida extensão
    const validExtensions = [".csv", ".txt"]
    const fileExt = file.name.toLowerCase().match(/\.[^.]+$/)
    if (!fileExt || !validExtensions.includes(fileExt[0])) {
      result.errors.push("Formato de arquivo inválido. Use .csv ou .txt")
      result.isValid = false
      return result
    }

    // Lê conteúdo do arquivo
    const content = await file.text()
    const lines = content.split("\n").filter((line) => line.trim() !== "")

    if (lines.length === 0) {
      result.errors.push("Arquivo vazio")
      result.isValid = false
      return result
    }

    result.rowCount = lines.length - 1 // Exclui cabeçalho

    // Valida cabeçalho
    const headerLine = lines[0]
    const delimiter = headerLine.includes(";") ? ";" : ","
    const headers = headerLine.split(delimiter).map((h) => h.trim())

    result.headers = headers
    result.columnCount = headers.length

    if (headers.length === 0) {
      result.errors.push("Cabeçalho vazio ou inválido")
      result.isValid = false
      return result
    }

    // Valida colunas obrigatórias se fornecidas
    if (requiredHeaders && requiredHeaders.length > 0) {
      const missingHeaders = requiredHeaders.filter(
        (required) => !headers.some((h) => h.toLowerCase() === required.toLowerCase())
      )
      if (missingHeaders.length > 0) {
        result.errors.push(`Colunas obrigatórias ausentes: ${missingHeaders.join(", ")}`)
        result.isValid = false
      }
    }

    // Valida consistência de colunas
    const inconsistentRows: number[] = []
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(delimiter).length
      if (columns !== headers.length) {
        inconsistentRows.push(i + 1)
      }
    }

    if (inconsistentRows.length > 0) {
      result.warnings.push(
        `${inconsistentRows.length} linha(s) com número de colunas inconsistente: linhas ${inconsistentRows.slice(0, 5).join(", ")}${inconsistentRows.length > 5 ? "..." : ""}`
      )
    }

    // Valida caracteres perigosos
    const dangerousChars = /[<>"|;']/g
    const dangerousLines: number[] = []
    for (let i = 0; i < lines.length; i++) {
      if (dangerousChars.test(lines[i])) {
        dangerousLines.push(i + 1)
      }
    }

    if (dangerousLines.length > 0) {
      result.warnings.push(
        `${dangerousLines.length} linha(s) contêm caracteres especiais que podem causar problemas`
      )
    }

    // Valida linhas duplicadas
    const uniqueLines = new Set(lines.slice(1))
    if (uniqueLines.size < lines.length - 1) {
      result.warnings.push(
        `${lines.length - 1 - uniqueLines.size} linha(s) duplicada(s) encontrada(s)`
      )
    }

  } catch (error) {
    result.errors.push(`Erro ao processar arquivo: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    result.isValid = false
  }

  return result
}

/**
 * Pré-visualiza linhas de um arquivo CSV
 */
export async function previewCSV(file: File, maxRows = 10): Promise<string[][]> {
  const content = await file.text()
  const lines = content.split("\n").filter((line) => line.trim() !== "")
  const delimiter = lines[0]?.includes(";") ? ";" : ","

  const preview: string[][] = []
  const rowsToProcess = Math.min(maxRows + 1, lines.length) // +1 para incluir cabeçalho

  for (let i = 0; i < rowsToProcess; i++) {
    const columns = lines[i].split(delimiter).map((col) => col.trim())
    preview.push(columns)
  }

  return preview
}

/**
 * Sanitiza nome de arquivo para upload
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase()
}
