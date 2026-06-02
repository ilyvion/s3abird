// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import parse, { extractMeta, applyFormattedDate, isInlineAttachment } from './parser'

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
})

describe('isInlineAttachment', () => {
    const att = (extra: object = {}) =>
        ({
            content: '',
            mimeType: 'image/png',
            filename: null,
            disposition: 'attachment',
            ...extra,
        }) as unknown as Parameters<typeof isInlineAttachment>[0]

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
