// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EmailDisplay from './EmailDisplay.vue'
import type { ParsedEmail } from './parser.js'
import { FRAME_TEXT_COLOR_VAR, buildFrameCsp } from './emailFrame.js'
import { useThemeStore } from './stores/theme.js'

beforeEach(() => {
    setActivePinia(createPinia())
})

function frameDocOf(wrapper: ReturnType<typeof mount>): Document {
    const srcdoc = wrapper.find('iframe').attributes('srcdoc') ?? ''
    return new DOMParser().parseFromString(srcdoc, 'text/html')
}

function frameCspOf(wrapper: ReturnType<typeof mount>): string | null | undefined {
    return frameDocOf(wrapper)
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        ?.getAttribute('content')
}

function makeEmail(overrides: Partial<ParsedEmail> = {}): ParsedEmail {
    const base = {
        subject: 'Test subject',
        textAsHtml: '<p>body</p>',
        processedHtml: '<p>body</p>',
        key: 'test-key',
        attachments: [],
        headers: [],
    }
    const merged = { ...base, ...overrides }
    if (!overrides.processedHtml && overrides.textAsHtml) {
        merged.processedHtml = overrides.textAsHtml
    }
    return merged as ParsedEmail
}

const stubs = { EmailAddress: true }

describe('EmailDisplay', () => {
    it('renders the email body inside the frame document', () => {
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail({ textAsHtml: '<p>hello world</p>' }) },
            global: { stubs },
        })
        expect(frameDocOf(wrapper).body.innerHTML).toBe('<p>hello world</p>')
    })

    it('renders the body in a sandboxed frame that cannot run scripts or submit forms', () => {
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail() },
            global: { stubs },
        })
        const tokens = (wrapper.find('iframe').attributes('sandbox') ?? '').split(/\s+/).sort()
        expect(tokens).toEqual([
            'allow-popups',
            'allow-popups-to-escape-sandbox',
            'allow-same-origin',
        ])
    })

    it('keeps email markup out of the app document', () => {
        const html =
            '<style>body{display:none}</style><div class="fixed-overlay" style="position:fixed">x</div>'
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail({ html, processedHtml: html }) },
            global: { stubs },
        })
        expect(wrapper.element.querySelector('style')).toBeNull()
        expect(wrapper.element.querySelector('.fixed-overlay')).toBeNull()
        expect(frameDocOf(wrapper).querySelector('.fixed-overlay')).not.toBeNull()
    })

    it('blocks remote images until the reader loads them', async () => {
        const html = '<img src="https://tracker.example/p.gif">'
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail({ html, processedHtml: html }) },
            global: { stubs },
        })
        expect(frameCspOf(wrapper)).toBe(buildFrameCsp(false))

        const button = wrapper.findAll('button').find((b) => b.text() === 'Load remote images')!
        await button.trigger('click')

        expect(frameCspOf(wrapper)).toBe(buildFrameCsp(true))
        expect(wrapper.text()).not.toContain('Load remote images')
    })

    it('blocks remote images again when a different email is shown', async () => {
        const html = '<img src="https://tracker.example/p.gif">'
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail({ html, processedHtml: html }) },
            global: { stubs },
        })
        const button = wrapper.findAll('button').find((b) => b.text() === 'Load remote images')!
        await button.trigger('click')
        await wrapper.setProps({ email: makeEmail({ key: 'other', html, processedHtml: html }) })

        expect(frameCspOf(wrapper)).toBe(buildFrameCsp(false))
    })

    it('does not offer to load remote images when there are none', () => {
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail() },
            global: { stubs },
        })
        expect(wrapper.text()).not.toContain('Load remote images')
        expect(frameCspOf(wrapper)).toBe(buildFrameCsp(false))
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

    it('triggers a download when the Download button is clicked', async () => {
        const createObjectURL = vi.fn().mockReturnValue('blob:test-url')
        const revokeObjectURL = vi.fn()
        URL.createObjectURL = createObjectURL
        URL.revokeObjectURL = revokeObjectURL

        const clickSpy = vi.fn()
        const createElement = document.createElement.bind(document)
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            const el = createElement(tag)
            if (tag === 'a') {
                Object.defineProperty(el, 'click', { value: clickSpy, writable: true })
            }
            return el
        })

        const att = {
            content: btoa('hello'),
            mimeType: 'application/pdf',
            filename: 'file.pdf',
            disposition: 'attachment' as const,
            encoding: 'base64' as const,
        }
        const wrapper = mount(EmailDisplay, {
            props: { email: makeEmail({ attachments: [att] }) },
            global: { stubs },
        })

        await wrapper.find('button').trigger('click')

        expect(createObjectURL).toHaveBeenCalled()
        expect(clickSpy).toHaveBeenCalled()
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url')

        vi.restoreAllMocks()
    })
})

describe('EmailDisplay frame theming', () => {
    async function mountInColoredContainer(email: ParsedEmail) {
        const container = document.createElement('div')
        container.style.color = 'rgb(1, 2, 3)'
        document.body.appendChild(container)
        const wrapper = mount(EmailDisplay, {
            props: { email },
            global: { stubs },
            attachTo: container,
        })
        const iframe = wrapper.find('iframe').element as HTMLIFrameElement
        await new Promise<void>((resolve) => iframe.addEventListener('load', () => resolve()))
        return { wrapper, container, iframe }
    }

    it('passes the app text color into a plain-text frame', async () => {
        const { wrapper, container, iframe } = await mountInColoredContainer(makeEmail())
        expect(
            iframe.contentDocument!.documentElement.style.getPropertyValue(FRAME_TEXT_COLOR_VAR)
        ).toBe('rgb(1, 2, 3)')
        wrapper.unmount()
        container.remove()
    })

    it('updates the frame text color when the theme changes', async () => {
        const { wrapper, container, iframe } = await mountInColoredContainer(makeEmail())
        container.style.color = 'rgb(4, 5, 6)'
        useThemeStore().updateTheme(useThemeStore().effectiveTheme === 'dark' ? 'light' : 'dark')
        await flushPromises()
        expect(
            iframe.contentDocument!.documentElement.style.getPropertyValue(FRAME_TEXT_COLOR_VAR)
        ).toBe('rgb(4, 5, 6)')
        wrapper.unmount()
        container.remove()
    })

    it('does not apply the app text color to HTML mail', async () => {
        const html = '<p>newsletter</p>'
        const { wrapper, container, iframe } = await mountInColoredContainer(
            makeEmail({ html, processedHtml: html })
        )
        expect(
            iframe.contentDocument!.documentElement.style.getPropertyValue(FRAME_TEXT_COLOR_VAR)
        ).toBe('')
        wrapper.unmount()
        container.remove()
    })
})

describe('EmailDisplay CC rendering', () => {
    it('renders a comma separator between multiple CC addresses', () => {
        const email = makeEmail({
            cc: [
                { name: 'Alice', address: 'alice@example.com' },
                { name: 'Bob', address: 'bob@example.com' },
            ],
        })
        const wrapper = mount(EmailDisplay, {
            props: { email },
            global: { stubs },
        })
        const ccSection = wrapper.find('li:nth-child(3)')
        expect(ccSection.text()).toContain(',')
    })

    it('does not render the CC section when cc is empty', () => {
        const email = makeEmail({ cc: [] })
        const wrapper = mount(EmailDisplay, {
            props: { email },
            global: { stubs },
        })
        expect(wrapper.html()).not.toContain('CC:')
    })
})
