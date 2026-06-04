// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import parse, {
    extractMeta,
    applyFormattedDate,
    isInlineAttachment,
    attachmentToBase64,
} from './parser'
import type { Attachment } from 'postal-mime'

const RAW_EMAIL_WITH_ANGLE_BRACKET_ADDRESS = `From: sender@example.com
To: recipient@example.com
Subject: Test
Content-Type: text/plain

Reply to <user@example.com> for more info.
`

describe('parser', () => {
    describe('plain-text emails', () => {
        it('preserves angle-bracket email addresses in plain text', async () => {
            const result = await parse(RAW_EMAIL_WITH_ANGLE_BRACKET_ADDRESS, 'test-key')
            expect(result.text).toContain('<user@example.com>')
        })

        it('does not sanitize plain text as HTML', async () => {
            const result = await parse(RAW_EMAIL_WITH_ANGLE_BRACKET_ADDRESS, 'test-key')
            expect(result.text?.trim()).toBe('Reply to <user@example.com> for more info.')
        })
    })

    describe('textAsHtml XSS sanitization', () => {
        it('sanitizes event-handler injection via crafted URL in linkify', async () => {
            const raw = `From: sender@example.com
To: recipient@example.com
Subject: XSS test
Content-Type: text/plain

Visit https://evil.com/" onmouseover="alert(1) for details.
`
            const result = await parse(raw, 'test-key')
            // DOMPurify strips the injected attribute — verify no element carries it
            const div = document.createElement('div')
            div.innerHTML = result.textAsHtml
            div.querySelectorAll('*').forEach((el) => {
                expect(el.getAttribute('onmouseover')).toBeNull()
            })
        })

        it('sanitizes script tags in textAsHtml', async () => {
            const raw = `From: sender@example.com
To: recipient@example.com
Subject: XSS test
Content-Type: text/plain

Hello <script>alert(1)</script> world
`
            const result = await parse(raw, 'test-key')
            expect(result.textAsHtml).not.toContain('<script>')
        })
    })

    describe('HTML emails', () => {
        it('sanitizes HTML content', async () => {
            const rawHtml = `From: sender@example.com
To: recipient@example.com
Subject: Test
Content-Type: text/html

<p>Hello</p><script>alert('xss')</script>
`
            const result = await parse(rawHtml, 'test-key')
            expect(result.html).not.toContain('<script>')
        })
    })

    describe('inline attachments', () => {
        const RAW_EMAIL_WITH_INLINE_IMAGE = `MIME-Version: 1.0
From: sender@example.com
To: recipient@example.com
Subject: Inline image test
Content-Type: multipart/related; boundary="==sep=="

--==sep==
Content-Type: text/html; charset=utf-8

<p>Image: <img src="cid:img001@test.example"><script>xss</script></p>
--==sep==
Content-Type: image/png
Content-ID: <img001@test.example>
Content-Transfer-Encoding: base64

iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==
--==sep==--
`

        it('replaces cid: references with data URIs', async () => {
            const result = await parse(RAW_EMAIL_WITH_INLINE_IMAGE, 'test-key')
            expect(result.html).not.toContain('cid:img001@test.example')
            expect(result.html).toContain('data:image/png;base64,')
        })

        it('sanitizes HTML after cid: substitution', async () => {
            const result = await parse(RAW_EMAIL_WITH_INLINE_IMAGE, 'test-key')
            expect(result.html).not.toContain('<script>')
        })

        it('correctly base64-encodes binary (non-base64) attachments', async () => {
            // Uses 8bit CTE so the attachment goes through the Uint8Array → btoa path
            const RAW_EMAIL_BINARY_ATTACHMENT = [
                'MIME-Version: 1.0',
                'From: sender@example.com',
                'To: recipient@example.com',
                'Subject: Binary attachment test',
                'Content-Type: multipart/related; boundary="==sep=="',
                '',
                '--==sep==',
                'Content-Type: text/html; charset=utf-8',
                '',
                '<p>Image: <img src="cid:bin001@test.example"></p>',
                '--==sep==',
                'Content-Type: image/png',
                'Content-ID: <bin001@test.example>',
                'Content-Transfer-Encoding: 8bit',
                '',
                '\x89PNG\r\n',
                '--==sep==--',
            ].join('\r\n')

            const result = await parse(RAW_EMAIL_BINARY_ATTACHMENT, 'test-key')
            expect(result.html).not.toContain('cid:bin001@test.example')
            expect(result.html).toContain('data:image/png;base64,')
        })
    })

    describe('textAsHtml', () => {
        it('escapes angle brackets in plain text when converting to HTML', async () => {
            const result = await parse(RAW_EMAIL_WITH_ANGLE_BRACKET_ADDRESS, 'test-key')
            expect(result.textAsHtml).toContain('&lt;user@example.com&gt;')
        })
    })

    describe('processedHtml', () => {
        it('is populated at parse time from textAsHtml for plain-text emails', async () => {
            const result = await parse(RAW_EMAIL_WITH_ANGLE_BRACKET_ADDRESS, 'test-key')
            expect(typeof result.processedHtml).toBe('string')
            expect(result.processedHtml.length).toBeGreaterThan(0)
        })

        it('wraps blockquotes at parse time for emails with quoted content', async () => {
            const raw = `From: a@b.com
Subject: Re
Content-Type: text/plain

New reply

> Original line
`
            const result = await parse(raw, 'key')
            expect(result.processedHtml).toContain('<details')
        })

        it('is populated from html for HTML emails', async () => {
            const raw = `From: a@b.com
Subject: Html
Content-Type: text/html

<p>Hello</p><blockquote><p>Quoted</p></blockquote>
`
            const result = await parse(raw, 'key')
            expect(result.processedHtml).toContain('<details')
            expect(result.processedHtml).toContain('Hello')
        })
    })
})

