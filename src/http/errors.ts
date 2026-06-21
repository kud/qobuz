export type QobuzErrorKind = "http" | "auth" | "bootstrap"

export type QobuzError = Error & {
  kind: QobuzErrorKind
  status?: number
}

const createError = (
  kind: QobuzErrorKind,
  message: string,
  status?: number,
): QobuzError =>
  Object.assign(new Error(message), { name: "QobuzError", kind, status })

export const httpError = (message: string, status: number) =>
  createError("http", message, status)
export const authError = (message: string) => createError("auth", message)
export const bootstrapError = (message: string) =>
  createError("bootstrap", message)
