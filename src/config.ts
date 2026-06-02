import type { Ref } from 'vue'

export interface AwsBucketEntry {
    label?: string
    aws_region: string
    bucket: string
    prefix?: string
}

export interface AwsCredentials {
    label?: string
    aws_access_key_id: string
    aws_secret_access_key: string
    buckets: AwsBucketEntry[]
}

export interface AwsConfig {
    credentials: AwsCredentials[]
}

export interface EffectiveBucketConfig {
    label?: string
    aws_region: string
    aws_access_key_id: string
    aws_secret_access_key: string
    bucket: string
    prefix?: string
}

export function flattenBuckets(config: AwsConfig): EffectiveBucketConfig[] {
    return config.credentials.flatMap((cred) =>
        cred.buckets.map((b) => ({
            label: b.label ?? cred.label,
            aws_region: b.aws_region,
            aws_access_key_id: cred.aws_access_key_id,
            aws_secret_access_key: cred.aws_secret_access_key,
            bucket: b.bucket,
            prefix: b.prefix,
        }))
    )
}

export function migrateLegacyConfig(raw: unknown): AwsConfig | null {
    if (!raw || typeof raw !== 'object') return null
    const obj = raw as Record<string, unknown>

    // Current format
    if ('credentials' in obj && Array.isArray(obj.credentials)) {
        return obj as unknown as AwsConfig
    }

    // Previous format: { buckets: AwsBucketConfig[] } where each had its own credentials
    if ('buckets' in obj && Array.isArray(obj.buckets)) {
        type PrevBucket = {
            label?: string
            aws_region: string
            aws_access_key_id: string
            aws_secret_access_key: string
            bucket: string
            prefix?: string
        }
        return {
            credentials: (obj.buckets as PrevBucket[]).map((b) => ({
                label: b.label,
                aws_access_key_id: b.aws_access_key_id,
                aws_secret_access_key: b.aws_secret_access_key,
                buckets: [
                    {
                        label: b.label,
                        aws_region: b.aws_region,
                        bucket: b.bucket,
                        prefix: b.prefix,
                    },
                ],
            })),
        }
    }

    // Legacy format: flat single-bucket config
    type LegacyConfig = {
        aws_region?: string
        aws_access_key_id?: string
        aws_secret_access_key?: string
        bucket?: string
        prefix?: string
    }
    const legacy = obj as LegacyConfig
    if (!legacy.aws_region && !legacy.bucket) return null

    return {
        credentials: [
            {
                aws_access_key_id: legacy.aws_access_key_id ?? '',
                aws_secret_access_key: legacy.aws_secret_access_key ?? '',
                buckets: [
                    {
                        aws_region: legacy.aws_region ?? '',
                        bucket: legacy.bucket ?? '',
                        prefix: legacy.prefix,
                    },
                ],
            },
        ],
    }
}

export interface ValidatedBucketConfig {
    aws_region: string
    aws_access_key_id: string
    aws_secret_access_key: string
    bucket: string
    prefix?: string
}

type ValidatedResult = { result: true; validatedConfig: ValidatedBucketConfig } | { result: false }

export function validateEffectiveConfig(
    config: EffectiveBucketConfig,
    errorRef: Ref<string | null>,
    loadingRef?: Ref<boolean>
): ValidatedResult {
    const { aws_region, aws_access_key_id, aws_secret_access_key, bucket } = config

    const fail = (msg: string): ValidatedResult => {
        errorRef.value = msg
        if (loadingRef) loadingRef.value = false
        return { result: false }
    }

    if (!aws_region) return fail('Missing AWS region in settings')
    if (!aws_access_key_id || !aws_secret_access_key)
        return fail('Please set AWS credentials in settings')
    if (!bucket) return fail('Missing bucket name in settings')

    return {
        result: true,
        validatedConfig: {
            aws_region,
            aws_access_key_id,
            aws_secret_access_key,
            bucket,
            prefix: config.prefix,
        },
    }
}

export function makeCacheKey(config: EffectiveBucketConfig, s3Key: string): string {
    const bytes = new TextEncoder().encode(`${config.aws_region}|${config.bucket}|${s3Key}`)
    // This is fine because the maximum length of bytes is 4,181 bytes:
    // * Max S3 key: 1,024 UTF-8 bytes. Even the most Unicode-dense path (all 4-byte codepoints)
    //   gives ~4,096 encoded bytes. Add region (~20 bytes) and bucket (~63 bytes) and you're at
    //   ~4,181 bytes absolute maximum.
    // * V8's argument count limit is 65,536.
    return btoa(String.fromCharCode(...bytes))
}

export function decodeCacheKey(
    cacheKey: string
): { aws_region: string; bucket: string; s3Key: string } | null {
    try {
        const decoded = new TextDecoder().decode(
            Uint8Array.from(atob(cacheKey), (c) => c.charCodeAt(0))
        )
        const parts = decoded.split('|')
        if (parts.length < 3) return null
        const [aws_region, bucket, ...keyParts] = parts
        return { aws_region, bucket, s3Key: keyParts.join('|') }
    } catch {
        return null
    }
}
