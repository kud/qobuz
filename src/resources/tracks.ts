import { mapAlbum, mapTrack } from "../mappers.js"
import type { Transport } from "../http/transport.js"
import type { Track } from "../types/domain.js"

type RawSearch = {
  tracks?: { items?: unknown[] }
  albums?: { items?: { id: string }[] }
}
type RawAlbum = { tracks?: { items?: unknown[] } }

const pickByIsrc = (items: unknown[], isrc: string): Track | undefined => {
  const exact = items.map(mapTrack).filter((track) => track.isrc === isrc)
  return exact.find((track) => track.hires) ?? exact[0]
}

export const createTracksResource = (transport: Transport) => {
  const findByIsrc = async (isrc: string): Promise<Track | undefined> => {
    const raw = await transport.get<RawSearch>("catalog/search", {
      query: isrc,
      limit: 10,
    })
    return pickByIsrc(raw.tracks?.items ?? [], isrc)
  }

  return {
    get: async (trackId: number): Promise<Track> =>
      mapTrack(await transport.get("track/get", { track_id: trackId })),

    findByIsrc,

    /**
     * Find a track by ISRC, resilient to Qobuz's search-index gaps. The track
     * index lags for fresh releases, but the album index still carries them, so
     * if the direct ISRC search misses we search albums by `query` and look for
     * the ISRC inside each candidate album.
     */
    match: async ({
      isrc,
      query,
    }: {
      isrc?: string
      query?: string
    }): Promise<Track | undefined> => {
      if (isrc) {
        const direct = await findByIsrc(isrc)
        if (direct) return direct

        if (query) {
          const raw = await transport.get<RawSearch>("catalog/search", {
            query,
            limit: 3,
          })
          for (const album of raw.albums?.items ?? []) {
            const full = await transport.get<RawAlbum>("album/get", {
              album_id: album.id,
            })
            const hit = pickByIsrc(full.tracks?.items ?? [], isrc)
            if (hit) return { ...hit, album: mapAlbum(full) }
          }
        }
      }
      return undefined
    },
  }
}
