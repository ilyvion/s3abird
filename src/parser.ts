import createDOMPurify from 'dompurify'
import PostalMime, { type Address, type Attachment, type Email, type RawEmail } from 'postal-mime'
import { collapseBlockquotes } from './quoteCollapser.js'

const DOMPurify = createDOMPurify(window)

export type ParsedEmail = Email & {
    textAsHtml: string
    processedHtml: string
    key: string
    rawMessageId?: string
    rawInReplyTo?: string
    rawReferences?: string[]
}

const TEXT_PREVIEW_LENGTH = 200

export type EmailMeta = {
    key: string
    from?: Address
    to?: Address[]
    subject?: string
    date?: string
    formattedDate?: string
    textPreview: string
    messageId?: string
    inReplyTo?: string
    references?: string[]
}

export function extractMeta(email: ParsedEmail): EmailMeta {
    return {
        key: email.key,
        from: email.from,
        to: email.to,
        subject: email.subject,
        date: email.date,
        textPreview: (email.text ?? '').slice(0, TEXT_PREVIEW_LENGTH),
        messageId: email.rawMessageId,
        inReplyTo: email.rawInReplyTo,
        references: email.rawReferences,
    }
}

export function applyFormattedDate(meta: EmailMeta): EmailMeta {
    return { ...meta, formattedDate: meta.date ? new Date(meta.date).toLocaleString() : '' }
}

export default async function (email: RawEmail, emailKey: string): Promise<ParsedEmail> {
    const parsed = await PostalMime.parse(email)

    // Extract threading headers before DOMPurify sanitizes them — angle brackets
    // in Message-ID values like <foo@example.com> are treated as HTML tags and stripped.
    const findRawHeader = (name: string) =>
        parsed.headers?.find((h) => h.key.toLowerCase() === name)?.value
    const rawMessageId = findRawHeader('message-id')
    const rawInReplyTo = findRawHeader('in-reply-to')
    const rawReferencesStr = findRawHeader('references')

    if (parsed.headers) {
        for (const header of parsed.headers) {
            header.key = DOMPurify.sanitize(header.key)
            header.value = DOMPurify.sanitize(header.value)
        }
    }

    let extended = parsed as ParsedEmail
    extended.textAsHtml = DOMPurify.sanitize(textToHtml(extended.text))
    extended.key = emailKey
    extended.rawMessageId = rawMessageId
    extended.rawInReplyTo = rawInReplyTo
    extended.rawReferences = rawReferencesStr ? rawReferencesStr.trim().split(/\s+/) : undefined

    if (extended.html) {
        for (const attachment of extended.attachments) {
            if (!attachment.contentId) continue

            const cid = attachment.contentId.replace(/^<|>$/g, '') // strip angle brackets
            const base64 = attachmentToBase64(attachment)

            const dataUri = `data:${attachment.mimeType};base64,${base64}`
            const cidRegex = new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')

            extended.html = extended.html.replace(cidRegex, dataUri)
        }
        extended.html = DOMPurify.sanitize(extended.html)
    }

    extended.processedHtml = collapseBlockquotes(extended.html || extended.textAsHtml)

    return extended
}

export function isInlineAttachment(attachment: Attachment, html?: string): boolean {
    if (!attachment.contentId) return false
    // disposition:'inline' is the reliable signal after the parser has already
    // replaced cid: references with data URIs in the HTML
    if (attachment.disposition === 'inline') return true
    if (!html) return false
    const cid = attachment.contentId.replace(/^<|>$/g, '')
    return html.includes(`cid:${cid}`)
}

export function attachmentToBase64(att: Attachment): string {
    if (att.encoding === 'base64') {
        // Already base64 encoded
        if (typeof att.content !== 'string') {
            throw new Error('Base64-encoded attachment content must be a string')
        }
        return att.content
    }

    let binary: Uint8Array
    if (typeof att.content === 'string') {
        // utf8-encoded string → encode to binary
        binary = new TextEncoder().encode(att.content)
    } else {
        // already binary
        binary = new Uint8Array(att.content)
    }

    // Encode to base64 in chunks to avoid O(n²) string concatenation
    const CHUNK = 65536
    let str = ''
    for (let i = 0; i < binary.length; i += CHUNK)
        str += String.fromCharCode(...binary.subarray(i, i + CHUNK))
    return btoa(str)
}

const escape = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const linkify = (str: string) =>
    str.replace(
        /https?:\/\/[^\s]+/g,
        (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    )

// "On Monday, Apr 1 2024, Alice wrote:" — common reply attribution pattern
const ATTRIBUTION_RE = /^On .+ wrote:\s*$/

// Converts groups of >-prefixed lines to <blockquote> elements, recursively.
// Does NOT detect attribution lines — call textToHtml for that.
function processQuoteMarkers(text: string): string {
    const lines = text.split('\n')
    const segments: Array<{ quoted: boolean; lines: string[] }> = []

    for (const line of lines) {
        const quoted = line.startsWith('>')
        const last = segments[segments.length - 1]
        if (last && last.quoted === quoted) {
            last.lines.push(line)
        } else {
            segments.push({ quoted, lines: [line] })
        }
    }

    return segments
        .map((seg) => {
            if (seg.quoted) {
                // Strip leading > and optional whitespace, then recurse for nested quotes
                const stripped = seg.lines.map((l) => l.replace(/^>\s*/, '')).join('\n')
                return `<blockquote>${processQuoteMarkers(stripped)}</blockquote>`
            }
            return seg.lines
                .join('\n')
                .split(/\n{2,}/)
                .filter((p) => p.trim())
                .map((p) => `<p>${linkify(escape(p).replace(/\n/g, '<br>'))}</p>`)
                .join('\n')
        })
        .join('\n')
}

function textToHtml(text: string | undefined): string {
    if (!text) return ''

    const lines = text.split('\n')
    const attrIdx = lines.findIndex((l) => ATTRIBUTION_RE.test(l))

    if (attrIdx < 0) return processQuoteMarkers(text)

    // Everything from the attribution line onward is quoted context
    const mainHtml = processQuoteMarkers(lines.slice(0, attrIdx).join('\n'))
    const quotedHtml = processQuoteMarkers(lines.slice(attrIdx).join('\n'))
    return mainHtml + (quotedHtml ? `<blockquote>${quotedHtml}</blockquote>` : '')
}
