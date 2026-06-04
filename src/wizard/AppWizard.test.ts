// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file */
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import AppWizard from './AppWizard.vue'
import AppWizardStep from './AppWizardStep.vue'
import AppWizardStepGroup from './AppWizardStepGroup.vue'
import type { Step } from './AppWizardStep.vue'
import type { Group } from './AppWizardStepGroup.vue'

interface StepDef extends Partial<Omit<Step, 'title'>> {
    title: string
    content?: string
}

function mkWizard(steps: StepDef[]) {
    return mount(
        defineComponent({
            render() {
                return h(
                    AppWizard,
                    {},
                    {
                        default: () =>
                            steps.map((s) =>
                                h(
                                    AppWizardStep,
                                    {
                                        title: s.title,
                                        isReady: s.isReady,
                                        isVisible: s.isVisible,
                                        onEnter: s.onEnter,
                                        onExit: s.onExit,
                                        onFinished: s.onFinished,
                                    },
                                    { default: () => s.content ?? `Step: ${s.title}` }
                                )
                            ),
                    }
                )
            },
        })
    )
}

function mkWizardWithGroup(
    outsideSteps: StepDef[],
    groupProps: Partial<Group>,
    groupSteps: StepDef[]
) {
    return mount(
        defineComponent({
            render() {
                return h(
                    AppWizard,
                    {},
                    {
                        default: () => [
                            ...outsideSteps.map((s) =>
                                h(
                                    AppWizardStep,
                                    { title: s.title, isReady: s.isReady },
                                    { default: () => s.content ?? `Step: ${s.title}` }
                                )
                            ),
                            h(AppWizardStepGroup, groupProps, {
                                default: () =>
                                    groupSteps.map((s) =>
                                        h(
                                            AppWizardStep,
                                            { title: s.title, isReady: s.isReady },
                                            { default: () => s.content ?? `Step: ${s.title}` }
                                        )
                                    ),
                            }),
                        ],
                    }
                )
            },
        })
    )
}

function findBtn(wrapper: ReturnType<typeof mount>, text: string) {
    return wrapper.findAll('button').find((b) => b.text().trim() === text)
}

