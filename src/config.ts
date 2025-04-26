import type { Ref } from 'vue'

export interface AwsConfig {
    aws_region?: string
    aws_access_key_id?: string
    aws_secret_access_key?: string
    bucket?: string
    prefix?: string
}

export interface ValidatedAwsConfig {
    aws_region: string
    aws_access_key_id: string
    aws_secret_access_key: string
    bucket: string
    prefix?: string
}

type ValidatedAwsConfigResult =
    | { result: true; validatedConfig: ValidatedAwsConfig }
    | { result: false }

export function validateAwsConfig(
    config: AwsConfig | undefined,
    errorRef: Ref<string | null>,
    loadingRef?: Ref<boolean>
): ValidatedAwsConfigResult {
    if (!config) {
        errorRef.value = 'Missing settings'
        if (loadingRef) {
            loadingRef.value = false
        }
        return { result: false }
    }

    const { aws_region, aws_access_key_id, aws_secret_access_key, bucket } = config

    if (!aws_region) {
        errorRef.value = 'Missing AWS region in settings'
        if (loadingRef) {
            loadingRef.value = false
        }
        return { result: false }
    }

    if (!aws_access_key_id || !aws_secret_access_key) {
        errorRef.value = 'Please set AWS credentials in settings'
        if (loadingRef) {
            loadingRef.value = false
        }
        return { result: false }
    }

    if (!bucket) {
        errorRef.value = 'Missing bucket name in settings'
        if (loadingRef) {
            loadingRef.value = false
        }
        return { result: false }
    }

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
