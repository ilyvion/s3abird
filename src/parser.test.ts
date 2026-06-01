// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import parse from './parser'

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

    describe('textAsHtml', () => {
        it('escapes angle brackets in plain text when converting to HTML', async () => {
            const result = await parse(RAW_EMAIL_WITH_ANGLE_BRACKET_ADDRESS, 'test-key')
            expect(result.textAsHtml).toContain('&lt;user@example.com&gt;')
        })
    })
})
