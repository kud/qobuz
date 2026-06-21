import { mapArtist } from "../mappers.js"
import type { Transport } from "../http/transport.js"
import type { Artist } from "../types/domain.js"

export const createArtistsResource = (transport: Transport) => ({
  get: async (artistId: number): Promise<Artist> =>
    mapArtist(await transport.get("artist/get", { artist_id: artistId })),
})