describe('isInlineAttachment', () => {
    const att = (extra: Partial<Attachment> = {}): Attachment => ({
        content: '',
        mimeType: 'image/png',
        filename: null,
        disposition: 'attachment',
        ...extra,
    })

    it('returns false when attachment has no contentId', () => {
        expect(isInlineAttachment(att(), '<img src="cid:foo">')).toBe(false)
    })

    it('returns false when html is undefined', () => {
        expect(isInlineAttachment(att({ contentId: '<foo@x>' }), undefined)).toBe(false)
    })

    it('returns false when contentId is not referenced in html', () => {
        expect(isInlineAttachment(att({ contentId: '<foo@x>' }), '<img src="cid:bar@x">')).toBe(
            false
        )
    })

    it('returns true when contentId (without angle brackets) appears as cid: in html', () => {
        expect(isInlineAttachment(att({ contentId: '<foo@x>' }), '<img src="cid:foo@x">')).toBe(
            true
        )
    })

    it('returns true when contentId has no angle brackets and matches cid: reference', () => {
        expect(isInlineAttachment(att({ contentId: 'foo@x' }), '<img src="cid:foo@x">')).toBe(true)
    })

    it('returns true when disposition is inline even if cid: has been replaced in HTML', () => {
        // The parser replaces cid: with data URIs before EmailItem sees the HTML,
        // so we rely on disposition:'inline' as the signal
        expect(
            isInlineAttachment(
                att({ contentId: '<foo@x>', disposition: 'inline' }),
                '<img src="data:image/png;base64,abc123">'
            )
        ).toBe(true)
    })

    it('returns false when disposition is attachment even if contentId is set', () => {
        expect(
            isInlineAttachment(att({ contentId: '<foo@x>', disposition: 'attachment' }), undefined)
        ).toBe(false)
    })
})

describe('textAsHtml quote handling', () => {
    it('converts >-prefixed lines to a blockquote element', async () => {
        const raw = `From: a@b.com
Subject: Re
Content-Type: text/plain

New reply

> Original line
`
        const result = await parse(raw, 'key')
        expect(result.textAsHtml).toContain('<blockquote>')
        expect(result.textAsHtml).toContain('Original line')
        expect(result.textAsHtml).toContain('New reply')
    })

    it('handles nested >> quote markers as nested blockquotes', async () => {
        const raw = `From: a@b.com
Subject: Re
Content-Type: text/plain

Top reply

> First level
>> Second level
`
        const result = await parse(raw, 'key')
        // The outer blockquote wraps first-level content which itself contains a nested blockquote
        expect((result.textAsHtml.match(/<blockquote/g) ?? []).length).toBeGreaterThanOrEqual(2)
        expect(result.textAsHtml).toContain('First level')
        expect(result.textAsHtml).toContain('Second level')
    })

    it('collapses content after an attribution line into a blockquote', async () => {
        const raw = `From: a@b.com
Subject: Re
Content-Type: text/plain

Yeah, what?

On Monday, Apr 1 2003, foobar wrote:

Oy!
`
        const result = await parse(raw, 'key')
        expect(result.textAsHtml).toContain('<blockquote>')
        expect(result.textAsHtml).toContain('Yeah, what?')
        expect(result.textAsHtml).toContain('Oy!')
        // The reply should appear before the blockquote
        const replyPos = result.textAsHtml.indexOf('Yeah, what?')
        const quotePos = result.textAsHtml.indexOf('<blockquote>')
        expect(replyPos).toBeLessThan(quotePos)
    })

    it('produces no blockquote when there are no quotes or attribution lines', async () => {
        const raw = `From: a@b.com
Subject: Hi
Content-Type: text/plain

Just a plain message.
`
        const result = await parse(raw, 'key')
        expect(result.textAsHtml).not.toContain('<blockquote>')
    })
})

