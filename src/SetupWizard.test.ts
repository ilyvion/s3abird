// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('./cache', () => ({ clearEmailCacheForBuckets: vi.fn() }))
vi.mock('./s3Utils', () => ({ clearS3ClientCache: vi.fn() }))

const pushMock = vi.fn()
let currentPath = '/setup'
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: pushMock }),
    useRoute: () => ({ path: currentPath }),
}))

vi.mock('./wizard/AppWizard.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('./wizard/AppWizardStep.vue', () => ({
    default: {
        template: '<div><slot /></div>',
        props: ['title', 'isReady', 'isVisible', 'onEnter', 'onExit', 'onFinished'],
    },
}))
vi.mock('./wizard/AppWizardStepGroup.vue', () => ({
    default: { template: '<div><slot /></div>', props: ['isVisible', 'colorClass'] },
}))
vi.mock('./wizard/JsonBlock.vue', () => ({
    default: { template: '<pre>{{ json }}</pre>', props: ['json'] },
}))
vi.mock('./wizard/ConnectionTest.vue', () => ({
    default: {
        template: '<button data-testid="test-btn" @click="$emit(\'test\')">Test</button>',
        props: ['disabled', 'status', 'error'],
        emits: ['test'],
    },
}))

const mockSend = vi.hoisted(() => vi.fn())
vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: class {
        send = mockSend
    },
    ListObjectsV2Command: vi.fn(),
}))

const storageMock: Record<string, string> = {}
vi.stubGlobal('localStorage', {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, value: string) => {
        storageMock[key] = value
    },
    removeItem: (key: string) => {
        delete storageMock[key]
    },
})

import SetupWizard from './SetupWizard.vue'
import { useConfigStore } from './stores/config'

function makeConfiguredStorage() {
    storageMock['config'] = JSON.stringify({
        credentials: [
            {
                aws_access_key_id: 'AKID',
                aws_secret_access_key: 'secret',
                buckets: [{ aws_region: 'us-east-1', bucket: 'my-bucket' }],
            },
        ],
    })
}

