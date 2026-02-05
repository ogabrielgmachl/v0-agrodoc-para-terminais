"use client"

import { useState } from "react"
import { Upload, FileText, AlertCircle, CheckCircle2, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { validateCSV, previewCSV, type CSVValidationResult } from "@/lib/csv-validation"
import { toast } from "sonner"

interface EnhancedCSVUploadProps {
  uploadType: "caminhoes" | "navios"
  uploadKey: string
  onUploadSuccess?: (filename: string, url: string) => void
  isDarkMode?: boolean
}

export function EnhancedCSVUpload({
  uploadType,
  uploadKey,
  onUploadSuccess,
  isDarkMode = false,
}: EnhancedCSVUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationResult, setValidationResult] = useState<CSVValidationResult | null>(null)
  const [preview, setPreview] = useState<string[][] | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setIsValidating(true)

    try {
      // Validar arquivo
      const result = await validateCSV(file)
      setValidationResult(result)

      // Gerar preview se válido
      if (result.isValid) {
        const previewData = await previewCSV(file, 5)
        setPreview(previewData)
      }
    } catch (error) {
      toast.error("Erro ao validar arquivo")
      console.error(error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !validationResult?.isValid) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch(`/api/upload?dir=${uploadType}`, {
        method: "POST",
        headers: {
          "x-upload-key": uploadKey,
        },
        body: formData,
      })

      const data = await response.json()

      if (data.ok) {
        toast.success(`Arquivo ${selectedFile.name} enviado com sucesso!`)
        onUploadSuccess?.(data.filename, data.url)
        resetUpload()
      } else {
        toast.error(`Erro ao enviar arquivo: ${data.message}`)
      }
    } catch (error) {
      toast.error("Erro ao enviar arquivo")
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setValidationResult(null)
    setPreview(null)
    setShowPreview(false)
  }

  return (
    <div className={`space-y-4 ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
      {/* File Input */}
      <div className="flex items-center gap-3">
        <label
          htmlFor={`csv-upload-${uploadType}`}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
            isDarkMode
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-emerald-500 hover:bg-emerald-600 text-white"
          }`}
        >
          <Upload className="h-4 w-4" />
          Selecionar Arquivo CSV
        </label>
        <input
          id={`csv-upload-${uploadType}`}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        {selectedFile && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{selectedFile.name}</span>
            <button onClick={resetUpload} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Validation Status */}
      {isValidating && (
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Validando arquivo...</span>
        </div>
      )}

      {validationResult && (
        <div className="space-y-3">
          {/* Summary */}
          <div
            className={`flex items-start gap-2 p-3 rounded-lg ${
              validationResult.isValid
                ? isDarkMode
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : "bg-emerald-50 border border-emerald-200"
                : isDarkMode
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-red-50 border border-red-200"
            }`}
          >
            {validationResult.isValid ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            )}
            <div className="flex-1 text-sm">
              <p className="font-medium">
                {validationResult.isValid ? "Arquivo válido!" : "Problemas encontrados no arquivo"}
              </p>
              <p className="mt-1 text-xs opacity-80">
                {validationResult.rowCount} linhas • {validationResult.columnCount} colunas
              </p>
            </div>
          </div>

          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <div
              className={`p-3 rounded-lg ${
                isDarkMode
                  ? "bg-red-500/10 border border-red-500/20 text-red-200"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              <p className="text-sm font-medium mb-2">Erros:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                {validationResult.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <div
              className={`p-3 rounded-lg ${
                isDarkMode
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-200"
                  : "bg-amber-50 border border-amber-200 text-amber-800"
              }`}
            >
              <p className="text-sm font-medium mb-2">Avisos:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                {validationResult.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Toggle */}
          {preview && (
            <div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`text-sm underline ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
              >
                {showPreview ? "Ocultar" : "Visualizar"} primeiras linhas
              </button>

              {showPreview && (
                <div className="mt-2 overflow-x-auto">
                  <table
                    className={`text-xs w-full ${
                      isDarkMode ? "border-slate-700" : "border-slate-200"
                    }`}
                  >
                    <thead>
                      <tr className={isDarkMode ? "bg-slate-800" : "bg-slate-100"}>
                        {preview[0]?.map((header, i) => (
                          <th
                            key={i}
                            className={`px-2 py-1 text-left border ${
                              isDarkMode ? "border-slate-700" : "border-slate-200"
                            }`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1).map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className={`px-2 py-1 border ${
                                isDarkMode ? "border-slate-700" : "border-slate-200"
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Upload Button */}
          {validationResult.isValid && (
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className={`w-full ${
                isDarkMode
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Arquivo
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
