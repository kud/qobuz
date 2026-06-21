import { mapTrack } from "../mappers.js"
import type { Transport } from "../http/transport.js"
import type { Track } from "../types/domain.js"

export const createTracksResource = (transport: Transport) => ({
  get: async (trackId: number): Promise<Track> =>
    mapTrack(await transport.get("track/get", { track_id: trackId })),
})
