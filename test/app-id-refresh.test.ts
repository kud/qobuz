import { describe, expect, it } from "vitest"
import {
  createQobuzClient,
  looksLikeAppIdMismatch,
  type CredentialStore,
  type StoredCredentials,
} from "../src/index.js"

const OLD_APP_ID = "100000001"
const NEW_APP_ID = "200000002"
const BUNDLE_PATH = "/resources/7.1.2-b034/bundle.js"

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

const appIdRejected = () =>
  json(
    {
      status: "error",
      code: 401,
      message: "Invalid or missing app_id parameter (app_id)",
    },
    401,
  )

const tokenRejected = () =>
  json(
    { status: "error", code: 401, message: "User authentication is required." },
    401,
  )

const albumResponse = { id: 123, title: "OK Computer", tracks_count: 12 }

// A store that records saves without touching the Keychain.
const recordingStore = (seed: StoredCredentials) => {
  let current: StoredCredentials | undefined = seed
  const saves: StoredCredentials[] = []
  const store: CredentialStore = {
    load: async () => current,
    save: async (credentials) => {
      saves.push(credentials)
      current = credentials
    },
    clear: async () => {
      current = undefined
    },
  }
  return { store, saves }
}

type Api = (appId: string | undefined, url: string) => Response | Promise<Response>

// Mocks play.qobuz.com (login page + bundle) and hands API calls to `api`.
const mockQobuz = ({
  api,
  scrapedAppId = NEW_APP_ID,
}: {
  api: Api
  scrapedAppId?: string
}) => {
  const calls = { scrapes: 0, api: [] as (string | undefined)[] }
  const fetchImpl = (async (input: unknown, init?: RequestInit) => {
    const url = String(input)
    if (url === "https://play.qobuz.com/login") {
      calls.scrapes += 1
      return new Response(`<script src="${BUNDLE_PATH}"></script>`)
    }
    if (url === `https://play.qobuz.com${BUNDLE_PATH}`)
      return new Response(
        `x={production:{api:{appId:"${scrapedAppId}",appSecret:"s"}}}`,
      )
    const appId = (init?.headers as Record<string, string> | undefined)?.[
      "X-App-Id"
    ]
    calls.api.push(appId)
    return api(appId, url)
  }) as typeof fetch
  return { fetchImpl, calls }
}

const seed = { appId: OLD_APP_ID, token: "TOK" }

describe("app_id rotation", () => {
  it("re-scrapes, persists and retries when the app_id was rotated", async () => {
    const { store, saves } = recordingStore(seed)
    const { fetchImpl, calls } = mockQobuz({
      api: (appId) =>
        appId === NEW_APP_ID ? json(albumResponse) : appIdRejected(),
    })
    const client = await createQobuzClient({ store, fetchImpl })

    const album = await client.albums.get("123")

    expect(album.title).toBe("OK Computer")
    expect(calls.scrapes).toBe(1)
    expect(calls.api).toEqual([OLD_APP_ID, NEW_APP_ID])
    expect(saves).toEqual([{ appId: NEW_APP_ID, token: "TOK" }])
    expect(client.appId).toBe(NEW_APP_ID)

    // later calls go straight out with the new app_id
    await client.albums.get("123")
    expect(calls.api).toEqual([OLD_APP_ID, NEW_APP_ID, NEW_APP_ID])
    expect(calls.scrapes).toBe(1)
  })

  it("does not refresh when the user token has expired", async () => {
    const { store, saves } = recordingStore(seed)
    const { fetchImpl, calls } = mockQobuz({ api: () => tokenRejected() })
    const client = await createQobuzClient({ store, fetchImpl })

    await expect(client.albums.get("123")).rejects.toMatchObject({
      kind: "auth",
      status: 401,
      message: expect.stringContaining("`qobuz login`"),
    })
    expect(calls.scrapes).toBe(0)
    expect(calls.api).toEqual([OLD_APP_ID])
    expect(saves).toEqual([])
  })

  it("asks to log in again when the retry after a refresh still gets 401", async () => {
    const { store } = recordingStore(seed)
    const { fetchImpl, calls } = mockQobuz({ api: () => appIdRejected() })
    const client = await createQobuzClient({
      store,
      fetchImpl,
      loginCommand: "qobuz-bridge login",
    })

    await expect(client.albums.get("123")).rejects.toMatchObject({
      kind: "auth",
      status: 401,
      message: expect.stringContaining("`qobuz-bridge login`"),
    })
    // exactly one refresh and one retry — no loop
    expect(calls.scrapes).toBe(1)
    expect(calls.api).toEqual([OLD_APP_ID, NEW_APP_ID])
  })

  it("skips the retry when the scraped app_id has not changed", async () => {
    const { store, saves } = recordingStore(seed)
    const { fetchImpl, calls } = mockQobuz({
      api: () => json({}, 401),
      scrapedAppId: OLD_APP_ID,
    })
    const client = await createQobuzClient({ store, fetchImpl })

    await expect(client.albums.get("123")).rejects.toMatchObject({
      kind: "auth",
    })
    expect(calls.scrapes).toBe(1)
    expect(calls.api).toEqual([OLD_APP_ID])
    expect(saves).toEqual([])
  })

  it("shares one refresh between concurrent calls", async () => {
    const { store, saves } = recordingStore(seed)
    const { fetchImpl, calls } = mockQobuz({
      api: async (appId) => {
        // let every first attempt fail before any refresh lands
        await new Promise((resolve) => setTimeout(resolve, 5))
        return appId === NEW_APP_ID ? json(albumResponse) : appIdRejected()
      },
    })
    const client = await createQobuzClient({ store, fetchImpl })

    const albums = await Promise.all([
      client.albums.get("1"),
      client.albums.get("2"),
      client.albums.get("3"),
    ])

    expect(albums).toHaveLength(3)
    expect(calls.scrapes).toBe(1)
    expect(saves).toHaveLength(1)
    expect(calls.api.filter((id) => id === OLD_APP_ID)).toHaveLength(3)
    expect(calls.api.filter((id) => id === NEW_APP_ID)).toHaveLength(3)
  })

  it("leaves non-auth errors untouched", async () => {
    const { store } = recordingStore(seed)
    const { fetchImpl, calls } = mockQobuz({ api: () => json({}, 500) })
    const client = await createQobuzClient({ store, fetchImpl })

    await expect(client.albums.get("123")).rejects.toMatchObject({
      kind: "http",
      status: 500,
    })
    expect(calls.scrapes).toBe(0)
  })
})

describe("looksLikeAppIdMismatch", () => {
  const httpErr = (status: number, body: string) =>
    Object.assign(new Error(`x failed (${status}): ${body}`), {
      kind: "http",
      status,
    })

  it("classifies Qobuz error bodies", () => {
    expect(
      looksLikeAppIdMismatch(
        httpErr(400, '{"message":"Invalid or missing app_id parameter"}'),
      ),
    ).toBe(true)
    expect(
      looksLikeAppIdMismatch(
        httpErr(401, '{"message":"User authentication is required."}'),
      ),
    ).toBe(false)
    expect(
      looksLikeAppIdMismatch(httpErr(401, '{"message":"Invalid token"}')),
    ).toBe(false)
    expect(looksLikeAppIdMismatch(httpErr(401, ""))).toBe(true)
    expect(looksLikeAppIdMismatch(httpErr(400, "bad request"))).toBe(false)
  })
})
