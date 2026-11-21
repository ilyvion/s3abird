// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { buildEmailFrameDocument, buildFrameCsp, hasRemoteContent } from './emailFrame'

function parseFrame(html: string): Document {
    return new DOMParser().parseFromString(html, 'text/html')
}

function cspOf(doc: Document): string {
    return (
        doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ??
        ''
    )
}

function directive(csp: string, name: string): string {
    return csp
        .split(';')
        .map((d) => d.trim())
        .find((d) => d.startsWith(name + ' '))!
}

describe('buildFrameCsp', () => {
    it('blocks remote images, fonts, media and styles by default', () => {
        const csp = buildFrameCsp(false)
        for (const name of ['img-src', 'font-src', 'media-src', 'style-src']) {
            expect(directive(csp, name)).not.toContain('https:')
        }
        expect(directive(csp, 'img-src')).toBe('img-src data:')
    })

    it('allows https remote content once the reader opts in', () => {
        const csp = buildFrameCsp(true)
        for (const name of ['img-src', 'font-src', 'media-src', 'style-src']) {
            expect(directive(csp, name)).toContain('https:')
        }
    })

    it('forbids form submission and everything not listed', () => {
        for (const allow of [false, true]) {
            const csp = buildFrameCsp(allow)
            expect(directive(csp, 'form-action')).toBe("form-action 'none'")
            expect(directive(csp, 'default-src')).toBe("default-src 'none'")
            expect(csp).not.toContain('script-src')
        }
    })
})

describe('buildEmailFrameDocument', () => {
    it('places the CSP meta tag in the head before the body', () => {
        const html = buildEmailFrameDocument('<p>hi</p>', {
            allowRemoteContent: false,
            plainText: false,
        })
        expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<body>'))
        const doc = parseFrame(html)
        expect(cspOf(doc)).toBe(buildFrameCsp(false))
        expect(doc.body.innerHTML).toBe('<p>hi</p>')
    })

    it('uses the remote-content CSP when allowed', () => {
        const doc = parseFrame(
            buildEmailFrameDocument('', { allowRemoteContent: true, plainText: false })
        )
        expect(cspOf(doc)).toBe(buildFrameCsp(true))
    })

    it('opens links in a new tab', () => {
        const doc = parseFrame(
            buildEmailFrameDocument('', { allowRemoteContent: false, plainText: true })
        )
        expect(doc.querySelector('base')?.getAttribute('target')).toBe('_blank')
    })

    it('gives HTML mail a white background and plain-text mail a transparent one', () => {
        const html = parseFrame(
            buildEmailFrameDocument('', { allowRemoteContent: false, plainText: false })
        ).querySelector('style')!.textContent
        const text = parseFrame(
            buildEmailFrameDocument('', { allowRemoteContent: false, plainText: true })
        ).querySelector('style')!.textContent
        expect(html).toContain('background: #fff')
        expect(text).toContain('background: transparent')
    })
})

describe('hasRemoteContent', () => {
    it.each([
        '<img src="https://tracker.example/p.gif">',
        "<img src='http://tracker.example/p.gif'>",
        '<img src=//tracker.example/p.gif>',
        '<img srcset="https://a.example/x.png 2x">',
        '<td background="https://a.example/bg.png">',
        '<div style="background:url(https://a.example/x)">',
        '<style>.a{background:url("//a.example/x")}</style>',
        '<style>@import "https://a.example/x.css";</style>',
    ])('detects %s', (html) => {
        expect(hasRemoteContent(html)).toBe(true)
    })

    it.each([
        '<p>hello</p>',
        '<a href="https://example.com">link</a>',
        '<img src="data:image/png;base64,AAAA">',
        '<p>see https://example.com</p>',
    ])('ignores %s', (html) => {
        expect(hasRemoteContent(html)).toBe(false)
    })
})
