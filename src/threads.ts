import type { EmailMeta } from './parser'

export interface ThreadGroup {
    threadId: string
    emails: EmailMeta[]
    latest: EmailMeta
    count: number
}

export function groupIntoThreads(metas: EmailMeta[]): ThreadGroup[] {
    // Map from Message-ID value to email key
    const msgIdToKey = new Map<string, string>()
    for (const meta of metas) {
        if (meta.messageId) {
            msgIdToKey.set(meta.messageId, meta.key)
        }
    }

    // Union-Find over email keys
    const parent = new Map<string, string>()

    function find(x: string): string {
        if (!parent.has(x)) parent.set(x, x)
        const p = parent.get(x)!
        if (p !== x) {
            const root = find(p)
            parent.set(x, root)
            return root
        }
        return x
    }

    function union(a: string, b: string) {
        const ra = find(a)
        const rb = find(b)
        if (ra !== rb) parent.set(ra, rb)
    }

    // Initialize all keys in union-find
    for (const meta of metas) {
        find(meta.key)
    }

    // Connect emails via In-Reply-To and References
    for (const meta of metas) {
        if (meta.inReplyTo) {
            const replyKey = msgIdToKey.get(meta.inReplyTo)
            if (replyKey) union(meta.key, replyKey)
        }
        if (meta.references) {
            for (const ref of meta.references) {
                const refKey = msgIdToKey.get(ref)
                if (refKey) union(meta.key, refKey)
            }
        }
    }

    // Group emails by their root
    const groups = new Map<string, EmailMeta[]>()
    for (const meta of metas) {
        const root = find(meta.key)
        if (!groups.has(root)) groups.set(root, [])
        groups.get(root)!.push(meta)
    }

    // Build ThreadGroup list
    const result: ThreadGroup[] = []
    for (const [root, emails] of groups) {
        // Sort oldest-first within thread
        emails.sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0
            const db = b.date ? new Date(b.date).getTime() : 0
            return da - db
        })

        // Find the most recently dated email
        const latest = emails.reduce((newest, email) => {
            const dn = newest.date ? new Date(newest.date).getTime() : 0
            const de = email.date ? new Date(email.date).getTime() : 0
            return de > dn ? email : newest
        })

        // threadId is root email's messageId, or the root key if unknown
        const rootMeta = metas.find((m) => m.key === root)
        const threadId = rootMeta?.messageId ?? root

        result.push({ threadId, emails, latest, count: emails.length })
    }

    // Sort threads by latest date descending
    result.sort((a, b) => {
        const da = a.latest.date ? new Date(a.latest.date).getTime() : 0
        const db = b.latest.date ? new Date(b.latest.date).getTime() : 0
        return db - da
    })

    return result
}
