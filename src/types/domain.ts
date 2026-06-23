export type QobuzImage = {
  thumbnail?: string
  small?: string
  large?: string
}

export type Artist = {
  id: number
  name: string
  picture?: string
  albumsCount?: number
}

export type Album = {
  id: string
  title: string
  artist?: Artist
  tracksCount?: number
  releaseDate?: string
  duration?: number
  image?: QobuzImage
  genre?: string
  hires?: boolean
  url?: string
}

export type Track = {
  id: number
  title: string
  album?: Album
  artist?: Artist
  trackNumber?: number
  duration?: number
  hires?: boolean
  isrc?: string
}

export type Playlist = {
  id: number
  name: string
  description?: string
  tracksCount?: number
  isPublic?: boolean
  owner?: string
  duration?: number
}

export type SearchResults = {
  query: string
  albums: Album[]
  tracks: Track[]
  artists: Artist[]
}

export type FavouriteType = "albums" | "artists" | "tracks"

export type PageOptions = {
  limit?: number
  offset?: number
}
