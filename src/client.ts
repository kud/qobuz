import { createAppLink, createDeepLink } from "./deep-link.js"
import { authError } from "./http/errors.js"
import {
  createSelfHealingTransport,
  DEFAULT_LOGIN_COMMAND,
} from "./auth/self-healing-transport.js"
import { createAlbumsResource } from "./resources/albums.js"
import { createArtistsResource } from "./resources/artists.js"
import { createFavouritesResource } from "./resources/favourites.js"
import { createPlaylistsResource } from "./resources/playlists.js"
import { createSearchResource } from "./resources/search.js"
import { createTracksResource } from "./resources/tracks.js"
import { readNowPlayingTrackId, type NowPlayingOptions } from "./now-playing.js"
import type { CredentialStore } from "./auth/credential-store.js"
import type { Track } from "./types/domain.js"

export type QobuzClientConfig = {
  store: CredentialStore
  fetchImpl?: typeof fetch
  /** Command named in the "log in again" error, e.g. `qobuz login`. */
  loginCommand?: string
}

export const createQobuzClient = async ({
  store,
  fetchImpl,
  loginCommand = DEFAULT_LOGIN_COMMAND,
}: QobuzClientConfig) => {
  const credentials = await store.load()
  if (!credentials)
    throw authError(
      `not connected — log in first with \`${loginCommand}\``,
    )

  // Recovers on its own when Qobuz rotates its app_id: one re-scrape, one
  // persisted update, one retry; otherwise a "log in again" auth error.
  const transport = createSelfHealingTransport({
    credentials,
    store,
    fetchImpl,
    loginCommand,
  })

  const tracks = createTracksResource(transport)

  return {
    get appId() {
      return transport.appId
    },
    search: createSearchResource(transport),
    albums: createAlbumsResource(transport),
    artists: createArtistsResource(transport),
    tracks,
    favourites: createFavouritesResource(transport),
    playlists: createPlaylistsResource(transport),
    deepLink: createDeepLink(),
    appLink: createAppLink(),
    nowPlaying: async (
      options?: NowPlayingOptions,
    ): Promise<Track | undefined> => {
      const trackId = await readNowPlayingTrackId(options)
      return trackId === undefined ? undefined : tracks.get(trackId)
    },
    signOut: () => store.clear(),
  }
}

export type QobuzClient = Awaited<ReturnType<typeof createQobuzClient>>
