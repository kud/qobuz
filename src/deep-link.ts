export type DeepLinkBase = "open" | "play"

export type DeepLink = {
  album: (albumId: string) => string
  track: (trackId: number) => string
  playlist: (playlistId: number) => string
  artist: (artistId: number) => string
}

export const createDeepLink = (base: DeepLinkBase = "open"): DeepLink => {
  const root = `https://${base}.qobuz.com`
  return {
    album: (albumId) => `${root}/album/${albumId}`,
    track: (trackId) => `${root}/track/${trackId}`,
    playlist: (playlistId) => `${root}/playlist/${playlistId}`,
    artist: (artistId) => `${root}/artist/${artistId}`,
  }
}

export const createAppLink = (): DeepLink => ({
  album: (albumId) => `qobuzapp://album/${albumId}`,
  track: (trackId) => `qobuzapp://track/${trackId}`,
  playlist: (playlistId) => `qobuzapp://playlist/${playlistId}`,
  artist: (artistId) => `qobuzapp://artist/${artistId}`,
})
