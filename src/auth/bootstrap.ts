import { bootstrapError } from "../http/errors.js"
import { USER_AGENT } from "../http/transport.js"

const PLAY_URL = "https://play.qobuz.com"

export type AppCredentials = {
  appId: string
  bundlePath: string
}

export const fetchAppId = async (
  options: { fetchImpl?: typeof fetch } = {},
): Promise<AppCredentials> => {
  const fetchImpl = options.fetchImpl ?? fetch

  const getText = async (url: string) => {
    const res = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT } })
    if (!res.ok) throw bootstrapError(`GET ${url} failed (${res.status})`)
    return res.text()
  }

  const loginPage = await getText(`${PLAY_URL}/login`)
  const bundlePath = loginPage.match(
    /<script src="(\/resources\/\d+\.\d+\.\d+-[a-z]\d{3}\/bundle\.js)"><\/script>/,
  )?.[1]
  if (!bundlePath)
    throw bootstrapError(
      "could not find the bundle.js URL in the Qobuz login page",
    )

  const bundle = await getText(`${PLAY_URL}${bundlePath}`)
  const appId = bundle.match(/production:\{api:\{appId:"(\d{9})"/)?.[1]
  if (!appId)
    throw bootstrapError("could not extract app_id from the Qobuz web bundle")

  return { appId, bundlePath }
}
