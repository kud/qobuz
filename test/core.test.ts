import { describe, expect, it } from "vitest"
import {
  createAppLink,
  createDeepLink,
  createMemoryStore,
  createQobuzClient,
  createTransport,
} from "../src/index.js"

type FetchHandler = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Response

const fakeFetch = (handler: FetchHandler): typeof fetch =>
  (async (url: unknown, init: unknown) =>
    handler(
      String(url),
      init as { headers?: Record<string, string> },
    )) as unknown as typeof fetch

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

const albumResponse = {
  id: 123,
  title: "OK Computer",
  tracks_count: 12,
  release_date_original: "1997-05-21",
  artist: { id: 1, name: "Radiohead" },
  genre: { name: "Alternative" },
}

describe("client maps wire shapes into domain types", () => {
  it("maps album/get into a camelCase Album", async () => {
    const client = await createQobuzClient({
      store: createMemoryStore({ appId: "APP", token: "TOK" }),
      fetchImpl: fakeFetch(() => json(albumResponse)),
    })
    const album = await client.albums.get("123")
    expect(album).toMatchObject({
      id: "123",
      title: "OK Computer",
      tracksCount: 12,
      releaseDate: "1997-05-21",
      genre: "Alternative",
    })
    expect(album.artist?.name).toBe("Radiohead")
  })

  it("throws an auth error when the store is empty", async () => {
    await expect(
      createQobuzClient({ store: createMemoryStore() }),
    ).rejects.toMatchObject({ kind: "auth" })
  })
})

describe("deep links", () => {
  it("defaults to open.qobuz.com and supports the play base", () => {
    expect(createDeepLink().album("abc")).toBe(
      "https://open.qobuz.com/album/abc",
    )
    expect(createDeepLink("play").track(42)).toBe(
      "https://play.qobuz.com/track/42",
    )
  })

  it("builds qobuzapp:// scheme links for the desktop app", () => {
    expect(createAppLink().album("abc")).toBe("qobuzapp://album/abc")
    expect(createAppLink().track(42)).toBe("qobuzapp://track/42")
  })
})

describe("transport", () => {
  it("attaches the auth headers", async () => {
    let seen: Record<string, string> | undefined
    const transport = createTransport({
      appId: "APP",
      token: "TOK",
      fetchImpl: fakeFetch((_url, init) => {
        seen = init?.headers
        return json({})
      }),
    })
    await transport.get("ping")
    expect(seen?.["X-App-Id"]).toBe("APP")
    expect(seen?.["X-User-Auth-Token"]).toBe("TOK")
  })

  it("throws a QobuzError carrying the status on a non-2xx response", async () => {
    const transport = createTransport({
      appId: "APP",
      fetchImpl: fakeFetch(() => json({ error: "no" }, 401)),
    })
    await expect(transport.get("x")).rejects.toMatchObject({
      kind: "http",
      status: 401,
    })
  })
})
