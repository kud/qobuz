import { mapTrack } from "../mappers.js"
import type { Transport } from "../http/transport.js"
import type { Track } from "../types/domain.js"

type RawTrackSearch = { tracks?: { items?: unknown[] } }

export const createTracksResource = (transport: Transport) => ({
  get: async (trackId: number): Promise<Track> =>
    mapTrack(await transport.get("track/get", { track_id: trackId })),

  findByIsrc: async (isrc: string): Promise<Track | undefined> => {
    const raw = await transport.get<RawTrackSearch>("catalog/search", {
      query: isrc,
      limit: 10,
    })
    const exact = (raw.tracks?.items ?? [])
      .map(mapTrack)
      .filter((track) => track.isrc === isrc)
    return exact.find((track) => track.hires) ?? exact[0]
  },
})
