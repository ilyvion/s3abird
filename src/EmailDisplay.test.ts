// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmailDisplay from './EmailDisplay.vue'
import type { ParsedEmail } from './parser.js'

function makeEmail(overrides: Partial<ParsedEmail> = {}): ParsedEmail {
    return {
        subject: 'Test subject',
        textAsHtml: '<p>body</p>',
        key: 'test-key',
        attachments: [],
        headers: [],
        ...overrides,
    } as ParsedEmail
}

const stubs = { EmailAddress: true }

describe('EmailDisplay', () => {
    it('renders the email body HTML', () => {
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail({ textAsHtml: '<p>hello world</p>' }) },
            global: { stubs },
        })
        expect(wrapper.html()).toContain('hello world')
    })

    it('sorts headers alphabetically without mutating the stored array', () => {
        const originalHeaders = [
            { key: 'subject', originalKey: 'Subject', value: 'Hello' },
            { key: 'date', originalKey: 'Date', value: '2024-01-01' },
            { key: 'from', originalKey: 'From', value: 'a@b.com' },
        ]
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail({ headers: [...originalHeaders] }) },
            global: { stubs },
        })
        const renderedKeys = wrapper.findAll('dt').map((dt) => dt.text().replace(':', ''))
        expect(renderedKeys).toEqual(['date', 'from', 'subject'])
        expect(originalHeaders.map((h) => h.key)).toEqual(['subject', 'date', 'from'])
    })

    it('renders the attachments section when non-inline attachments are present', () => {
        const att = {
            content: 'aGVsbG8=',
            mimeType: 'application/pdf',
            filename: 'doc.pdf',
            disposition: 'attachment' as const,
            encoding: 'base64' as const,
        }
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail({ attachments: [att] }) },
            global: { stubs },
        })
        expect(wrapper.text()).toContain('Attachments')
        expect(wrapper.text()).toContain('doc.pdf')
        expect(wrapper.text()).toContain('application/pdf')
    })

    it('falls back to attachment-N filename when filename is absent', () => {
        const att = {
            content: 'aGVsbG8=',
            mimeType: 'application/pdf',
            filename: null,
            disposition: 'attachment' as const,
            encoding: 'base64' as const,
        }
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail({ attachments: [att] }) },
            global: { stubs },
        })
        expect(wrapper.text()).toContain('attachment-1')
    })

    it('hides the attachments section when all attachments are inline', () => {
        const att = {
            content: 'aGVsbG8=',
            mimeType: 'image/png',
            filename: null,
            disposition: 'inline' as const,
            encoding: 'base64' as const,
            contentId: '<img@test>',
        }
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail({ attachments: [att], html: '<img src="cid:img@test">' }) },
            global: { stubs },
        })
        expect(wrapper.text()).not.toContain('Attachments')
    })

    it('hides the attachments section when there are no attachments', () => {
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail({ attachments: [] }) },
            global: { stubs },
        })
        expect(wrapper.text()).not.toContain('Attachments')
    })
})
