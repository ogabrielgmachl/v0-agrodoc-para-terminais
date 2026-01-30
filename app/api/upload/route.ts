import { put } from "@vercel/blob"

// ✅ Se você NÃO quer env var, troque por:
// const UPLOAD_KEY = "abeni_upload"
const UPLOAD_KEY = process.env.UPLOAD_KEY

// ✅ limite de tamanho do arquivo (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024

type UploadResponse =
  | { ok: true; code: "UPLOADED" | "UPDATED"; filename: string; pathname: string; url: string }
  | { ok: false; code: string; message: string }

/**
 * Remove caracteres perigosos e deixa só [a-zA-Z0-9._-]
 * - espaços viram "_"
 * - evita ".." e barras
 */
function sanitizeFileName(filename: string): string | null {
  const sanitized = filename
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/\.{2,}/g, ".")
    .trim()

  if (!sanitized || sanitized.includes("..") || sanitized.includes("/") || sanitized.includes("\\")) {
    return null
  }
  return sanitized
}

/**
 * ✅ Diretórios permitidos:
 * Isso impede alguém de mandar ?dir=../../ etc
 */
function sanitizeDir(dir: string | null): string | null {
  if (!dir) return null
  const d = dir.toLowerCase().trim()
  const allowed = new Set(["caminhoes", "navios"])
  return allowed.has(d) ? d : null
}

export async function POST(req: Request) {
  try {
    // ✅ valida se a chave existe (caso use env var)
    if (!UPLOAD_KEY) {
      const response: UploadResponse = {
        ok: false,
        code: "CONFIG_ERROR",
        message: "UPLOAD_KEY não configurada.",
      }
      return Response.json(response, { status: 500 })
    }

    // ✅ autenticação via header
    const key = req.headers.get("x-upload-key")
    if (key !== UPLOAD_KEY) {
      const response: UploadResponse = {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Chave de autenticação inválida.",
      }
      return Response.json(response, { status: 401 })
    }

    // ✅ dir via parâmetro: /api/upload?dir=caminhoes|navios
    const { searchParams } = new URL(req.url)
    const dir = sanitizeDir(searchParams.get("dir"))
    if (!dir) {
      const response: UploadResponse = {
        ok: false,
        code: "INVALID_DIR",
        message: "Diretório inválido. Use ?dir=caminhoes ou ?dir=navios",
      }
      return Response.json(response, { status: 400 })
    }

    // ✅ recebe multipart/form-data
    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      const response: UploadResponse = {
        ok: false,
        code: "INVALID_FILE",
        message: "Arquivo não enviado (campo 'file').",
      }
      return Response.json(response, { status: 400 })
    }

    // ✅ permite CSV e TXT (se você só quiser CSV, removo o .txt)
    const lower = file.name.toLowerCase()
    if (!lower.endsWith(".csv") && !lower.endsWith(".txt")) {
      const response: UploadResponse = {
        ok: false,
        code: "INVALID_EXT",
        message: "Apenas arquivos .csv ou .txt são permitidos.",
      }
      return Response.json(response, { status: 400 })
    }

    // ✅ sanitiza nome do arquivo
    const sanitizedName = sanitizeFileName(file.name)
    if (!sanitizedName) {
      const response: UploadResponse = {
        ok: false,
        code: "INVALID_NAME",
        message: "Nome inválido. Use apenas letras, números, pontos, hífens e underscores.",
      }
      return Response.json(response, { status: 400 })
    }

    // ✅ limita tamanho
    if (file.size > MAX_FILE_SIZE) {
      const response: UploadResponse = {
        ok: false,
        code: "TOO_LARGE",
        message: `Arquivo muito grande. Máximo: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`,
      }
      return Response.json(response, { status: 413 })
    }

    /**
     * ✅ “pasta” no Blob é só parte do pathname.
     * Não precisa criar nada: ao salvar em csv/navios/xxx.csv, ela “existe”.
     */
    const pathname = `csv/${dir}/${sanitizedName}`

    /**
     * ✅ IMPORTANTE: aqui é o comportamento tipo FTP.
     * - NÃO fazemos head() pra checar existência
     * - Se mandar o mesmo nome de novo, o put() SOBRESCREVE
     */
const blob = await put(pathname, file, {
  access: "public",
  addRandomSuffix: false,
  allowOverwrite: true,
})

    const response: UploadResponse = {
      ok: true,
      code: "UPLOADED", // (ou "UPDATED" se quiser padronizar)
      filename: sanitizedName,
      pathname: blob.pathname,
      url: blob.url,
    }
    return Response.json(response)
  } catch (err: any) {
    const response: UploadResponse = {
      ok: false,
      code: "UNKNOWN_ERROR",
      message: err?.message ?? String(err),
    }
    return Response.json(response, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const dir = searchParams.get("dir") ?? "(não informado)"

  return Response.json({
    message: "Upload endpoint - use POST",
    endpoint: "/api/upload?dir=caminhoes|navios",
    current_dir_param: dir,
    destination_example: "csv/<dir>/<arquivo>.csv|.txt",
    auth: { header: "x-upload-key" },
    body: "multipart/form-data com campo 'file'",
    example:
      "curl -X POST -H 'x-upload-key: abeni_upload' -F 'file=@01-12-2025.csv' https://agrodoc-cli.vercel.app/api/upload?dir=caminhoes",
  })
}
