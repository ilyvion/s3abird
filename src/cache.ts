import { openDB } from 'idb'
import type { ParsedEmail } from './parser'

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

interface CacheEntry {
    email: ParsedEmail
    cachedAt: number
}

const dbPromise = openDB('email-cache', 2, {
    upgrade(db, oldVersion) {
        if (oldVersion < 2) {
            // Entries from v1 have no timestamp; drop and recreate the store.
            if (db.objectStoreNames.contains('emails')) {
                db.deleteObjectStore('emails')
            }
            db.createObjectStore('emails')
        }
    },
})

export async function getCachedEmail(key: string): Promise<ParsedEmail | undefined> {
    const db = await dbPromise
    const entry: CacheEntry | undefined = await db.get('emails', key)
    if (!entry) return undefined
    if (entry.cachedAt < Date.now() - FOURTEEN_DAYS_MS) {
        await db.delete('emails', key)
        return undefined
    }
    return entry.email
}

export async function setCachedEmail(key: string, value: ParsedEmail) {
    const db = await dbPromise
    const entry: CacheEntry = { email: value, cachedAt: Date.now() }
    return db.put('emails', entry, key)
}

export async function evictStaleEntries() {
    const db = await dbPromise
    const cutoff = Date.now() - FOURTEEN_DAYS_MS
    const tx = db.transaction('emails', 'readwrite')
    let cursor = await tx.store.openCursor()
    while (cursor) {
        const entry = cursor.value as CacheEntry
        if (entry.cachedAt < cutoff) {
            await cursor.delete()
        }
        cursor = await cursor.continue()
    }
    await tx.done
}

export async function clearEmailCache() {
    const db = await dbPromise
    await db.clear('emails')
}
