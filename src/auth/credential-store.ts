import { execFile } from "node:child_process"
import { promisify } from "node:util"

const exec = promisify(execFile)

export type StoredCredentials = {
  appId: string
  token: string
  savedAt?: string
}

export type CredentialStore = {
  load: () => Promise<StoredCredentials | undefined>
  save: (credentials: StoredCredentials) => Promise<void>
  clear: () => Promise<void>
}

export const createMemoryStore = (
  seed?: StoredCredentials,
): CredentialStore => {
  let current = seed
  return {
    load: async () => current,
    save: async (credentials) => {
      current = credentials
    },
    clear: async () => {
      current = undefined
    },
  }
}

export type KeychainStoreOptions = {
  service?: string
  account?: string
}

export const createKeychainStore = (
  options: KeychainStoreOptions = {},
): CredentialStore => {
  const service = options.service ?? "qobuz"
  const account = options.account ?? "credentials"

  return {
    load: async () => {
      try {
        const { stdout } = await exec("security", [
          "find-generic-password",
          "-s",
          service,
          "-a",
          account,
          "-w",
        ])
        return JSON.parse(stdout.trim()) as StoredCredentials
      } catch {
        return undefined
      }
    },
    save: async (credentials) => {
      const value = JSON.stringify({
        ...credentials,
        savedAt: credentials.savedAt ?? new Date().toISOString(),
      })
      await exec("security", [
        "add-generic-password",
        "-U",
        "-s",
        service,
        "-a",
        account,
        "-w",
        value,
      ])
    },
    clear: async () => {
      try {
        await exec("security", [
          "delete-generic-password",
          "-s",
          service,
          "-a",
          account,
        ])
      } catch {
        // nothing stored — nothing to clear
      }
    },
  }
}
