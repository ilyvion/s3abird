import { describe, it, expect } from 'vitest'
import nginxConfig from '../nginx/default.conf?raw'

interface Location {
    modifier: string
    pattern: string
    body: string
}

function parseLocations(config: string): Location[] {
    const locations: Location[] = []
    for (const match of config.matchAll(/location\s+(?:(~\*?|=|\^~)\s+)?(\S+)\s*\{([^}]*)\}/g)) {
        locations.push({ modifier: match[1] ?? '', pattern: match[2], body: match[3] })
    }
    return locations
}

const locations = parseLocations(nginxConfig)
const assetLocation = locations.find((l) => l.modifier.startsWith('~'))
const spaLocation = locations.find((l) => l.modifier === '' && l.pattern === '/')

function assetRegex(): RegExp {
    if (!assetLocation) throw new Error('no regex location in nginx/default.conf')
    return new RegExp(assetLocation.pattern, assetLocation.modifier === '~*' ? 'i' : '')
}

// The extensions the server's Caddy `cache_static` snippet gives a year-long Cache-Control.
const caddyCachedExtensions = ['css', 'js', 'png', 'jpg', 'jpeg', 'svg', 'ico', 'woff2']

describe('nginx static file handling', () => {
    it('returns 404 for missing static files instead of the SPA fallback', () => {
        expect(assetLocation?.body).toMatch(/try_files\s+\$uri\s+=404;/)
        expect(assetLocation?.body).not.toContain('index.html')
    })

    it('matches every extension Caddy caches for a year', () => {
        const regex = assetRegex()
        for (const ext of caddyCachedExtensions) {
            expect(regex.test(`/does-not-exist.${ext}`), ext).toBe(true)
            expect(regex.test(`/assets/index-AbC123.${ext.toUpperCase()}`), ext).toBe(true)
        }
        expect(regex.test('/favicon.ico')).toBe(true)
    })

    it('leaves client routes with dotted ids to the SPA fallback', () => {
        const regex = assetRegex()
        expect(regex.test('/inbox/0102018f.abcdef-1234')).toBe(false)
        expect(regex.test('/inbox/thread/msg.id@example.com')).toBe(false)
        expect(regex.test('/inbox')).toBe(false)
        expect(spaLocation?.body).toMatch(/try_files\s+\$uri\s+\$uri\/\s+\/index\.html;/)
    })

    it('inherits the server headers in every location', () => {
        // A location with its own add_header drops the server-level Content-Security-Policy.
        expect(locations.length).toBeGreaterThan(0)
        for (const location of locations) {
            expect(location.body, location.pattern).not.toContain('add_header')
        }
    })

    it('sends Cache-Control: no-cache on 404 responses only', () => {
        const map = nginxConfig.match(/map\s+\$status\s+\$(\w+)\s*\{([^}]*)\}/)
        expect(map).not.toBeNull()
        const [, variable, body] = map!
        expect(body).toMatch(/^\s*404\s+"no-cache";/m)
        expect(body).toMatch(/^\s*default\s+"";/m)
        expect(nginxConfig).toMatch(
            new RegExp(`add_header\\s+Cache-Control\\s+\\$${variable}\\s+always;`)
        )
    })
})
