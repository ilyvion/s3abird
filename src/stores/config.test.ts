import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../cache', () => ({ clearEmailCache: vi.fn() }))

const storageMock: Record<string, string> = {}
vi.stubGlobal('localStorage', storageMock)

describe('config store', () => {
    beforeEach(() => {
        vi.resetModules()
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
})
