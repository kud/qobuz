import { mapArtist } from "../mappers.js"
import type { Transport } from "../http/transport.js"
import type { Artist, PageOptions } from "../types/domain.js"

type RawSimilar = { artists?: { items?: unknown[] } }

export const createArtistsResource = (transport: Transport) => ({
  get: async (artistId: number): Promise<Artist> =>
    mapArtist(await transport.get("artist/get", { artist_id: artistId })),
  getSimilar: async (
    artistId: number,
    options: PageOptions = {},
  ): Promise<Artist[]> => {
    const raw = await transport.get<RawSimilar>("artist/getSimilarArtists", {
      artist_id: artistId,
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
    })
    return (raw.artists?.items ?? []).map(mapArtist)
  },
})
