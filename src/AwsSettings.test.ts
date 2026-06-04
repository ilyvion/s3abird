// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AwsSettings from './AwsSettings.vue'
import { useConfigStore } from './stores/config'
import type { AwsConfig } from './config'

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

const ONE_CRED_TWO_BUCKETS: AwsConfig = {
    credentials: [
        {
            label: 'Work',
            aws_access_key_id: 'AKID1',
            aws_secret_access_key: 'SECRET1',
            buckets: [
                { label: 'Primary', aws_region: 'us-east-1', bucket: 'bucket-a' },
                { aws_region: 'eu-west-1', bucket: 'bucket-b', prefix: 'mail/' },
            ],
        },
    ],
}

function mountWithConfig(config: AwsConfig | null = null) {
    if (config) {
        localStorage.config = JSON.stringify(config)
    } else {
        localStorage.removeItem('config')
    }
    setActivePinia(createPinia())
    const wrapper = mount(AwsSettings)
    const configStore = useConfigStore()
    vi.spyOn(configStore, 'updateConfig')
    return { wrapper, configStore }
}

beforeEach(() => {
    localStorage.clear()
    if (!HTMLDialogElement.prototype.showModal) {
        HTMLDialogElement.prototype.showModal = vi.fn()
    }
    if (!HTMLDialogElement.prototype.close) {
        HTMLDialogElement.prototype.close = vi.fn()
    }
})

describe('AwsSettings badge counter', () => {
    it('shows no badge when there are no credentials', () => {
        const { wrapper } = mountWithConfig(null)
        expect(wrapper.find('.badge').exists()).toBe(false)
    })

    it('shows badge with total bucket count', () => {
        const { wrapper } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        expect(wrapper.find('.badge').text()).toBe('2')
    })
})

describe('AwsSettings list mode', () => {
    it('shows empty state message when no credentials are configured', () => {
        const { wrapper } = mountWithConfig({ credentials: [] })
        expect(wrapper.text()).toContain('No credentials configured')
    })

    it('shows credential label in list', () => {
        const { wrapper } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        expect(wrapper.text()).toContain('Work')
    })

    it('shows bucket count for each credential', () => {
        const { wrapper } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        expect(wrapper.text()).toContain('2 buckets')
    })

    it('shows bucket label when set', () => {
        const { wrapper } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        expect(wrapper.text()).toContain('Primary')
    })

    it('shows bucket name when no label is set', () => {
        const { wrapper } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        expect(wrapper.text()).toContain('bucket-b')
    })

    it('shows region and bucket path with prefix', () => {
        const { wrapper } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        expect(wrapper.text()).toContain('bucket-b/mail/')
    })
})

describe('AwsSettings credential form - add', () => {
    it('clicking "Add Credentials" shows credential form', async () => {
        const { wrapper } = mountWithConfig({ credentials: [] })
        await wrapper.find('button[type="button"]').trigger('click')
        await flushPromises()
        expect(wrapper.find('input[placeholder="AWS Access Key ID"]').exists()).toBe(true)
    })

    it('credential form starts with empty fields', async () => {
        const { wrapper } = mountWithConfig({ credentials: [] })
        await wrapper.find('button[type="button"]').trigger('click')
        await flushPromises()
        expect(
            (wrapper.find('input[placeholder="AWS Access Key ID"]').element as HTMLInputElement)
                .value
        ).toBe('')
    })

    it('Cancel button returns to list view', async () => {
        const { wrapper } = mountWithConfig({ credentials: [] })
        await wrapper.find('button[type="button"]').trigger('click')
        await flushPromises()
        const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel')!
        await cancelBtn.trigger('click')
        expect(wrapper.text()).toContain('No credentials configured')
    })

    it('submitting add credential form calls updateConfig with new credential', async () => {
        const { wrapper, configStore } = mountWithConfig({ credentials: [] })
        await wrapper.find('button[type="button"]').trigger('click')
        await flushPromises()

        await wrapper.find('input[placeholder="Label (optional)"]').setValue('Personal')
        await wrapper.find('input[placeholder="AWS Access Key ID"]').setValue('NEW_AKID')
        await wrapper.find('input[placeholder="AWS Secret Access Key"]').setValue('NEW_SECRET')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(configStore.updateConfig).toHaveBeenCalledWith({
            credentials: [
                {
                    label: 'Personal',
                    aws_access_key_id: 'NEW_AKID',
                    aws_secret_access_key: 'NEW_SECRET',
                    buckets: [],
                },
            ],
        })
    })

    it('label is omitted from new credential when left blank', async () => {
        const { wrapper, configStore } = mountWithConfig({ credentials: [] })
        await wrapper.find('button[type="button"]').trigger('click')
        await flushPromises()

        await wrapper.find('input[placeholder="AWS Access Key ID"]').setValue('NEW_AKID')
        await wrapper.find('input[placeholder="AWS Secret Access Key"]').setValue('NEW_SECRET')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        const saved = (configStore.updateConfig as ReturnType<typeof vi.spyOn>).mock
            .calls[0][0] as AwsConfig
        expect(saved.credentials[0].label).toBeUndefined()
    })
})

