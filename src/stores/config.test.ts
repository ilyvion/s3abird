import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { AwsConfig } from '../config'

vi.mock('../cache', () => ({ clearEmailCacheForBuckets: vi.fn() }))
vi.mock('../s3Utils', () => ({ clearS3ClientCache: vi.fn() }))

import { clearEmailCacheForBuckets } from '../cache'
import { clearS3ClientCache } from '../s3Utils'

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
vi.stubGlobal('localStorage', {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, value: string) => {
        storageMock[key] = value
    },
    removeItem: (key: string) => {
        delete storageMock[key]
    },
})

const baseConfig: AwsConfig = {
    credentials: [
        {
            label: 'My Creds',
            aws_access_key_id: 'AKID',
            aws_secret_access_key: 'secret',
            buckets: [
                {
                    aws_region: 'us-east-1',
                    bucket: 'my-bucket',
                    prefix: 'emails/',
                },
            ],
        },
    ],
}

describe('config store', () => {
    beforeEach(() => {
        vi.resetModules()
        flattenBucketsMock.mockClear()
        vi.mocked(clearEmailCacheForBuckets).mockClear()
        vi.mocked(clearS3ClientCache).mockClear()
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

    describe('updateConfig cache eviction', () => {
        it('does not evict any cache when only a label changes', async () => {
            const { useConfigStore } = await import('./config')
            const store = useConfigStore()
            store.updateConfig(baseConfig)
            vi.mocked(clearEmailCacheForBuckets).mockClear()
            vi.mocked(clearS3ClientCache).mockClear()

            const labelOnly: AwsConfig = {
                credentials: [
                    {
                        ...baseConfig.credentials[0],
                        label: 'Renamed',
                    },
                ],
            }
            store.updateConfig(labelOnly)

            expect(clearEmailCacheForBuckets).not.toHaveBeenCalled()
            expect(clearS3ClientCache).not.toHaveBeenCalled()
        })

        it('evicts email cache for a bucket whose name changes, not unaffected buckets', async () => {
            const twoCredConfig: AwsConfig = {
                credentials: [
                    {
                        aws_access_key_id: 'AKID',
                        aws_secret_access_key: 'secret',
                        buckets: [
                            { aws_region: 'us-east-1', bucket: 'bucket-a' },
                            { aws_region: 'us-east-1', bucket: 'bucket-b' },
                        ],
                    },
                ],
            }
            const { useConfigStore } = await import('./config')
            const store = useConfigStore()
            store.updateConfig(twoCredConfig)
            vi.mocked(clearEmailCacheForBuckets).mockClear()
            vi.mocked(clearS3ClientCache).mockClear()

            const renamed: AwsConfig = {
                credentials: [
                    {
                        aws_access_key_id: 'AKID',
                        aws_secret_access_key: 'secret',
                        buckets: [
                            { aws_region: 'us-east-1', bucket: 'bucket-a-new' },
                            { aws_region: 'us-east-1', bucket: 'bucket-b' },
                        ],
                    },
                ],
            }
            store.updateConfig(renamed)

            expect(clearEmailCacheForBuckets).toHaveBeenCalledOnce()
            const calledWith = vi.mocked(clearEmailCacheForBuckets).mock.calls[0][0]
            expect(calledWith).toHaveLength(1)
            expect(calledWith[0]).toMatchObject({ bucket: 'bucket-a', aws_region: 'us-east-1' })
        })

        it('evicts email cache for a bucket when its prefix changes', async () => {
            const { useConfigStore } = await import('./config')
            const store = useConfigStore()
            store.updateConfig(baseConfig)
            vi.mocked(clearEmailCacheForBuckets).mockClear()
            vi.mocked(clearS3ClientCache).mockClear()

            const newPrefix: AwsConfig = {
                credentials: [
                    {
                        ...baseConfig.credentials[0],
                        buckets: [{ aws_region: 'us-east-1', bucket: 'my-bucket', prefix: 'new/' }],
                    },
                ],
            }
            store.updateConfig(newPrefix)

            expect(clearEmailCacheForBuckets).toHaveBeenCalledOnce()
            const calledWith = vi.mocked(clearEmailCacheForBuckets).mock.calls[0][0]
            expect(calledWith[0]).toMatchObject({ bucket: 'my-bucket', aws_region: 'us-east-1' })
        })

        it('clears S3 client cache when a credential access key changes', async () => {
            const { useConfigStore } = await import('./config')
            const store = useConfigStore()
            store.updateConfig(baseConfig)
            vi.mocked(clearEmailCacheForBuckets).mockClear()
            vi.mocked(clearS3ClientCache).mockClear()

            const newKey: AwsConfig = {
                credentials: [
                    {
                        ...baseConfig.credentials[0],
                        aws_access_key_id: 'NEW-AKID',
                    },
                ],
            }
            store.updateConfig(newKey)

            expect(clearS3ClientCache).toHaveBeenCalledOnce()
        })

        it('clears S3 client cache when a credential secret changes', async () => {
            const { useConfigStore } = await import('./config')
            const store = useConfigStore()
            store.updateConfig(baseConfig)
            vi.mocked(clearEmailCacheForBuckets).mockClear()
            vi.mocked(clearS3ClientCache).mockClear()

            const newSecret: AwsConfig = {
                credentials: [
                    {
                        ...baseConfig.credentials[0],
                        aws_secret_access_key: 'new-secret',
                    },
                ],
            }
            store.updateConfig(newSecret)

            expect(clearS3ClientCache).toHaveBeenCalledOnce()
        })

        it('does not clear S3 client cache when only a label or bucket list changes', async () => {
            const { useConfigStore } = await import('./config')
            const store = useConfigStore()
            store.updateConfig(baseConfig)
            vi.mocked(clearEmailCacheForBuckets).mockClear()
            vi.mocked(clearS3ClientCache).mockClear()

            const bucketRenamed: AwsConfig = {
                credentials: [
                    {
                        ...baseConfig.credentials[0],
                        buckets: [{ aws_region: 'us-east-1', bucket: 'other-bucket' }],
                    },
                ],
            }
            store.updateConfig(bucketRenamed)

            expect(clearS3ClientCache).not.toHaveBeenCalled()
        })

        it('does not clear any cache when a new credential is added without changing existing ones', async () => {
            const { useConfigStore } = await import('./config')
            const store = useConfigStore()
            store.updateConfig(baseConfig)
            vi.mocked(clearEmailCacheForBuckets).mockClear()
            vi.mocked(clearS3ClientCache).mockClear()

            const addedCred: AwsConfig = {
                credentials: [
                    ...baseConfig.credentials,
                    {
                        aws_access_key_id: 'AKID2',
                        aws_secret_access_key: 'secret2',
                        buckets: [{ aws_region: 'eu-west-1', bucket: 'another-bucket' }],
                    },
                ],
            }
            store.updateConfig(addedCred)

            expect(clearEmailCacheForBuckets).not.toHaveBeenCalled()
            expect(clearS3ClientCache).not.toHaveBeenCalled()
        })

        it('does not clear any cache when a new bucket is added under an existing credential', async () => {
            const { useConfigStore } = await import('./config')
            const store = useConfigStore()
            store.updateConfig(baseConfig)
            vi.mocked(clearEmailCacheForBuckets).mockClear()
            vi.mocked(clearS3ClientCache).mockClear()

            const addedBucket: AwsConfig = {
                credentials: [
                    {
                        ...baseConfig.credentials[0],
                        buckets: [
                            ...baseConfig.credentials[0].buckets,
                            { aws_region: 'us-west-2', bucket: 'second-bucket' },
                        ],
                    },
                ],
            }
            store.updateConfig(addedBucket)

            expect(clearEmailCacheForBuckets).not.toHaveBeenCalled()
            expect(clearS3ClientCache).not.toHaveBeenCalled()
        })
    })
})
