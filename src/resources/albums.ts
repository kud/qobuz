import { mapAlbum } from "../mappers.js"
import type { Transport } from "../http/transport.js"
import type { Album } from "../types/domain.js"

export const createAlbumsResource = (transport: Transport) => ({
  get: async (albumId: string): Promise<Album> =>
    mapAlbum(await transport.get("album/get", { album_id: albumId })),
})
