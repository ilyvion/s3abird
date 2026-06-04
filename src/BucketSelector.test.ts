// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BucketSelector from './BucketSelector.vue'
import { useConfigStore } from './stores/config'

vi.mock('./cache.js', () => ({
    getCachedEmail: vi.fn(),
    setCachedEmail: vi.fn(),
    markAsRead: vi.fn(),
    clearEmailCacheForBuckets: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./s3Utils.js', () => ({
    getS3Client: vi.fn(),
    clearS3ClientCache: vi.fn(),
    PAGE_SIZE: 25,
    filterAndSortByDate: vi.fn(),
    getPage: vi.fn(),
    totalPages: vi.fn(),
}))

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(),
    ListObjectsV2Command: vi.fn(),
}))

function makeConfig(buckets: { label?: string; bucket: string }[]) {
    return {
        credentials: [
            {
                aws_access_key_id: 'AKID',
                aws_secret_access_key: 'SECRET',
                buckets: buckets.map((b) => ({ aws_region: 'us-east-1', ...b })),
            },
        ],
    }
}

beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
})

describe('BucketSelector visibility', () => {
    it('is hidden when there are no buckets', () => {
        localStorage.config = JSON.stringify({ credentials: [] })
        setActivePinia(createPinia())
        const wrapper = mount(BucketSelector)
        expect(wrapper.find('select').exists()).toBe(false)
    })

    it('is hidden when there is exactly one bucket', () => {
        localStorage.config = JSON.stringify(makeConfig([{ bucket: 'my-bucket' }]))
        setActivePinia(createPinia())
        const wrapper = mount(BucketSelector)
        expect(wrapper.find('select').exists()).toBe(false)
    })

    it('is visible when there are two or more buckets', () => {
        localStorage.config = JSON.stringify(
            makeConfig([{ bucket: 'bucket-a' }, { bucket: 'bucket-b' }])
        )
        setActivePinia(createPinia())
        const wrapper = mount(BucketSelector)
        expect(wrapper.find('select').exists()).toBe(true)
    })
})

describe('BucketSelector option labels', () => {
    it('shows bucket name when no label is set', () => {
        localStorage.config = JSON.stringify(
            makeConfig([{ bucket: 'bucket-a' }, { bucket: 'bucket-b' }])
        )
        setActivePinia(createPinia())
        const wrapper = mount(BucketSelector)
        const options = wrapper.findAll('option')
        expect(options[0].text()).toBe('bucket-a')
        expect(options[1].text()).toBe('bucket-b')
    })

    it('shows label instead of bucket name when label is set', () => {
        localStorage.config = JSON.stringify(
            makeConfig([{ bucket: 'bucket-a', label: 'My Inbox' }, { bucket: 'bucket-b' }])
        )
        setActivePinia(createPinia())
        const wrapper = mount(BucketSelector)
        const options = wrapper.findAll('option')
        expect(options[0].text()).toBe('My Inbox')
        expect(options[1].text()).toBe('bucket-b')
    })
})

describe('BucketSelector active bucket', () => {
    it('calls setActiveBucket when selection changes', async () => {
        localStorage.config = JSON.stringify(
            makeConfig([{ bucket: 'bucket-a' }, { bucket: 'bucket-b' }])
        )
        setActivePinia(createPinia())
        const configStore = useConfigStore()
        vi.spyOn(configStore, 'setActiveBucket')

        const wrapper = mount(BucketSelector)
        await wrapper.find('select').setValue('1')
        expect(configStore.setActiveBucket).toHaveBeenCalledWith(1)
    })
})
