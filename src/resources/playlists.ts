import { mapPlaylist } from "../mappers.js"
import type { Transport } from "../http/transport.js"
import type { PageOptions, Playlist } from "../types/domain.js"

type RawPlaylists = { playlists?: { items?: unknown[] } }

export type CreatePlaylistParams = {
  name: string
  description?: string
  isPublic?: boolean
}

export type UpdatePlaylistParams = {
  name?: string
  description?: string
  isPublic?: boolean
}

export const createPlaylistsResource = (transport: Transport) => ({
  listForUser: async (options: PageOptions = {}): Promise<Playlist[]> => {
    const raw = await transport.get<RawPlaylists>("playlist/getUserPlaylists", {
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
    })
    return (raw.playlists?.items ?? []).map(mapPlaylist)
  },
  get: async (
    playlistId: number,
    options: PageOptions = {},
  ): Promise<Playlist> =>
    mapPlaylist(
      await transport.get("playlist/get", {
        playlist_id: playlistId,
        extra: "tracks",
        limit: options.limit ?? 500,
        offset: options.offset ?? 0,
      }),
    ),
  create: async ({
    name,
    description,
    isPublic,
  }: CreatePlaylistParams): Promise<Playlist> =>
    mapPlaylist(
      await transport.get("playlist/create", {
        name,
        description,
        is_public: isPublic ? 1 : 0,
      }),
    ),
  update: async (
    playlistId: number,
    { name, description, isPublic }: UpdatePlaylistParams,
  ): Promise<Playlist> =>
    mapPlaylist(
      await transport.get("playlist/update", {
        playlist_id: playlistId,
        name,
        description,
        is_public: isPublic === undefined ? undefined : isPublic ? 1 : 0,
      }),
    ),
  remove: async (playlistId: number): Promise<void> => {
    await transport.get("playlist/delete", { playlist_id: playlistId })
  },
  addTracks: async (
    playlistId: number,
    trackIds: number[],
  ): Promise<Playlist> =>
    mapPlaylist(
      await transport.get("playlist/addTracks", {
        playlist_id: playlistId,
        track_ids: trackIds.join(","),
      }),
    ),
  removeTracks: async (
    playlistId: number,
    playlistTrackIds: number[],
  ): Promise<Playlist> =>
    mapPlaylist(
      await transport.get("playlist/deleteTracks", {
        playlist_id: playlistId,
        playlist_track_ids: playlistTrackIds.join(","),
      }),
    ),
})
