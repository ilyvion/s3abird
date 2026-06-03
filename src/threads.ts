import type { EmailMeta } from './parser'

export interface ThreadGroup {
    threadId: string
    emails: EmailMeta[]
    latest: EmailMeta
    latestTimestamp: number
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

    // Pre-compute timestamps once to avoid repeated new Date() in sort comparators
    const emailTimestamps = new Map<string, number>()
    for (const meta of metas) {
        emailTimestamps.set(meta.key, meta.date ? new Date(meta.date).getTime() : 0)
    }

    // Build ThreadGroup list
    const result: ThreadGroup[] = []
    for (const [root, emails] of groups) {
        // Sort oldest-first within thread
        emails.sort((a, b) => (emailTimestamps.get(a.key) ?? 0) - (emailTimestamps.get(b.key) ?? 0))

        // After oldest-first sort, the last element is the latest
        const latest = emails[emails.length - 1]
        const latestTimestamp = emailTimestamps.get(latest.key) ?? 0

        // threadId is root email's messageId, or the root key if unknown
        const rootMeta = metas.find((m) => m.key === root)
        const threadId = rootMeta?.messageId ?? root

        result.push({ threadId, emails, latest, latestTimestamp, count: emails.length })
    }

    // Sort threads by latest date descending
    result.sort((a, b) => b.latestTimestamp - a.latestTimestamp)

    return result
}
