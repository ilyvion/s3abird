// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FilterList from './FilterList.vue'
import { useEmailStore } from './stores/email.js'
import type { Label } from './labels.js'

vi.mock('./cache.js', () => ({
    getCachedEmail: vi.fn().mockResolvedValue(null),
    setCachedEmail: vi.fn().mockResolvedValue(undefined),
    setEmailMeta: vi.fn().mockResolvedValue(undefined),
    getAllEmailMetas: vi.fn().mockResolvedValue([]),
    evictStaleEntries: vi.fn().mockResolvedValue(undefined),
    getReadKeys: vi.fn().mockResolvedValue(new Set<string>()),
    markAsRead: vi.fn().mockResolvedValue(undefined),
}))

function makeLabel(type: Label['type'], value: string): Label {
    return { type, value, f: () => true }
}

describe('FilterList body badge', () => {
    it('typing "body: test" and submitting creates a badge of type body', async () => {
        const wrapper = mount(FilterList)
        const input = wrapper.find('input')

        await input.setValue('body: test')
        await wrapper.find('form').trigger('submit')

        const emailStore = useEmailStore()
        expect(emailStore.labels).toHaveLength(1)
        expect(emailStore.labels[0].type).toBe('body')
        expect(emailStore.labels[0].value).toBe('test')
    })
})

beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
})

describe('FilterList badge focusability', () => {
    it('renders no focusable badges when there are no filters', () => {
        const wrapper = mount(FilterList)
        expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(0)
    })

    it('renders filter badges with tabindex="0"', async () => {
        const emailStore = useEmailStore()
        emailStore.labels.push(makeLabel('from', 'alice@example.com'))
        emailStore.labels.push(makeLabel('subject', 'Hello'))

        const wrapper = mount(FilterList)
        const badges = wrapper.findAll('[tabindex="0"]')
        expect(badges).toHaveLength(2)
    })

    it('renders filter badges with role="button"', async () => {
        const emailStore = useEmailStore()
        emailStore.labels.push(makeLabel('from', 'alice@example.com'))

        const wrapper = mount(FilterList)
        const badge = wrapper.find('[tabindex="0"]')
        expect(badge.attributes('role')).toBe('button')
    })
})

describe('FilterList Delete key removes filter', () => {
    it('pressing Delete on a focused badge removes that filter', async () => {
        const emailStore = useEmailStore()
        const label = makeLabel('from', 'alice@example.com')
        emailStore.labels.push(label)

        const wrapper = mount(FilterList)
        const badge = wrapper.find('[tabindex="0"]')

        await badge.trigger('keydown', { key: 'Delete' })

        expect(emailStore.labels).toHaveLength(0)
    })

    it('pressing Delete on one badge only removes that badge', async () => {
        const emailStore = useEmailStore()
        const label1 = makeLabel('from', 'alice@example.com')
        const label2 = makeLabel('subject', 'Hello')
        emailStore.labels.push(label1, label2)

        const wrapper = mount(FilterList)
        const badges = wrapper.findAll('[tabindex="0"]')

        await badges[0].trigger('keydown', { key: 'Delete' })

        expect(emailStore.labels).toHaveLength(1)
        expect(emailStore.labels[0].type).toBe(label2.type)
        expect(emailStore.labels[0].value).toBe(label2.value)
    })

    it('pressing a non-Delete key on a badge does not remove the filter', async () => {
        const emailStore = useEmailStore()
        emailStore.labels.push(makeLabel('from', 'alice@example.com'))

        const wrapper = mount(FilterList)
        const badge = wrapper.find('[tabindex="0"]')

        await badge.trigger('keydown', { key: 'Enter' })

        expect(emailStore.labels).toHaveLength(1)
    })
})
