import { createKeychainStore, createQobuzClient } from "./dist/index.js"

const client = await createQobuzClient({ store: createKeychainStore() })

const results = await client.search.search("radiohead", { limit: 3 })
console.log("✓ search.search:")
for (const a of results.albums)
  console.log(`   ${a.artist?.name} — ${a.title} [${a.id}]`)

const album = await client.albums.get(results.albums[0].id)
console.log(
  `✓ albums.get: "${album.title}" — ${album.tracksCount} tracks, released ${album.releaseDate}`,
)

const favs = await client.favourites.list("albums", { limit: 5 })
console.log(`✓ favourites.list: ${favs.albums.length} album(s) returned`)

console.log(`✓ deepLink.album: ${client.deepLink.album(results.albums[0].id)}`)
console.log("\n✓ @kud/qobuz works end-to-end against the live API.")