describe('extractMeta threading headers', () => {
    it('populates messageId, inReplyTo, and references when headers are present', async () => {
        const raw = `From: sender@example.com
To: recipient@example.com
Subject: Reply
Message-ID: <reply@example.com>
In-Reply-To: <original@example.com>
References: <original@example.com> <other@example.com>
Content-Type: text/plain

Hello
`
        const parsed = await parse(raw, 'test-key')
        const meta = extractMeta(parsed)
        expect(meta.messageId).toBe('<reply@example.com>')
        expect(meta.inReplyTo).toBe('<original@example.com>')
        expect(meta.references).toEqual(['<original@example.com>', '<other@example.com>'])
    })

    it('leaves messageId, inReplyTo, and references undefined when headers are absent', async () => {
        const raw = `From: sender@example.com
To: recipient@example.com
Subject: No threading headers
Content-Type: text/plain

Hello
`
        const parsed = await parse(raw, 'test-key')
        const meta = extractMeta(parsed)
        expect(meta.messageId).toBeUndefined()
        expect(meta.inReplyTo).toBeUndefined()
        expect(meta.references).toBeUndefined()
    })
})

describe('applyFormattedDate', () => {
    it('sets formattedDate to toLocaleString() of email.date when present', async () => {
        const raw = `From: sender@example.com
To: recipient@example.com
Subject: Test
Date: Mon, 01 Jan 2024 12:00:00 +0000
Content-Type: text/plain

Hello
`
        const parsed = await parse(raw, 'test-key')
        const meta = applyFormattedDate(extractMeta(parsed))
        expect(meta.formattedDate).toBe(new Date(parsed.date!).toLocaleString())
    })

    it('sets formattedDate to empty string when date is absent', async () => {
        const raw = `From: sender@example.com
To: recipient@example.com
Subject: No date
Content-Type: text/plain

Hello
`
        const parsed = await parse(raw, 'test-key')
        const meta = applyFormattedDate(extractMeta(parsed))
        expect(meta.formattedDate).toBe('')
    })
})

describe('attachmentToBase64', () => {
    it('returns content directly when encoding is base64 and content is a string', () => {
        const att: Attachment = {
            content: 'aGVsbG8=',
            mimeType: 'text/plain',
            filename: null,
            disposition: 'attachment',
            encoding: 'base64',
        }
        expect(attachmentToBase64(att)).toBe('aGVsbG8=')
    })

    it('throws when encoding is base64 but content is not a string', () => {
        const att: Attachment = {
            content: new Uint8Array([104, 101, 108, 108, 111]),
            mimeType: 'text/plain',
            filename: null,
            disposition: 'attachment',
            encoding: 'base64',
        }
        expect(() => attachmentToBase64(att)).toThrow(
            'Base64-encoded attachment content must be a string'
        )
    })

    it('encodes a utf8 string to base64 when encoding is not base64', () => {
        const att: Attachment = {
            content: 'hello',
            mimeType: 'text/plain',
            filename: null,
            disposition: 'attachment',
            encoding: undefined,
        }
        const result = attachmentToBase64(att)
        expect(atob(result)).toBe('hello')
    })

    it('encodes binary Uint8Array content to base64', () => {
        const att: Attachment = {
            content: new Uint8Array([104, 101, 108, 108, 111]),
            mimeType: 'application/octet-stream',
            filename: null,
            disposition: 'attachment',
            encoding: undefined,
        }
        const result = attachmentToBase64(att)
        expect(atob(result)).toBe('hello')
    })
})
