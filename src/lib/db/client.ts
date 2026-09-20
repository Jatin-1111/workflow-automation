/**
 * MongoDB connection.
 *
 * The client is cached on `globalThis` so Next.js hot reloads reuse one pool
 * instead of leaking a new connection on every edit.
 */

import { MongoClient, type Db } from 'mongodb'

const globalForMongo = globalThis as typeof globalThis & {
  __businessOrbitMongo?: { client: MongoClient; promise: Promise<MongoClient> }
}

function connectionUri(): string {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env.local and start MongoDB with `npm run db:up`.',
    )
  }
  return uri
}

function databaseName(): string {
  return process.env.MONGO_DB ?? 'business_orbit'
}

export function getMongoClient(): Promise<MongoClient> {
  if (!globalForMongo.__businessOrbitMongo) {
    const client = new MongoClient(connectionUri())
    globalForMongo.__businessOrbitMongo = { client, promise: client.connect() }
  }
  return globalForMongo.__businessOrbitMongo.promise
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient()
  return client.db(databaseName())
}

/** Close the pool. For scripts only — never call this from a request. */
export async function closeMongoClient(): Promise<void> {
  const cached = globalForMongo.__businessOrbitMongo
  if (!cached) return
  globalForMongo.__businessOrbitMongo = undefined
  await cached.client.close()
}
