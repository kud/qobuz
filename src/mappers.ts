import type {
  Album,
  Artist,
  Playlist,
  QobuzImage,
  Track,
} from "./types/domain.js"

type Raw = any

const mapImage = (raw: Raw | undefined): QobuzImage | undefined =>
  raw
    ? { thumbnail: raw.thumbnail, small: raw.small, large: raw.large }
    : undefined

export const mapArtist = (raw: Raw): Artist => ({
  id: raw.id,
  name: raw.name,
  picture: raw.picture ?? raw.image?.medium,
  albumsCount: raw.albums_count,
})

export const mapAlbum = (raw: Raw): Album => ({
  id: String(raw.id),
  title: raw.title,
  artist: raw.artist ? mapArtist(raw.artist) : undefined,
  tracksCount: raw.tracks_count,
  releaseDate: raw.release_date_original ?? raw.released_at,
  duration: raw.duration,
  image: mapImage(raw.image),
  genre: raw.genre?.name,
  hires: raw.hires,
  url: raw.url,
})

export const mapTrack = (raw: Raw): Track => ({
  id: raw.id,
  title: raw.title,
  album: raw.album ? mapAlbum(raw.album) : undefined,
  artist: raw.performer
    ? mapArtist(raw.performer)
    : raw.artist
      ? mapArtist(raw.artist)
      : undefined,
  trackNumber: raw.track_number,
  duration: raw.duration,
  hires: raw.hires,
  isrc: raw.isrc,
})

export const mapPlaylist = (raw: Raw): Playlist => ({
  id: raw.id,
  name: raw.name,
  description: raw.description,
  tracksCount: raw.tracks_count,
  isPublic: raw.is_public,
  owner: raw.owner?.name,
  duration: raw.duration,
})
