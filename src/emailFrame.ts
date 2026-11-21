// Builds the standalone document rendered inside the sandboxed email-body iframe.
// The frame's own CSP blocks remote loads (tracking pixels, CSS url() fetches,
// web fonts) unless the reader opts in, and forbids form submission.

export interface EmailFrameOptions {
    allowRemoteContent: boolean
    plainText: boolean
}

/** CSS custom property the parent sets on the frame's root to pass the app's text color. */
export const FRAME_TEXT_COLOR_VAR = '--s3a-text-color'

const REMOTE_CONTENT_RE =
    /(?:\b(?:src|srcset|background|poster)\s*=\s*["']?\s*(?:https?:)?\/\/)|(?:url\(\s*["']?\s*(?:https?:)?\/\/)|(?:@import\b)/i

export function hasRemoteContent(html: string): boolean {
    return REMOTE_CONTENT_RE.test(html)
}

export function buildFrameCsp(allowRemoteContent: boolean): string {
    const remote = allowRemoteContent ? ' https:' : ''
    return [
        "default-src 'none'",
        "style-src 'unsafe-inline'" + remote,
        'img-src data:' + remote,
        'font-src data:' + remote,
        'media-src data:' + remote,
        "form-action 'none'",
    ].join('; ')
}

const QUOTE_TOGGLE_STYLE = `
details > summary { cursor: pointer; list-style: none; font-size: 0.875em; opacity: 0.6; margin: 0.25em 0; }
details > summary::-webkit-details-marker { display: none; }
details > summary:hover { opacity: 0.85; }
`

const PLAIN_TEXT_STYLE = `
html { background: transparent; color: var(${FRAME_TEXT_COLOR_VAR}, #000); }
body { margin: 0; font: 1rem/1.75 system-ui, sans-serif; overflow-wrap: anywhere; }
p { margin: 0 0 1.25em; }
a { color: inherit; text-decoration: underline; }
blockquote { margin: 0 0 1.25em; padding-left: 1em; border-left: 0.25em solid currentColor; opacity: 0.75; }
`

const HTML_MAIL_STYLE = `
html { background: #fff; color: #000; color-scheme: light; }
`

export function buildEmailFrameDocument(body: string, options: EmailFrameOptions): string {
    const style = (options.plainText ? PLAIN_TEXT_STYLE : HTML_MAIL_STYLE) + QUOTE_TOGGLE_STYLE
    return (
        '<!doctype html><html><head>' +
        `<meta http-equiv="Content-Security-Policy" content="${buildFrameCsp(options.allowRemoteContent)}">` +
        '<meta charset="utf-8">' +
        '<base target="_blank">' +
        `<style>${style}</style>` +
        `</head><body>${body}</body></html>`
    )
}
