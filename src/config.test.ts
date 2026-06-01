import { describe, it, expect } from 'vitest'
import { makeCacheKey, decodeCacheKey } from './config'
import type { EffectiveBucketConfig } from './config'

function makeConfig(overrides: Partial<EffectiveBucketConfig> = {}): EffectiveBucketConfig {
    return {
        aws_region: 'us-east-1',
        aws_access_key_id: 'AKID',
        aws_secret_access_key: 'secret',
        bucket: 'my-bucket',
        prefix: '',
        ...overrides,
    }
}

describe('makeCacheKey / decodeCacheKey', () => {
    it('round-trips an ASCII s3 key', () => {
        const config = makeConfig()
        const key = makeCacheKey(config, 'path/to/email.eml')
        const decoded = decodeCacheKey(key)
        expect(decoded).toEqual({
            aws_region: 'us-east-1',
            bucket: 'my-bucket',
            s3Key: 'path/to/email.eml',
        })
    })

    it('round-trips a key with pipe characters in the s3 key', () => {
        const config = makeConfig()
        const key = makeCacheKey(config, 'a|b|c.eml')
        const decoded = decodeCacheKey(key)
        expect(decoded?.s3Key).toBe('a|b|c.eml')
    })

    it('round-trips a Unicode s3 key', () => {
        const config = makeConfig()
        const key = makeCacheKey(config, '日本語/メール.eml')
        const decoded = decodeCacheKey(key)
        expect(decoded).toEqual({
            aws_region: 'us-east-1',
            bucket: 'my-bucket',
            s3Key: '日本語/メール.eml',
        })
    })

    it('returns null for an invalid cache key', () => {
        expect(decodeCacheKey('not-valid-base64!!!')).toBeNull()
    })
})
