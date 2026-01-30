export type UploadSuccessResponse = {
  ok: true
  code: "UPLOADED"
  filename: string
  pathname: string
  url: string
}

export type UploadErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_FILE"
  | "INVALID_NAME"
  | "TOO_LARGE"
  | "ALREADY_EXISTS"
  | "CONFIG_ERROR"
  | "UNKNOWN_ERROR"

export type UploadErrorResponse = {
  ok: false
  code: UploadErrorCode
  message: string
}

export type UploadResponse = UploadSuccessResponse | UploadErrorResponse
