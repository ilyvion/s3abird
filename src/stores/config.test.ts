import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../cache', () => ({ clearEmailCache: vi.fn() }))

const flattenBucketsMock = vi.fn()
vi.mock('../config', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../config')>()
    return {
        ...actual,
        flattenBuckets: (...args: Parameters<typeof actual.flattenBuckets>) => {
            flattenBucketsMock(...args)
            return actual.flattenBuckets(...args)
        },
    }
})

const storageMock: Record<string, string> = {}
vi.stubGlobal('localStorage', storageMock)

describe('config store', () => {
    beforeEach(() => {
        vi.resetModules()
        flattenBucketsMock.mockClear()
        setActivePinia(createPinia())
        for (const k of Object.keys(storageMock)) delete storageMock[k]
    })

    it('initializes config as null when localStorage is empty', async () => {
        const { useConfigStore } = await import('./config')
        const store = useConfigStore()
        expect(store.config).toBeNull()
    })

    it('initializes config as null when localStorage.config is corrupted JSON', async () => {
        storageMock['config'] = '{not valid json}'
        const { useConfigStore } = await import('./config')
        const store = useConfigStore()
        expect(store.config).toBeNull()
    })

    it('initializes config from valid JSON in localStorage', async () => {
        const validConfig = {
            buckets: [
                {
                    aws_region: 'us-east-1',
                    aws_access_key_id: 'AKID',
                    aws_secret_access_key: 'secret',
                    bucket: 'my-bucket',
                    prefix: '',
                },
            ],
        }
        storageMock['config'] = JSON.stringify(validConfig)
        const { useConfigStore } = await import('./config')
        const store = useConfigStore()
        expect(store.config).not.toBeNull()
    })

    it('calls flattenBuckets only once when allBuckets and activeBucket are both accessed', async () => {
        const validConfig = {
            buckets: [
                {
                    aws_region: 'us-east-1',
                    aws_access_key_id: 'AKID',
                    aws_secret_access_key: 'secret',
                    bucket: 'my-bucket',
                    prefix: '',
                },
            ],
        }
        storageMock['config'] = JSON.stringify(validConfig)
        const { useConfigStore } = await import('./config')
        const store = useConfigStore()
        flattenBucketsMock.mockClear()

        void store.allBuckets
        void store.activeBucket

        expect(flattenBucketsMock).toHaveBeenCalledTimes(1)
    })
})
