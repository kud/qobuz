import { mapAlbum, mapArtist, mapTrack } from "../mappers.js"
import type { Transport } from "../http/transport.js"
import type { PageOptions, SearchResults } from "../types/domain.js"

type RawSearch = {
  albums?: { items?: unknown[] }
  tracks?: { items?: unknown[] }
  artists?: { items?: unknown[] }
}

export const createSearchResource = (transport: Transport) => ({
  search: async (
    query: string,
    options: PageOptions = {},
  ): Promise<SearchResults> => {
    const raw = await transport.get<RawSearch>("catalog/search", {
      query,
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
    })
    return {
      query,
      albums: (raw.albums?.items ?? []).map(mapAlbum),
      tracks: (raw.tracks?.items ?? []).map(mapTrack),
      artists: (raw.artists?.items ?? []).map(mapArtist),
    }
  },
})
