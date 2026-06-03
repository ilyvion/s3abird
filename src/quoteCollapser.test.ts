// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { collapseBlockquotes } from './quoteCollapser'

describe('collapseBlockquotes', () => {
    it('returns empty string unchanged', () => {
        expect(collapseBlockquotes('')).toBe('')
    })

    it('returns HTML with no blockquotes unchanged', () => {
        const html = '<p>Just some text</p>'
        expect(collapseBlockquotes(html)).not.toContain('<details')
        expect(collapseBlockquotes(html)).toContain('Just some text')
    })

    it('wraps a top-level blockquote in a details/summary toggle', () => {
        const result = collapseBlockquotes('<p>New</p><blockquote><p>Old</p></blockquote>')
        expect(result).toContain('<details')
        expect(result).toContain('<summary')
        expect(result).toContain('Show quoted text')
        expect(result).toContain('Old')
    })

    it('places the blockquote inside the details element', () => {
        const result = collapseBlockquotes('<blockquote><p>Quoted</p></blockquote>')
        expect(result).toMatch(/<details[^>]*>[\s\S]*<blockquote/)
    })

    it('wraps multiple sibling blockquotes in separate details elements', () => {
        const html =
            '<p>A</p><blockquote><p>Q1</p></blockquote><p>B</p><blockquote><p>Q2</p></blockquote>'
        const result = collapseBlockquotes(html)
        expect((result.match(/<details/g) ?? []).length).toBe(2)
    })

    it('only wraps the outermost blockquote when they are nested', () => {
        const html = '<blockquote><blockquote><p>Deep</p></blockquote></blockquote>'
        const result = collapseBlockquotes(html)
        expect((result.match(/<details/g) ?? []).length).toBe(1)
    })

    it('wraps a div whose first text is an attribution line (e.g. Gmail-style)', () => {
        const html =
            '<p>New</p><div><div>On Mon, Jan 1 2024, Alice wrote:</div><blockquote><p>Old</p></blockquote></div>'
        const result = collapseBlockquotes(html)
        expect((result.match(/<details/g) ?? []).length).toBe(1)
        expect(result).toContain('Old')
    })

    it('does not double-wrap a blockquote nested inside an attribution-detected container', () => {
        const html =
            '<div><div>On Mon, Jan 1 2024, Alice wrote:</div><blockquote><p>Quoted</p></blockquote></div>'
        const result = collapseBlockquotes(html)
        expect((result.match(/<details/g) ?? []).length).toBe(1)
    })

    it('wraps a div that starts directly with an attribution line followed by content', () => {
        const html =
            '<p>Reply</p><div>On Mon, Nov 13 2023, Michael Waspi wrote:<p>Original message body</p></div>'
        const result = collapseBlockquotes(html)
        expect((result.match(/<details/g) ?? []).length).toBe(1)
        expect(result).toContain('Original message body')
    })

    it('does not wrap a small div that contains only an attribution line', () => {
        const html =
            '<div>On Mon, Jan 1 2024, Alice wrote:</div><blockquote><p>Quoted</p></blockquote>'
        const result = collapseBlockquotes(html)
        // Only the blockquote should be wrapped, not the bare attribution div
        expect((result.match(/<details/g) ?? []).length).toBe(1)
    })
})
