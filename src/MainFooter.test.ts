// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { version } from '../package.json'
import MainFooter from './MainFooter.vue'

describe('MainFooter', () => {
    it('renders the package version', () => {
        const wrapper = mount(MainFooter)
        expect(wrapper.text()).toContain(version)
    })
})