describe('SetupWizard', () => {
    beforeEach(() => {
        pushMock.mockClear()
        mockSend.mockReset()
        currentPath = '/setup'
        setActivePinia(createPinia())
        for (const k of Object.keys(storageMock)) delete storageMock[k]
    })

    it('renders without crashing when unconfigured', async () => {
        const wrapper = mount(SetupWizard)
        await flushPromises()
        expect(wrapper.text()).toContain('Setup')
        wrapper.unmount()
    })

    it('redirects to /inbox if already configured on initial setup route', async () => {
        makeConfiguredStorage()
        setActivePinia(createPinia())

        mount(SetupWizard)
        await flushPromises()

        expect(pushMock).toHaveBeenCalledWith('/inbox')
    })

    it('does NOT redirect to /inbox in add mode even when configured', async () => {
        currentPath = '/setup/add'
        makeConfiguredStorage()
        setActivePinia(createPinia())

        mount(SetupWizard)
        await flushPromises()

        expect(pushMock).not.toHaveBeenCalledWith('/inbox')
    })

    it('saves config and navigates to /inbox when finish() is called', async () => {
        const wrapper = mount(SetupWizard)
        await flushPromises()

        const store = useConfigStore()
        expect(store.config).toBeNull()

        await wrapper.find('input[placeholder="S3 bucket name"]').setValue('test-bucket')
        await wrapper.find('select').setValue('us-east-1')
        await wrapper.find('input[placeholder="Access key ID"]').setValue('AKID123')
        await wrapper.find('input[placeholder="Secret access key"]').setValue('secret456')

        wrapper.vm.finish()
        await flushPromises()

        expect(store.config?.credentials[0].aws_access_key_id).toBe('AKID123')
        expect(store.config?.credentials[0].aws_secret_access_key).toBe('secret456')
        expect(store.config?.credentials[0].buckets[0].bucket).toBe('test-bucket')
        expect(store.config?.credentials[0].buckets[0].aws_region).toBe('us-east-1')
        expect(pushMock).toHaveBeenCalledWith('/inbox')

        wrapper.unmount()
    })

    it('stores the prefix when provided', async () => {
        const wrapper = mount(SetupWizard)
        await flushPromises()

        const store = useConfigStore()

        await wrapper.find('input[placeholder="S3 bucket name"]').setValue('my-bucket')
        await wrapper.find('input[placeholder="S3 Key prefix (optional)"]').setValue('emails/')
        await wrapper.find('input[placeholder="Access key ID"]').setValue('AKID')
        await wrapper.find('input[placeholder="Secret access key"]').setValue('secret')

        wrapper.vm.finish()
        await flushPromises()

        expect(store.config?.credentials[0].buckets[0].prefix).toBe('emails/')

        wrapper.unmount()
    })

    it('omits prefix when left blank', async () => {
        const wrapper = mount(SetupWizard)
        await flushPromises()

        const store = useConfigStore()

        await wrapper.find('input[placeholder="S3 bucket name"]').setValue('my-bucket')
        await wrapper.find('input[placeholder="Access key ID"]').setValue('AKID')
        await wrapper.find('input[placeholder="Secret access key"]').setValue('secret')

        wrapper.vm.finish()
        await flushPromises()

        expect(store.config?.credentials[0].buckets[0].prefix).toBeUndefined()

        wrapper.unmount()
    })

    it('appends credential in add mode instead of replacing config', async () => {
        currentPath = '/setup/add'
        makeConfiguredStorage()
        setActivePinia(createPinia())

        const wrapper = mount(SetupWizard)
        await flushPromises()

        const store = useConfigStore()
        expect(store.config?.credentials).toHaveLength(1)

        await wrapper.find('input[placeholder="S3 bucket name"]').setValue('new-bucket')
        await wrapper.find('input[placeholder="Access key ID"]').setValue('NEWAKID')
        await wrapper.find('input[placeholder="Secret access key"]').setValue('newsecret')

        wrapper.vm.finish()
        await flushPromises()

        expect(store.config?.credentials).toHaveLength(2)
        expect(store.config?.credentials[1].buckets[0].bucket).toBe('new-bucket')
        expect(pushMock).toHaveBeenCalledWith('/inbox')

        wrapper.unmount()
    })

    it('sets testStatus to success on successful S3 call', async () => {
        mockSend.mockResolvedValue({})
        const wrapper = mount(SetupWizard)
        await flushPromises()

        await wrapper.find('input[placeholder="S3 bucket name"]').setValue('my-bucket')
        await wrapper.find('select').setValue('us-east-1')
        await wrapper.find('input[placeholder="Access key ID"]').setValue('AKID')
        await wrapper.find('input[placeholder="Secret access key"]').setValue('secret')

        await wrapper.vm.testConnection()

        expect(wrapper.vm.testStatus).toBe('success')
        expect(wrapper.vm.testError).toBe('')

        wrapper.unmount()
    })

    it('shows a friendly message for TypeError (CORS / offline)', async () => {
        mockSend.mockRejectedValue(new TypeError('Failed to fetch'))
        const wrapper = mount(SetupWizard)
        await flushPromises()

        await wrapper.find('input[placeholder="S3 bucket name"]').setValue('my-bucket')
        await wrapper.find('select').setValue('us-east-1')
        await wrapper.find('input[placeholder="Access key ID"]').setValue('AKID')
        await wrapper.find('input[placeholder="Secret access key"]').setValue('secret')

        await wrapper.vm.testConnection()

        expect(wrapper.vm.testStatus).toBe('error')
        expect(wrapper.vm.testError).toContain('CORS')
        expect(wrapper.vm.testError).not.toContain('Failed to fetch')

        wrapper.unmount()
    })

    it('sets testStatus to error on failed S3 call', async () => {
        mockSend.mockRejectedValue(new Error('Access Denied'))
        const wrapper = mount(SetupWizard)
        await flushPromises()

        await wrapper.find('input[placeholder="S3 bucket name"]').setValue('my-bucket')
        await wrapper.find('select').setValue('us-east-1')
        await wrapper.find('input[placeholder="Access key ID"]').setValue('AKID')
        await wrapper.find('input[placeholder="Secret access key"]').setValue('secret')

        await wrapper.vm.testConnection()

        expect(wrapper.vm.testStatus).toBe('error')
        expect(wrapper.vm.testError).toBe('Access Denied')

        wrapper.unmount()
    })

    it('resets testStatus to idle when credentials change', async () => {
        mockSend.mockResolvedValue({})
        const wrapper = mount(SetupWizard)
        await flushPromises()

        await wrapper.find('input[placeholder="S3 bucket name"]').setValue('my-bucket')
        await wrapper.find('select').setValue('us-east-1')
        await wrapper.find('input[placeholder="Access key ID"]').setValue('AKID')
        await wrapper.find('input[placeholder="Secret access key"]').setValue('secret')

        await wrapper.vm.testConnection()
        expect(wrapper.vm.testStatus).toBe('success')

        // Changing the access key ID should reset the test
        await wrapper.find('input[placeholder="Access key ID"]').setValue('AKID2')
        await flushPromises()

        expect(wrapper.vm.testStatus).toBe('idle')

        wrapper.unmount()
    })
})
