// Wraps outermost quote containers in a <details>/<summary> toggle so that
// quoted/repeated email content is collapsed by default, matching Gmail's behaviour.
//
// Two detection strategies are combined:
//   1. Standard <blockquote> elements — universally used for semantic quoting.
//   2. Attribution-text detection — any block element whose first non-whitespace text
//      matches "On … wrote:" is treated as a quote container, regardless of its CSS
//      class or element type.  This covers vendor-specific wrappers (Gmail's
//      div.gmail_quote, Outreach's div.outreach-quote, etc.) without needing an
//      explicit allowlist.  It is inherently heuristic: edge cases exist where
//      legitimate email body text could start with that pattern.
//
// The two result sets are merged and deduplicated to outermost elements before wrapping,
// so a blockquote nested inside a detected container is never double-wrapped.

const ATTRIBUTION_RE = /^On .+ wrote:/

// DFS to return the first non-whitespace text-node content within an element.
function firstTextContent(el: Element): string {
    for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            const t = child.textContent?.trim() ?? ''
            if (t) return t
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            const r = firstTextContent(child as Element)
            if (r) return r
        }
    }
    return ''
}

export function collapseBlockquotes(html: string): string {
    if (!html) return html

    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')

    // Strategy 1: standard <blockquote> elements.
    const blockquotes = Array.from(doc.querySelectorAll('blockquote'))

    // Strategy 2: block elements whose first text is an attribution line.
    // We require the element to contain more than just the attribution line itself
    // so that a bare <p> or <div> holding only "On … wrote:" isn't wrapped on its own.
    const attributionWrappers = Array.from(doc.querySelectorAll('div, section, article')).filter(
        (el) => {
            const first = firstTextContent(el)
            if (!ATTRIBUTION_RE.test(first)) return false
            const total = (el.textContent ?? '').trim()
            return total.length > first.length + 20
        }
    )

    // Merge and keep only outermost elements so that nested candidates aren't
    // double-wrapped (e.g. blockquote.gmail_quote inside div.gmail_quote).
    const candidates = [...blockquotes, ...attributionWrappers]
    const outermost = candidates.filter(
        (el) => !candidates.some((other) => other !== el && other.contains(el))
    )

    for (const el of outermost) {
        const details = doc.createElement('details')
        details.className = 'mt-2'
        const summary = doc.createElement('summary')
        summary.className =
            'my-1 cursor-pointer list-none text-sm text-neutral-400 hover:text-neutral-600'
        summary.textContent = '··· Show quoted text'
        details.appendChild(summary)
        el.parentNode!.insertBefore(details, el)
        details.appendChild(el)
    }

    return doc.body.innerHTML
}
