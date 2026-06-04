// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createHead } from '@unhead/vue/client'
import NotFound from './NotFound.vue'

describe('NotFound', () => {
    it('renders 404 heading and inbox link', () => {
        const wrapper = mount(NotFound, {
            global: {
                plugins: [createHead()],
                stubs: { RouterLink: { template: '<a><slot /></a>', props: ['to'] } },
            },
        })
        expect(wrapper.text()).toContain('404')
        expect(wrapper.text()).toContain('Page not found')
        expect(wrapper.text()).toContain('Go to inbox')
    })
})
