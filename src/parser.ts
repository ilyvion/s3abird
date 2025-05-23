import createDOMPurify from 'dompurify'
import PostalMime, { type Attachment, type Email, type RawEmail } from 'postal-mime'

const DOMPurify = createDOMPurify(window)

export type ParsedEmail = Email & {
    textAsHtml: string
    key: string
}

export default async function (email: RawEmail, emailKey: string): Promise<ParsedEmail> {
    const parsed = await PostalMime.parse(email)
    if (parsed.text) {
        parsed.text = DOMPurify.sanitize(parsed.text)
    }
    if (parsed.html) {
        parsed.html = DOMPurify.sanitize(parsed.html)
    }
    if (parsed.headers) {
        for (const header of parsed.headers) {
            header.key = DOMPurify.sanitize(header.key)
            header.value = DOMPurify.sanitize(header.value)
        }
    }

    let extended = parsed as ParsedEmail
    extended.textAsHtml = textToHtml(extended.text)
    extended.key = emailKey

    if (extended.html) {
        for (const attachment of extended.attachments) {
            if (!attachment.contentId) continue

            const cid = attachment.contentId.replace(/^<|>$/g, '') // strip angle brackets
            const base64 = attachmentToBase64(attachment)

            const dataUri = `data:${attachment.mimeType};base64,${base64}`
            const cidRegex = new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')

            extended.html = DOMPurify.sanitize(extended.html.replace(cidRegex, dataUri))
        }
    }

    return extended
}

function attachmentToBase64(att: Attachment): string {
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

    // Encode to base64
    return btoa(binary.reduce((data, byte) => data + String.fromCharCode(byte), ''))
}

function textToHtml(text: string | undefined): string {
    if (!text) return ''

    // Escape HTML special chars
    const escape = (str: string) =>
        str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Convert URLs to anchor tags
    const linkify = (str: string) =>
        str.replace(
            /https?:\/\/[^\s]+/g,
            (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
        )

    // Split paragraphs and wrap in <p>
    return escape(text)
        .split(/\n{2,}/)
        .map((p) => `<p>${linkify(p.replace(/\n/g, '<br>'))}</p>`)
        .join('\n')
}
