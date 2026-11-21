import { fetchAppId } from "./bootstrap.js"
import { authError, type QobuzError } from "../http/errors.js"
import {
  createTransport,
  type QueryParams,
  type Transport,
} from "../http/transport.js"
import type { CredentialStore, StoredCredentials } from "./credential-store.js"

export const DEFAULT_LOGIN_COMMAND = "qobuz login"

export type SelfHealingTransportConfig = {
  credentials: StoredCredentials
  store: CredentialStore
  fetchImpl?: typeof fetch
  baseUrl?: string
  loginCommand?: string
  fetchAppIdImpl?: typeof fetchAppId
}

export type SelfHealingTransport = Transport & {
  readonly appId: string
}

const messageOf = (error: QobuzError) => {
  // transport errors look like `<path> failed (<status>): <body>`; the body is
  // Qobuz's JSON `{ status, code, message }` when it bothers to send one.
  const body = error.message.replace(/^.*? failed \(\d+\): /, "")
  try {
    const parsed = JSON.parse(body) as { message?: unknown }
    if (typeof parsed.message === "string") return parsed.message
  } catch {
    // not JSON (or truncated) — fall back to the raw text
  }
  return body
}

// Telling a rotated app_id apart from an expired user token.
//
// Qobuz has no published error catalogue, so this rule works from what the
// API is known to send rather than from a spec:
// - app_id problems come back with a message that names the app_id ("Invalid
//   or missing app_id parameter", observed as 400 on some endpoints and 401
//   on others): always treat those as a rotation.
// - an expired or revoked user token comes back as a 401 whose message talks
//   about user authentication or the token: never refresh for those, since a
//   new app_id cannot fix them.
// - any other 401 (empty or unrecognised body) is ambiguous: refresh once.
//   That is cheap and bounded, and if the scraped app_id is unchanged the
//   retry is skipped and the caller is told to log in again.
export const looksLikeAppIdMismatch = (error: unknown): boolean => {
  const qobuzError = error as QobuzError
  if (qobuzError?.kind !== "http") return false
  const message = messageOf(qobuzError)
  if (/app[_ ]?id/i.test(message))
    return qobuzError.status === 400 || qobuzError.status === 401
  if (qobuzError.status !== 401) return false
  return !/user auth|auth(entication)? token|\btoken\b/i.test(message)
}

export const loginAgainError = (loginCommand: string, cause?: unknown) =>
  Object.assign(
    authError(
      `Qobuz rejected the stored credentials — log in again with \`${loginCommand}\``,
    ),
    { status: 401, cause },
  )

const isUnauthorised = (error: unknown) =>
  (error as QobuzError)?.status === 401

export const createSelfHealingTransport = ({
  credentials,
  store,
  fetchImpl,
  baseUrl,
  loginCommand = DEFAULT_LOGIN_COMMAND,
  fetchAppIdImpl = fetchAppId,
}: SelfHealingTransportConfig): SelfHealingTransport => {
  let current = credentials
  let transport = createTransport({
    appId: current.appId,
    token: current.token,
    baseUrl,
    fetchImpl,
  })

  // One in-flight refresh per stale app_id, shared by the calls that failed
  // with it while it runs.
  // Resolves to true when a new app_id was stored and a retry is worthwhile.
  let refresh: { from: string; outcome: Promise<boolean> } | undefined

  const refreshAppId = (staleAppId: string): Promise<boolean> => {
    if (current.appId !== staleAppId) return Promise.resolve(true)
    if (refresh?.from === staleAppId) return refresh.outcome

    const outcome = (async () => {
      const { appId } = await fetchAppIdImpl({ fetchImpl })
      if (appId === staleAppId) return false
      const next = { appId, token: current.token }
      await store.save(next)
      current = next
      transport = createTransport({
        appId,
        token: current.token,
        baseUrl,
        fetchImpl,
      })
      return true
    })()
    refresh = { from: staleAppId, outcome }
    // share only the in-flight refresh: once it settles, whatever the result,
    // a later failure may refresh again (long-lived daemons see more rotations)
    const clear = () => {
      if (refresh?.outcome === outcome) refresh = undefined
    }
    outcome.then(clear, clear)
    return outcome
  }

  const get = async <T>(path: string, query?: QueryParams): Promise<T> => {
    const usedAppId = current.appId
    try {
      return await transport.get<T>(path, query)
    } catch (error) {
      if (!looksLikeAppIdMismatch(error)) {
        if (isUnauthorised(error)) throw loginAgainError(loginCommand, error)
        throw error
      }

      let refreshed: boolean
      try {
        refreshed = await refreshAppId(usedAppId)
      } catch (refreshError) {
        throw loginAgainError(loginCommand, refreshError)
      }
      if (!refreshed) throw loginAgainError(loginCommand, error)

      try {
        return await transport.get<T>(path, query)
      } catch (retryError) {
        if (isUnauthorised(retryError) || looksLikeAppIdMismatch(retryError))
          throw loginAgainError(loginCommand, retryError)
        throw retryError
      }
    }
  }

  return {
    get,
    get appId() {
      return current.appId
    },
  }
}
