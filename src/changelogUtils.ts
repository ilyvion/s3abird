const UNRELEASED_HEADER = /^## \[Unreleased\]/m
const NEXT_SECTION = /^## /m

export function stripEmptyUnreleased(markdown: string): string {
    const headerMatch = UNRELEASED_HEADER.exec(markdown)
    if (!headerMatch) return markdown

    const afterHeader = markdown.slice(headerMatch.index + headerMatch[0].length)
    const nextMatch = NEXT_SECTION.exec(afterHeader)
    const sectionBody = nextMatch ? afterHeader.slice(0, nextMatch.index) : afterHeader

    const hasItems = /^- /m.test(sectionBody)
    if (hasItems) return markdown

    const tail = nextMatch ? afterHeader.slice(nextMatch.index) : ''
    return markdown.slice(0, headerMatch.index) + tail
}
