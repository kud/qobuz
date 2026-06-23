import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

export type NowPlayingOptions = {
  /** Override the Qobuz desktop player-state file (defaults to the macOS path). */
  path?: string
}

/**
 * The Qobuz desktop app (Electron) persists its play queue here. macOS does not
 * expose Qobuz to its now-playing system, so this local file is the source of truth.
 */
export const defaultPlayerStatePath = (): string =>
  join(homedir(), "Library/Application Support/Qobuz/player-0.json")

/**
 * The id of the track Qobuz is currently playing, read from the desktop app's
 * local state. Returns `undefined` if nothing is playing or the file is absent.
 */
export const readNowPlayingTrackId = async (
  options: NowPlayingOptions = {},
): Promise<number | undefined> => {
  try {
    const state = JSON.parse(
      await readFile(options.path ?? defaultPlayerStatePath(), "utf8"),
    )
    const queue = state?.playqueue?.data
    const activeList = queue?.shuffled ? queue?.shuffledItems : queue?.items
    const trackId = activeList?.[queue?.currentIndex]?.trackId
    return typeof trackId === "number" ? trackId : undefined
  } catch {
    return undefined
  }
}
