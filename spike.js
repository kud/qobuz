// Feasibility spike for @kud/qobuz, using the real login UX.
//
// Flow:
//   1. Look for a saved session in the macOS Keychain.
//   2. If none, prompt for email + password (password hidden), scrape app_id,
//      log in, and store { appId, token } in the Keychain. Password is never saved.
//   3. Prove the API works: search -> metadata -> library.
//
// Run it in your own terminal (it prompts interactively):
//   node spike.js          # first run logs in; later runs reuse the Keychain token
//   node spike.js --logout # clear the saved session
//
// Zero dependencies — Node 20+ built-in fetch/crypto + the macOS `security` CLI.

import readline from "node:readline"
import { execFileSync } from "node:child_process"

const BASE = "https://www.qobuz.com/api.json/0.2"
const PLAY = "https://play.qobuz.com"
const KEYCHAIN_SERVICE = "qobuz"
const KEYCHAIN_ACCOUNT = "credentials"
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const authHeaders = (appId, token) => ({
  "User-Agent": USER_AGENT,
  "X-App-Id": appId,
  ...(token ? { "X-User-Auth-Token": token } : {}),
})

const heading = (label) =>
  console.log(`\n── ${label} ${"─".repeat(Math.max(0, 56 - label.length))}`)
const ok = (label) => console.log(`  ✓ ${label}`)
const fail = (label) => console.log(`  ✗ ${label}`)

