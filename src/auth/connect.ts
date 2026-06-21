import { createQobuzClient, type QobuzClient } from "../client.js"
import { fetchAppId } from "./bootstrap.js"
import { validateCredentials } from "./validate.js"
import type { CredentialStore } from "./credential-store.js"

export type ConnectConfig = {
  token: string
  appId?: string
  store: CredentialStore
  fetchImpl?: typeof fetch
}

export const connect = async ({
  token,
  appId,
  store,
  fetchImpl,
}: ConnectConfig): Promise<QobuzClient> => {
  const resolvedAppId = appId ?? (await fetchAppId({ fetchImpl })).appId
  await validateCredentials({ appId: resolvedAppId, token, fetchImpl })
  await store.save({ appId: resolvedAppId, token })
  return createQobuzClient({ store, fetchImpl })
}
