// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EmailList from './EmailList.vue'

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('./cache.js', () => ({
    getCachedEmail: vi.fn().mockResolvedValue(null),
    setCachedEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(),
    ListObjectsV2Command: vi.fn(),
    GetObjectCommand: vi.fn(),
}))

vi.mock('./parser.js', () => ({
    default: vi.fn(),
}))

const invalidBucketConfig = JSON.stringify({
    credentials: [
        {
            aws_access_key_id: '',
            aws_secret_access_key: '',
            buckets: [{ aws_region: '', bucket: '' }],
        },
    ],
})

beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
})

describe('EmailList validation error handling', () => {
    it('shows an error when bucket config fails validation', async () => {
        localStorage.setItem('config', invalidBucketConfig)

        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        expect(wrapper.find('.alert-error').exists()).toBe(true)
        expect(wrapper.text()).toContain('Missing AWS region in settings')
    })
})
