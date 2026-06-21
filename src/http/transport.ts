import { httpError } from "./errors.js"

export const QOBUZ_BASE_URL = "https://www.qobuz.com/api.json/0.2"

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export type QueryParams = Record<string, string | number | undefined>

export type Transport = {
  get: <T = unknown>(path: string, query?: QueryParams) => Promise<T>
}

export type TransportConfig = {
  appId: string
  token?: string
  baseUrl?: string
  fetchImpl?: typeof fetch
}

const toQuery = (params: QueryParams) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  )

export const createTransport = ({
  appId,
  token,
  baseUrl = QOBUZ_BASE_URL,
  fetchImpl = fetch,
}: TransportConfig): Transport => {
  const headers = {
    "User-Agent": USER_AGENT,
    "X-App-Id": appId,
    ...(token ? { "X-User-Auth-Token": token } : {}),
  }

  const get = async <T>(path: string, query: QueryParams = {}): Promise<T> => {
    const res = await fetchImpl(`${baseUrl}/${path}?${toQuery(query)}`, {
      headers,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw httpError(
        `${path} failed (${res.status}): ${body.slice(0, 200)}`,
        res.status,
      )
    }
    return (await res.json()) as T
  }

  return { get }
}