describe('AwsSettings credential form - edit', () => {
    it('edit button pre-fills credential form with existing values', async () => {
        const { wrapper } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        const editBtn = wrapper
            .findAll('button[type="button"]')
            .find((b) => b.find('i.fa-edit').exists())!
        await editBtn.trigger('click')
        await flushPromises()

        expect(
            (wrapper.find('input[placeholder="AWS Access Key ID"]').element as HTMLInputElement)
                .value
        ).toBe('AKID1')
        expect(
            (wrapper.find('input[placeholder="AWS Secret Access Key"]').element as HTMLInputElement)
                .value
        ).toBe('SECRET1')
    })

    it('saving edited credential preserves existing buckets', async () => {
        const { wrapper, configStore } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        const editBtn = wrapper
            .findAll('button[type="button"]')
            .find((b) => b.find('i.fa-edit').exists())!
        await editBtn.trigger('click')
        await flushPromises()

        await wrapper.find('input[placeholder="AWS Access Key ID"]').setValue('UPDATED_AKID')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        const saved = (configStore.updateConfig as ReturnType<typeof vi.spyOn>).mock
            .calls[0][0] as AwsConfig
        expect(saved.credentials[0].aws_access_key_id).toBe('UPDATED_AKID')
        expect(saved.credentials[0].buckets).toEqual(ONE_CRED_TWO_BUCKETS.credentials[0].buckets)
    })
})

describe('AwsSettings remove credential', () => {
    it('clicking delete removes the credential', async () => {
        const { wrapper, configStore } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        const deleteBtn = wrapper
            .findAll('button[type="button"]')
            .find((b) => b.find('i.fa-trash').exists())!
        await deleteBtn.trigger('click')
        await flushPromises()

        const saved = (configStore.updateConfig as ReturnType<typeof vi.spyOn>).mock
            .calls[0][0] as AwsConfig
        expect(saved.credentials).toHaveLength(0)
    })
})

