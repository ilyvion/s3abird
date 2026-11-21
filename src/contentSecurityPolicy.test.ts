import { describe, it, expect } from 'vitest'
import nginxConfig from '../nginx/default.conf?raw'
import { buildFrameCsp } from './emailFrame'

type Policy = Map<string, string[]>

function parsePolicy(csp: string): Policy {
    const policy: Policy = new Map()
    for (const part of csp.split(';')) {
        const [name, ...sources] = part.trim().split(/\s+/)
        if (name) policy.set(name, sources)
    }
    return policy
}

function headerValue(name: string): string | undefined {
    const match = nginxConfig.match(new RegExp(`add_header\\s+${name}\\s+"([^"]*)"\\s+always;`))
    return match?.[1]
}

const pagePolicy = parsePolicy(headerValue('Content-Security-Policy') ?? '')

function effectiveSources(policy: Policy, directive: string): string[] {
    return policy.get(directive) ?? policy.get('default-src') ?? []
}

function allowsUrl(policy: Policy, directive: string, url: string): boolean {
    const { protocol, host } = new URL(url)
    return effectiveSources(policy, directive).some(
        (source) => source === protocol || source === `${protocol}//${host}`
    )
}

describe('nginx Content-Security-Policy', () => {
    it('is sent as an enforcing header on every response', () => {
        expect(headerValue('Content-Security-Policy')).toBeDefined()
        expect(nginxConfig).not.toContain('Content-Security-Policy-Report-Only')
    })

    it('only runs scripts served by the app itself', () => {
        expect(pagePolicy.get('default-src')).toEqual(["'none'"])
        expect(pagePolicy.get('script-src')).toEqual(["'self'"])
    })

    it('blocks form submission, framing and base URL changes', () => {
        expect(pagePolicy.get('form-action')).toEqual(["'none'"])
        expect(pagePolicy.get('frame-ancestors')).toEqual(["'none'"])
        expect(pagePolicy.get('base-uri')).toEqual(["'self'"])
    })

    it('only connects to AWS', () => {
        expect(pagePolicy.get('connect-src')).toEqual(['https://*.amazonaws.com'])
    })

    it('allows the Font Awesome stylesheet and fonts', () => {
        const base = 'https://use.fontawesome.com/releases/v5.15.4'
        expect(allowsUrl(pagePolicy, 'style-src', `${base}/css/all.css`)).toBe(true)
        expect(allowsUrl(pagePolicy, 'font-src', `${base}/webfonts/fa-solid-900.woff2`)).toBe(true)
    })

    it('allows everything the email frame allows once remote images are loaded', () => {
        const framePolicy = parsePolicy(buildFrameCsp(true))
        for (const [directive, sources] of framePolicy) {
            for (const source of sources.filter((s) => s !== "'none'")) {
                expect(effectiveSources(pagePolicy, directive), `${directive} ${source}`).toContain(
                    source
                )
            }
        }
    })
})
