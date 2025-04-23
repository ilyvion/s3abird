import { openDB } from 'idb'
import type { ParsedEmail } from './parser'

const dbPromise = openDB('email-cache', 1, {
    upgrade(db) {
        db.createObjectStore('emails')
    },
})

export async function getCachedEmail(key: string): Promise<ParsedEmail | undefined> {
    const db = await dbPromise
    return db.get('emails', key)
}

export async function setCachedEmail(key: string, value: ParsedEmail) {
    const db = await dbPromise
    return db.put('emails', value, key)
}

export async function clearEmailCache() {
    const db = await dbPromise
    await db.clear('emails')
}
