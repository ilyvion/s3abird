import { openDB } from 'idb'
import type { ParsedEmail } from './parser'
import type { EmailMeta } from './parser'
import { decodeCacheKey } from './config'

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

interface BucketLocator {
    aws_region: string
    bucket: string
}

interface CacheEntry {
    email: ParsedEmail
    cachedAt: number
}

const DB_NAME = import.meta.env.VITE_DB_NAME ?? 'email-cache'

const dbPromise = openDB(DB_NAME, 4, {
    upgrade(db, oldVersion) {
        if (oldVersion < 2) {
            // Entries from v1 have no timestamp; drop and recreate the store.
            if (db.objectStoreNames.contains('emails')) {
                db.deleteObjectStore('emails')
            }
            db.createObjectStore('emails')
        }
        if (oldVersion < 3) {
            db.createObjectStore('email-meta')
        }
        if (oldVersion < 4) {
            db.createObjectStore('read-status')
        }
    },
})

export async function getCachedEmail(key: string): Promise<ParsedEmail | undefined> {
    const db = await dbPromise
    const entry: CacheEntry | undefined = await db.get('emails', key)
    if (!entry) return undefined
    if (entry.cachedAt < Date.now() - FOURTEEN_DAYS_MS) {
        await db.delete('emails', key)
        await db.delete('email-meta', key)
        return undefined
    }
    return entry.email
}

export async function setCachedEmail(key: string, value: ParsedEmail) {
    const db = await dbPromise
    const entry: CacheEntry = { email: value, cachedAt: Date.now() }
    return db.put('emails', entry, key)
}

export async function setEmailMeta(key: string, value: EmailMeta): Promise<void> {
    const db = await dbPromise
    await db.put('email-meta', value, key)
}

export async function getAllEmailMetas(): Promise<EmailMeta[]> {
    const db = await dbPromise
    return db.getAll('email-meta')
}

export async function evictStaleEntries() {
    const db = await dbPromise
    const cutoff = Date.now() - FOURTEEN_DAYS_MS
    const tx = db.transaction(['emails', 'email-meta'], 'readwrite')
    const staleKeys: IDBValidKey[] = []
    let cursor = await tx.objectStore('emails').openCursor()
    while (cursor) {
        if ((cursor.value as CacheEntry).cachedAt < cutoff) staleKeys.push(cursor.key)
        cursor = await cursor.continue()
    }
    await Promise.all(
        staleKeys.flatMap((key) => [
            tx.objectStore('emails').delete(key),
            tx.objectStore('email-meta').delete(key),
        ])
    )
    await tx.done
}

export async function markAsRead(key: string): Promise<void> {
    const db = await dbPromise
    await db.put('read-status', { readAt: Date.now() }, key)
}

export async function getReadKeys(): Promise<Set<string>> {
    const db = await dbPromise
    const keys = await db.getAllKeys('read-status')
    return new Set(keys as string[])
}

export async function clearEmailCacheForBuckets(buckets: BucketLocator[]): Promise<void> {
    if (buckets.length === 0) return
    const targets = new Set(buckets.map((b) => `${b.aws_region}|${b.bucket}`))
    const db = await dbPromise
    const tx = db.transaction(['emails', 'email-meta', 'read-status'], 'readwrite')
    for (const storeName of ['emails', 'email-meta', 'read-status'] as const) {
        const store = tx.objectStore(storeName)
        const keys = await store.getAllKeys()
        for (const key of keys) {
            const decoded = decodeCacheKey(key as string)
            if (decoded && targets.has(`${decoded.aws_region}|${decoded.bucket}`)) {
                await store.delete(key)
            }
        }
    }
    await tx.done
}

export async function clearEmailCache() {
    const db = await dbPromise
    const tx = db.transaction(['emails', 'email-meta', 'read-status'], 'readwrite')
    await tx.objectStore('emails').clear()
    await tx.objectStore('email-meta').clear()
    await tx.objectStore('read-status').clear()
    await tx.done
}
