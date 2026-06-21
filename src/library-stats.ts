import { execFile } from "node:child_process"
import { homedir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"

const exec = promisify(execFile)

export type LibraryStatsOptions = {
  /** Override the Qobuz desktop library database (defaults to the macOS path). */
  path?: string
  /** How many rows to return for each "top N" breakdown (default 10). */
  limit?: number
}

export type NamedCount = { name: string; count: number }
export type QualityBucket = { bitDepth: number; count: number }
export type MonthCount = { month: string; count: number }

export type LibraryStats = {
  /** Row counts. `offline*` = downloaded for offline; `savedTracks` = broader saved-track metadata. */
  totals: {
    offlineAlbums: number
    offlineArtists: number
    offlineTracks: number
    savedTracks: number
  }
  /** Offline tracks grouped by bit depth (16-bit vs 24-bit hi-res). */
  quality: QualityBucket[]
  /** Most common genres across saved tracks. */
  topGenres: NamedCount[]
  /** Most common record labels across saved tracks. */
  topLabels: NamedCount[]
  /** Artists with the most albums in the offline library. */
  topArtists: NamedCount[]
  /** Albums added to the library per month, most recent first. */
  recentlyAdded: MonthCount[]
}

/**
 * The Qobuz desktop app (Electron) keeps its library in a local SQLite file.
 * macOS exposes no listening API, so this is the source for collection analytics.
 */
export const defaultLibraryDbPath = (): string =>
  join(homedir(), "Library/Application Support/Qobuz/qobuz.db")

const runQuery = async <T>(dbUri: string, sql: string): Promise<T[]> => {
  const { stdout } = await exec("sqlite3", [dbUri, "-json", sql])
  const trimmed = stdout.trim()
  return trimmed ? (JSON.parse(trimmed) as T[]) : []
}

/**
 * Read collection analytics from the Qobuz desktop library — no API call, no
 * auth. Reads the SQLite database read-only and immutable so the running app is
 * never disturbed. Returns `undefined` if the database (or `sqlite3`) is absent.
 * macOS only.
 */
export const readLibraryStats = async (
  options: LibraryStatsOptions = {},
): Promise<LibraryStats | undefined> => {
  const dbUri = `file:${options.path ?? defaultLibraryDbPath()}?mode=ro&immutable=1`
  const limit = Math.max(1, Math.floor(options.limit ?? 10))

  try {
    const [totals, quality, topGenres, topLabels, topArtists, recentlyAdded] =
      await Promise.all([
        runQuery<LibraryStats["totals"]>(
          dbUri,
          `SELECT
             (SELECT count(*) FROM L_Album) AS offlineAlbums,
             (SELECT count(*) FROM L_Artist) AS offlineArtists,
             (SELECT count(*) FROM L_Track) AS offlineTracks,
             (SELECT count(*) FROM S_Track) AS savedTracks`,
        ),
        runQuery<QualityBucket>(
          dbUri,
          `SELECT bit_depth AS bitDepth, count(*) AS count
             FROM L_Track GROUP BY bit_depth ORDER BY count DESC`,
        ),
        runQuery<NamedCount>(
          dbUri,
          `SELECT genre_name AS name, count(*) AS count FROM S_Track
             WHERE genre_name <> '' GROUP BY genre_name ORDER BY count DESC LIMIT ${limit}`,
        ),
        runQuery<NamedCount>(
          dbUri,
          `SELECT label_name AS name, count(*) AS count FROM S_Track
             WHERE label_name <> '' GROUP BY label_name ORDER BY count DESC LIMIT ${limit}`,
        ),
        runQuery<NamedCount>(
          dbUri,
          `SELECT a.name AS name, count(*) AS count FROM L_Album al
             JOIN L_Artist a ON al.artist_id = a.id
             GROUP BY a.name ORDER BY count DESC LIMIT ${limit}`,
        ),
        runQuery<MonthCount>(
          dbUri,
          `SELECT substr(added_date, 1, 7) AS month, count(*) AS count FROM L_Album
             WHERE added_date IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 12`,
        ),
      ])

    if (!totals[0]) return undefined
    return {
      totals: totals[0],
      quality,
      topGenres,
      topLabels,
      topArtists,
      recentlyAdded,
    }
  } catch {
    return undefined
  }
}
