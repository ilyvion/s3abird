import { describe, it, expect } from 'vitest'
import {
    makeCacheKey,
    decodeCacheKey,
    migrateLegacyConfig,
    validateEffectiveConfig,
} from './config'
import type { EffectiveBucketConfig } from './config'
import { ref } from 'vue'

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

describe('migrateLegacyConfig', () => {
    it('returns null for null input', () => {
        expect(migrateLegacyConfig(null)).toBeNull()
    })

    it('returns null for non-object input', () => {
        expect(migrateLegacyConfig('string')).toBeNull()
    })

    it('returns the object as-is when it has credentials array (current format)', () => {
        const config = {
            credentials: [{ aws_access_key_id: 'A', aws_secret_access_key: 'B', buckets: [] }],
        }
        const result = migrateLegacyConfig(config)
        expect(result).toEqual(config)
    })

    it('converts previous bucket-per-credentials format to current format', () => {
        const old = {
            buckets: [
                {
                    aws_region: 'us-east-1',
                    aws_access_key_id: 'AKID',
                    aws_secret_access_key: 'secret',
                    bucket: 'my-bucket',
                    prefix: 'emails/',
                },
            ],
        }
        const result = migrateLegacyConfig(old)
        expect(result?.credentials).toHaveLength(1)
        expect(result?.credentials[0].aws_access_key_id).toBe('AKID')
        expect(result?.credentials[0].buckets[0].bucket).toBe('my-bucket')
    })

    it('converts the flat legacy single-bucket format to current format', () => {
        const legacy = {
            aws_region: 'us-east-1',
            bucket: 'my-bucket',
            aws_access_key_id: 'AKID',
            aws_secret_access_key: 'secret',
        }
        const result = migrateLegacyConfig(legacy)
        expect(result?.credentials[0].buckets[0].aws_region).toBe('us-east-1')
        expect(result?.credentials[0].buckets[0].bucket).toBe('my-bucket')
    })

    it('returns null for legacy object missing both aws_region and bucket', () => {
        const broken = { some_other_key: 'value' }
        expect(migrateLegacyConfig(broken)).toBeNull()
    })
})

describe('validateEffectiveConfig', () => {
    function makeConfig(overrides: Partial<EffectiveBucketConfig> = {}): EffectiveBucketConfig {
        return {
            aws_region: 'us-east-1',
            aws_access_key_id: 'AKID',
            aws_secret_access_key: 'secret',
            bucket: 'my-bucket',
            ...overrides,
        }
    }

    it('returns success for a fully valid config', () => {
        const errorRef = ref<string | null>(null)
        const result = validateEffectiveConfig(makeConfig(), errorRef)
        expect(result.result).toBe(true)
    })

    it('fails with missing AWS region message', () => {
        const errorRef = ref<string | null>(null)
        const result = validateEffectiveConfig(makeConfig({ aws_region: '' }), errorRef)
        expect(result.result).toBe(false)
        expect(errorRef.value).toContain('region')
    })

    it('fails with missing credentials message when access key is empty', () => {
        const errorRef = ref<string | null>(null)
        const result = validateEffectiveConfig(makeConfig({ aws_access_key_id: '' }), errorRef)
        expect(result.result).toBe(false)
        expect(errorRef.value).toContain('credentials')
    })

    it('fails with missing credentials message when secret key is empty', () => {
        const errorRef = ref<string | null>(null)
        const result = validateEffectiveConfig(makeConfig({ aws_secret_access_key: '' }), errorRef)
        expect(result.result).toBe(false)
        expect(errorRef.value).toContain('credentials')
    })

    it('fails with missing bucket message when bucket is empty', () => {
        const errorRef = ref<string | null>(null)
        const result = validateEffectiveConfig(makeConfig({ bucket: '' }), errorRef)
        expect(result.result).toBe(false)
        expect(errorRef.value).toContain('bucket')
    })

    it('sets loadingRef to false on failure when provided', () => {
        const errorRef = ref<string | null>(null)
        const loadingRef = ref(true)
        validateEffectiveConfig(makeConfig({ bucket: '' }), errorRef, loadingRef)
        expect(loadingRef.value).toBe(false)
    })
})
