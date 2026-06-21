import { authError, type QobuzError } from "../http/errors.js"
import { createTransport } from "../http/transport.js"

export type ValidateConfig = {
  appId: string
  token: string
  fetchImpl?: typeof fetch
}

export const validateCredentials = async ({
  appId,
  token,
  fetchImpl,
}: ValidateConfig): Promise<void> => {
  const transport = createTransport({ appId, token, fetchImpl })
  try {
    await transport.get("favorite/getUserFavorites", {
      type: "albums",
      limit: 1,
    })
  } catch (error) {
    const qobuzError = error as QobuzError
    if (qobuzError.status === 401) {
      throw authError(
        "Qobuz rejected the credentials (401) — the token may be expired or the app_id doesn't match",
      )
    }
    throw error
  }
}