describe('AwsSettings bucket form - add', () => {
    async function openAddBucketForm(wrapper: ReturnType<typeof mount>) {
        const addBucketBtn = wrapper
            .findAll('button[type="button"]')
            .find((b) => b.text().includes('Add bucket'))!
        await addBucketBtn.trigger('click')
        await flushPromises()
    }

    it('bucket without prefix is saved with prefix undefined', async () => {
        const { wrapper, configStore } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        await openAddBucketForm(wrapper)

        await wrapper.find('input[placeholder="AWS Region"]').setValue('us-west-2')
        await wrapper.find('input[placeholder="S3 Bucket or bucket/prefix"]').setValue('new-bucket')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        const saved = (configStore.updateConfig as ReturnType<typeof vi.spyOn>).mock
            .calls[0][0] as AwsConfig
        const addedBucket = saved.credentials[0].buckets[saved.credentials[0].buckets.length - 1]
        expect(addedBucket.bucket).toBe('new-bucket')
        expect(addedBucket.prefix).toBeUndefined()
    })

    it('bucket with single-level prefix is parsed correctly', async () => {
        const { wrapper, configStore } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        await openAddBucketForm(wrapper)

        await wrapper.find('input[placeholder="AWS Region"]').setValue('us-east-1')
        await wrapper
            .find('input[placeholder="S3 Bucket or bucket/prefix"]')
            .setValue('my-bucket/inbox')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        const saved = (configStore.updateConfig as ReturnType<typeof vi.spyOn>).mock
            .calls[0][0] as AwsConfig
        const addedBucket = saved.credentials[0].buckets[saved.credentials[0].buckets.length - 1]
        expect(addedBucket.bucket).toBe('my-bucket')
        expect(addedBucket.prefix).toBe('inbox')
    })

    it('bucket with nested prefix preserves all path segments', async () => {
        const { wrapper, configStore } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        await openAddBucketForm(wrapper)

        await wrapper.find('input[placeholder="AWS Region"]').setValue('us-east-1')
        await wrapper
            .find('input[placeholder="S3 Bucket or bucket/prefix"]')
            .setValue('my-bucket/a/b/c')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        const saved = (configStore.updateConfig as ReturnType<typeof vi.spyOn>).mock
            .calls[0][0] as AwsConfig
        const addedBucket = saved.credentials[0].buckets[saved.credentials[0].buckets.length - 1]
        expect(addedBucket.bucket).toBe('my-bucket')
        expect(addedBucket.prefix).toBe('a/b/c')
    })
})

describe('AwsSettings bucket form - edit', () => {
    async function openEditBucketForm(wrapper: ReturnType<typeof mount>, bucketIndex: number) {
        const bucketEditBtns = wrapper
            .findAll('button[type="button"]')
            .filter((b) => b.classes('btn-xs') && b.find('i.fa-edit').exists())
        await bucketEditBtns[bucketIndex].trigger('click')
        await flushPromises()
    }

    it('pre-fills bucketPath as "bucket/prefix" when prefix is set', async () => {
        const { wrapper } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        await openEditBucketForm(wrapper, 1)

        const input = wrapper.find('input[placeholder="S3 Bucket or bucket/prefix"]')
            .element as HTMLInputElement
        expect(input.value).toBe('bucket-b/mail/')
    })

    it('pre-fills bucketPath as just "bucket" when no prefix', async () => {
        const { wrapper } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        await openEditBucketForm(wrapper, 0)

        const input = wrapper.find('input[placeholder="S3 Bucket or bucket/prefix"]')
            .element as HTMLInputElement
        expect(input.value).toBe('bucket-a')
    })

    it('saving edited bucket updates the entry at the correct index', async () => {
        const { wrapper, configStore } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        await openEditBucketForm(wrapper, 0)

        await wrapper
            .find('input[placeholder="S3 Bucket or bucket/prefix"]')
            .setValue('bucket-a/new-prefix')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        const saved = (configStore.updateConfig as ReturnType<typeof vi.spyOn>).mock
            .calls[0][0] as AwsConfig
        expect(saved.credentials[0].buckets[0].bucket).toBe('bucket-a')
        expect(saved.credentials[0].buckets[0].prefix).toBe('new-prefix')
        expect(saved.credentials[0].buckets).toHaveLength(2)
    })
})

describe('AwsSettings remove bucket', () => {
    it('clicking bucket delete removes only that bucket', async () => {
        const { wrapper, configStore } = mountWithConfig(ONE_CRED_TWO_BUCKETS)
        const bucketDeleteBtns = wrapper
            .findAll('button[type="button"]')
            .filter((b) => b.classes('btn-xs') && b.find('i.fa-trash').exists())
        await bucketDeleteBtns[0].trigger('click')
        await flushPromises()

        const saved = (configStore.updateConfig as ReturnType<typeof vi.spyOn>).mock
            .calls[0][0] as AwsConfig
        expect(saved.credentials[0].buckets).toHaveLength(1)
        expect(saved.credentials[0].buckets[0].bucket).toBe('bucket-b')
    })
})
