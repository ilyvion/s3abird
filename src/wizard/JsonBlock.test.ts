// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import JsonBlock from './JsonBlock.vue'

describe('JsonBlock', () => {
    beforeEach(() => {
        vi.stubGlobal('navigator', {
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.useRealTimers()
    })

    it('renders the JSON string inside a pre element', () => {
        const json = '{"key":"value"}'
        const wrapper = mount(JsonBlock, { props: { json } })
        expect(wrapper.find('pre').text()).toBe(json)
    })

    it('shows "Copy" on the button initially', () => {
        const wrapper = mount(JsonBlock, { props: { json: '{}' } })
        expect(wrapper.find('button').text()).toBe('Copy')
    })

    it('writes the JSON to the clipboard when Copy is clicked', async () => {
        const json = '{"a":1}'
        const wrapper = mount(JsonBlock, { props: { json } })
        await wrapper.find('button').trigger('click')
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(json)
    })

    it('shows "Copied!" immediately after clicking Copy', async () => {
        const wrapper = mount(JsonBlock, { props: { json: '{}' } })
        await wrapper.find('button').trigger('click')
        expect(wrapper.find('button').text()).toBe('Copied!')
    })

    it('reverts the button back to "Copy" after the 3 s timeout', async () => {
        vi.useFakeTimers()
        const wrapper = mount(JsonBlock, { props: { json: '{}' } })

        await wrapper.find('button').trigger('click')
        expect(wrapper.find('button').text()).toBe('Copied!')

        vi.advanceTimersByTime(3000)
        await wrapper.vm.$nextTick()

        expect(wrapper.find('button').text()).toBe('Copy')
    })
})
