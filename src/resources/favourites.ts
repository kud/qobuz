import { mapAlbum, mapArtist, mapTrack } from "../mappers.js"
import type { Transport } from "../http/transport.js"
import type {
  Album,
  Artist,
  FavouriteType,
  PageOptions,
  Track,
} from "../types/domain.js"

export type UserFavourites = {
  albums: Album[]
  artists: Artist[]
  tracks: Track[]
}

type RawFavourites = {
  albums?: { items?: unknown[] }
  artists?: { items?: unknown[] }
  tracks?: { items?: unknown[] }
}

const favouriteIdParam: Record<FavouriteType, string> = {
  albums: "album_ids",
  artists: "artist_ids",
  tracks: "track_ids",
}

export const createFavouritesResource = (transport: Transport) => ({
  list: async (
    type: FavouriteType,
    options: PageOptions = {},
  ): Promise<UserFavourites> => {
    const raw = await transport.get<RawFavourites>(
      "favorite/getUserFavorites",
      {
        type,
        limit: options.limit ?? 50,
        offset: options.offset ?? 0,
      },
    )
    return {
      albums: (raw.albums?.items ?? []).map(mapAlbum),
      artists: (raw.artists?.items ?? []).map(mapArtist),
      tracks: (raw.tracks?.items ?? []).map(mapTrack),
    }
  },
  add: async (type: FavouriteType, id: string): Promise<void> => {
    await transport.get("favorite/create", { [favouriteIdParam[type]]: id })
  },
  remove: async (type: FavouriteType, id: string): Promise<void> => {
    await transport.get("favorite/delete", { [favouriteIdParam[type]]: id })
  },
})