// --- Keychain (macOS `security` CLI, no shell, secret passed as an arg) --------
const keychainLoad = () => {
  try {
    const raw = execFileSync(
      "security",
      [
        "find-generic-password",
        "-s",
        KEYCHAIN_SERVICE,
        "-a",
        KEYCHAIN_ACCOUNT,
        "-w",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim()
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const keychainSave = (session) => {
  execFileSync(
    "security",
    [
      "add-generic-password",
      "-U",
      "-s",
      KEYCHAIN_SERVICE,
      "-a",
      KEYCHAIN_ACCOUNT,
      "-w",
      JSON.stringify(session),
    ],
    { stdio: "ignore" },
  )
}

const keychainClear = () => {
  try {
    execFileSync(
      "security",
      [
        "delete-generic-password",
        "-s",
        KEYCHAIN_SERVICE,
        "-a",
        KEYCHAIN_ACCOUNT,
      ],
      {
        stdio: "ignore",
      },
    )
  } catch {
    /* nothing stored */
  }
}

// --- interactive prompts (one shared readline interface) ----------------------
const createPrompts = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const ask = (question) =>
    new Promise((resolve) =>
      rl.question(question, (answer) => resolve(answer.trim())),
    )

  const askHidden = (question) =>
    new Promise((resolve) => {
      let muted = false
      rl._writeToOutput = (chunk) => {
        if (!muted) rl.output.write(chunk)
      }
      rl.question(question, (answer) => {
        rl._writeToOutput = (chunk) => rl.output.write(chunk)
        rl.output.write("\n")
        resolve(answer)
      })
      muted = true
    })

  return { ask, askHidden, close: () => rl.close() }
}

// --- bootstrap: scrape app_id from the live web bundle ------------------------
const getText = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
  return res.text()
}

const bootstrapAppId = async () => {
  const loginPage = await getText(`${PLAY}/login`)
  const bundlePath = loginPage.match(
    /<script src="(\/resources\/\d+\.\d+\.\d+-[a-z]\d{3}\/bundle\.js)"><\/script>/,
  )?.[1]
  if (!bundlePath) throw new Error("bundle.js URL not found in login page")
  const bundle = await getText(`${PLAY}${bundlePath}`)
  const appId = bundle.match(/production:\{api:\{appId:"(\d{9})"/)?.[1]
  if (!appId) throw new Error("app_id not found in bundle")
  return { appId, bundlePath }
}

// --- authed read --------------------------------------------------------------
const apiGet = async (appId, token, path, query = {}) => {
  const url = `${BASE}/${path}?${new URLSearchParams(query)}`
  const res = await fetch(url, { headers: authHeaders(appId, token) })
  if (!res.ok)
    throw new Error(
      `${path} -> ${res.status}: ${(await res.text()).slice(0, 200)}`,
    )
  return res.json()
}

const validateSession = (appId, token) =>
  apiGet(appId, token, "favorite/getUserFavorites", {
    type: "albums",
    limit: "1",
  })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const countdownAndOpen = async (url, seconds = 3) => {
  for (const n of Array.from({ length: seconds }, (_, i) => seconds - i)) {
    process.stdout.write(`\r  Opening ${url} in ${n}… `)
    await sleep(1000)
  }
  process.stdout.write(`\r  Opening ${url} now.${" ".repeat(20)}\n\n`)
  try {
    execFileSync("open", [url])
  } catch {
    console.log(`  (couldn't open a browser — visit ${url} manually)`)
  }
}

// --- connect: user pastes app_id + user_auth_token from their browser ---------
const promptForCredentials = async () => {
  console.log("  Connect your Qobuz account.")
  console.log(
    "  In the page that opens: log in, then DevTools → Network, click",
  )
  console.log(
    "  any request to www.qobuz.com/api.json and copy these from its headers:\n",
  )

  const scraped = await bootstrapAppId()
    .then((b) => b.appId)
    .catch(() => "")
  await countdownAndOpen(`${PLAY}/login`)
  const prompts = createPrompts()
  const appIdInput = await prompts.ask(
    `    X-App-Id${scraped ? ` [${scraped}]` : ""}: `,
  )
  const token = await prompts.askHidden("    X-User-Auth-Token: ")
  prompts.close()

  const appId = appIdInput || scraped
  if (!appId || !token)
    throw new Error("both X-App-Id and X-User-Auth-Token are required")
  return { appId, token }
}

// --- resolve a session: Keychain -> env -> interactive connect ----------------
const resolveSession = async () => {
  const saved = keychainLoad()
  if (saved?.appId && saved?.token) {
    ok(
      `reusing saved session from Keychain (token ${saved.token.slice(0, 8)}…)`,
    )
    return saved
  }

  const fromEnv = process.env.QOBUZ_TOKEN
    ? { appId: process.env.QOBUZ_APP_ID ?? "", token: process.env.QOBUZ_TOKEN }
    : null
  const entered = fromEnv ?? (await promptForCredentials())
  const appId = entered.appId || (await bootstrapAppId()).appId

  await validateSession(appId, entered.token)
  ok("token validated against Qobuz")

  const session = {
    appId,
    token: entered.token,
    savedAt: new Date().toISOString(),
  }
  keychainSave(session)
  ok("session saved to Keychain")
  return session
}

const run = async () => {
  if (process.argv.includes("--logout")) {
    keychainClear()
    console.log("Cleared saved Qobuz session from Keychain.")
    return
  }

  heading("session")
  const { appId, token } = await resolveSession()

  heading("search")
  const search = await apiGet(appId, token, "catalog/search", {
    query: "radiohead",
    limit: "5",
  })
  const albums = search.albums?.items ?? []
  ok(`search returned ${albums.length} album(s)`)
  for (const a of albums.slice(0, 5)) {
    console.log(`     - ${a.artist?.name ?? "?"} — ${a.title}  [${a.id}]`)
  }

  heading("metadata + library")
  if (albums[0]) {
    const album = await apiGet(appId, token, "album/get", {
      album_id: albums[0].id,
    })
    ok(
      `album/get → "${album.title}" by ${album.artist?.name} (${album.tracks_count} tracks)`,
    )
  }
  const favs = await apiGet(appId, token, "favorite/getUserFavorites", {
    type: "albums",
    limit: "5",
  })
  ok(`favourites → ${favs.albums?.total ?? 0} favourite album(s)`)

  heading("VERDICT")
  console.log(
    "  ✓ Core API chain works: login → Keychain → search → metadata → library.",
  )
  console.log("  The v1 (deep-link) approach is viable.\n")
}

run().catch((err) => {
  console.error(`\n  ✗ SPIKE FAILED: ${err.message}\n`)
  process.exit(1)
})
