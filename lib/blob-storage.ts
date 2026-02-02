import { put, head, list } from "@vercel/blob"
import type { UploadSuccessResponse } from "./api-types"

export type CsvByDateMap = Record<string, string>

export type UploadResult = UploadSuccessResponse

/**
 * Sanitizes a filename by removing spaces, blocking dangerous characters,
 * and ensuring only alphanumeric, dots, hyphens, and underscores are allowed.
 */
export function sanitizeFileName(name: string): string | null {
  let sanitized = name.trim()

  // Substituir todos os espaços por underscore
  sanitized = sanitized.replace(/\s+/g, "_")

  // Bloquear barras e sequências perigosas
  if (sanitized.includes("/") || sanitized.includes("\\") || sanitized.includes("..")) {
    return null
  }

  const validPattern = /^[a-zA-Z0-9._-]+$/
  if (!validPattern.test(sanitized)) {
    return null
  }

  return sanitized
}

/**
 * Determines the destination folder based on filename suffix.
 * Returns "csv/caminhoes" for files ending with "-caminhoes.csv"
 * Returns "csv/navios" for files ending with "-navios.csv"
 * Returns null for invalid filenames.
 */
export function determineDestination(fileName: string): "csv/caminhoes" | "csv/navios" | null {
  const lowerName = fileName.toLowerCase()

  if (lowerName.endsWith("-caminhoes.csv")) {
    return "csv/caminhoes"
  }

  if (lowerName.endsWith("-navios.csv")) {
    return "csv/navios"
  }

  return null
}

/**
 * Checks if a file exists in Vercel Blob storage.
 */
export async function checkBlobExists(pathname: string): Promise<boolean> {
  try {
    await head(pathname)
    return true
  } catch {
    return false
  }
}

/**
 * Uploads a CSV file to Vercel Blob storage.
 * @param file - The file to upload
 * @param destination - Either "caminhoes" or "navios"
 * @returns Upload result with filename, pathname, and URL
 * @throws Error if upload fails
 */
export async function uploadCsvFile(file: File, destination: "caminhoes" | "navios"): Promise<UploadResult> {
  const pathname = `csv/${destination}/${file.name}`

  const blob = await put(pathname, file, {
    access: "public",
  })

  return {
    ok: true,
    code: "UPLOADED",
    filename: file.name,
    pathname,
    url: blob.url,
  }
}

/**
 * Parses a CSV date from filename and converts to YYYY-MM-DD format.
 * Supports both "-caminhoes.csv" and "-navios.csv" formats.
 * @param filename - The CSV filename (e.g., "10-12-2025-caminhoes.csv")
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 */
export function parseCsvDateFromFilename(filename: string): string | null {
  // Match DD-MM-YYYY-caminhoes.csv or DD-MM-YYYY-navios.csv
  const match = filename.match(/^(\d{2})-(\d{2})-(\d{4})-(caminhoes|navios)\.csv$/i)

  if (!match) return null

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

/**
 * Lists all truck CSV files from Vercel Blob and returns a map of dates to URLs.
 * Only checks "csv/caminhoes/" prefix.
 */
export async function listTruckCsvByDate(): Promise<CsvByDateMap> {
  try {
    const { blobs } = await list({
      prefix: "csv/caminhoes/",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    const byDate: CsvByDateMap = {}

    blobs.forEach((blob) => {
      const filename = blob.pathname.split("/").pop()
      if (!filename || !filename.toLowerCase().endsWith("-caminhoes.csv")) return

      const date = parseCsvDateFromFilename(filename)
      if (date) {
        byDate[date] = blob.url
      }
    })

    return byDate
  } catch (error) {
    console.error("[v0] Error listing truck CSV files:", error instanceof Error ? error.message : error)
    return {}
  }
}

/**
 * Lists all ship CSV files from Vercel Blob and returns a map of dates to URLs.
 * Only checks "csv/navios/" prefix.
 */
export async function listShipCsvByDate(): Promise<CsvByDateMap> {
  try {
    const { blobs } = await list({
      prefix: "csv/navios/",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    const byDate: CsvByDateMap = {}

    blobs.forEach((blob) => {
      const filename = blob.pathname.split("/").pop()
      if (!filename || !filename.toLowerCase().endsWith("-navios.csv")) return

      const date = parseCsvDateFromFilename(filename)
      if (date) {
        byDate[date] = blob.url
      }
    })

    return byDate
  } catch (error) {
    console.error("[v0] Error listing ship CSV files:", error instanceof Error ? error.message : error)
    return {}
  }
}