describe('AppWizard', () => {
    it('shows the first step content initially', async () => {
        const wrapper = mkWizard([{ title: 'Alpha' }, { title: 'Beta' }])
        await flushPromises()

        expect(wrapper.text()).toContain('Step: Alpha')
        expect(wrapper.findAll('.step')).toHaveLength(2)
        expect(wrapper.findAll('.step')[0].text()).toContain('Alpha')
    })

    it('Previous button is disabled on the first step', async () => {
        const wrapper = mkWizard([{ title: 'Only' }])
        await flushPromises()

        expect(findBtn(wrapper, 'Previous')?.attributes('disabled')).toBeDefined()
    })

    it('Next button is disabled when the current step isReady returns false', async () => {
        const wrapper = mkWizard([{ title: 'Step 1', isReady: () => false }, { title: 'Step 2' }])
        await flushPromises()

        expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined()
    })

    it('Next button is enabled when isReady returns true', async () => {
        const wrapper = mkWizard([{ title: 'Step 1', isReady: () => true }, { title: 'Step 2' }])
        await flushPromises()

        expect(wrapper.find('.btn-primary').attributes('disabled')).toBeUndefined()
    })

    it('Next button advances to the next step', async () => {
        const wrapper = mkWizard([{ title: 'Step 1', isReady: () => true }, { title: 'Step 2' }])
        await flushPromises()

        await wrapper.find('.btn-primary').trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('Step: Step 2')
    })

    it('Previous button navigates back', async () => {
        const wrapper = mkWizard([{ title: 'Step 1', isReady: () => true }, { title: 'Step 2' }])
        await flushPromises()

        await wrapper.find('.btn-primary').trigger('click')
        await flushPromises()
        await findBtn(wrapper, 'Previous')?.trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('Step: Step 1')
    })

    it('calls onExit for the departing step and onEnter for the arriving step', async () => {
        const onExit = vi.fn()
        const onEnter = vi.fn()
        const wrapper = mkWizard([
            { title: 'Step 1', isReady: () => true, onExit },
            { title: 'Step 2', onEnter },
        ])
        await flushPromises()

        await wrapper.find('.btn-primary').trigger('click')
        await flushPromises()

        expect(onExit).toHaveBeenCalledOnce()
        expect(onEnter).toHaveBeenCalledOnce()
    })

    it('shows Finish instead of Next on the last step', async () => {
        const wrapper = mkWizard([{ title: 'Step 1', isReady: () => true }, { title: 'Last' }])
        await flushPromises()

        expect(wrapper.find('.btn-primary').exists()).toBe(true)
        expect(wrapper.find('.btn-success').exists()).toBe(false)

        await wrapper.find('.btn-primary').trigger('click')
        await flushPromises()

        expect(wrapper.find('.btn-primary').exists()).toBe(false)
        expect(wrapper.find('.btn-success').exists()).toBe(true)
    })

    it('Finish button is disabled when the last step isReady returns false', async () => {
        const wrapper = mkWizard([
            { title: 'Step 1', isReady: () => true },
            { title: 'Last', isReady: () => false },
        ])
        await flushPromises()

        await wrapper.find('.btn-primary').trigger('click')
        await flushPromises()

        expect(wrapper.find('.btn-success').attributes('disabled')).toBeDefined()
    })

    it('Finish button calls onFinished on the last step', async () => {
        const onFinished = vi.fn()
        const wrapper = mkWizard([
            { title: 'Step 1', isReady: () => true },
            { title: 'Last', isReady: () => true, onFinished },
        ])
        await flushPromises()

        await wrapper.find('.btn-primary').trigger('click')
        await flushPromises()
        await wrapper.find('.btn-success').trigger('click')

        expect(onFinished).toHaveBeenCalledOnce()
    })

    it('clicking a reachable step indicator navigates to it', async () => {
        const wrapper = mkWizard([
            { title: 'Step 1', isReady: () => true },
            { title: 'Step 2', isReady: () => true },
            { title: 'Step 3' },
        ])
        await flushPromises()

        await wrapper.findAll('.step')[1].trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('Step: Step 2')
    })

    it('clicking an unreachable step indicator does not navigate', async () => {
        const wrapper = mkWizard([{ title: 'Step 1', isReady: () => false }, { title: 'Step 2' }])
        await flushPromises()

        await wrapper.findAll('.step')[1].trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('Step: Step 1')
    })

    it('a step with isVisible: () => false is excluded from navigation', async () => {
        const wrapper = mkWizard([
            { title: 'Visible 1', isReady: () => true },
            { title: 'Hidden', isVisible: () => false },
            { title: 'Visible 2' },
        ])
        await flushPromises()

        expect(wrapper.findAll('.step')).toHaveLength(2)
        expect(wrapper.findAll('.step')[0].text()).toContain('Visible 1')
        expect(wrapper.findAll('.step')[1].text()).toContain('Visible 2')
    })
})

describe('AppWizardStepGroup', () => {
    it('hides all steps in the group when isVisible returns false', async () => {
        const wrapper = mkWizardWithGroup(
            [{ title: 'Outside', isReady: () => true }],
            { isVisible: () => false },
            [{ title: 'Group A' }, { title: 'Group B' }]
        )
        await flushPromises()

        const steps = wrapper.findAll('.step')
        expect(steps).toHaveLength(1)
        expect(steps[0].text()).toContain('Outside')
    })

    it('shows all steps in the group when isVisible returns true', async () => {
        const wrapper = mkWizardWithGroup(
            [{ title: 'Outside', isReady: () => true }],
            { isVisible: () => true },
            [{ title: 'Group A' }, { title: 'Group B' }]
        )
        await flushPromises()

        expect(wrapper.findAll('.step')).toHaveLength(3)
    })

    it('applies isReady from the group to each contained step', async () => {
        const wrapper = mkWizardWithGroup([], { isReady: () => false }, [{ title: 'Blocked' }])
        await flushPromises()

        // The single step is the last step; its Finish button should be disabled
        // because the group's isReady returns false
        expect(wrapper.find('.btn-success').attributes('disabled')).toBeDefined()
    })
})
