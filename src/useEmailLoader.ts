import { ref, onMounted } from 'vue'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import parser, { type ParsedEmail } from './parser.js'
import { validateEffectiveConfig, decodeCacheKey } from './config.js'
import { getCachedEmail, setCachedEmail } from './cache.js'
import { getS3Client } from './s3Utils.js'
import { useConfigStore } from './stores/config.js'
import { useEmailStore } from './stores/email.js'

export function useEmailLoader(messageId: string) {
    const configStore = useConfigStore()
    const emailStore = useEmailStore()

    const email = ref<ParsedEmail | undefined>()
    const error = ref<string | null>(null)

    onMounted(async () => {
        if (configStore.allBuckets.length === 0) {
            error.value = 'Missing settings'
            return
        }

        const info = decodeCacheKey(messageId)
        if (!info) {
            error.value = 'Invalid email ID'
            return
        }

        const bucketConfig = configStore.allBuckets.find(
            (b) => b.aws_region === info.aws_region && b.bucket === info.bucket
        )
        if (!bucketConfig) {
            error.value = 'Bucket configuration not found'
            return
        }

        const result = validateEffectiveConfig(bucketConfig, error)
        if (!result.result) return

        const { aws_region, aws_access_key_id, aws_secret_access_key, bucket } =
            result.validatedConfig

        const cached = await getCachedEmail(messageId)
        if (cached) {
            email.value = cached
            await emailStore.markRead(messageId)
            return
        }

        const s3 = getS3Client(aws_region, aws_access_key_id, aws_secret_access_key)

        try {
            const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: info.s3Key }))
            const body: ReadableStream | undefined = res.Body?.transformToWebStream()
            if (!body) {
                error.value = 'No body in response'
                return
            }
            const parsed = await parser(body, messageId)
            await setCachedEmail(messageId, parsed)
            email.value = parsed
            await emailStore.markRead(messageId)
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error while loading email'
        }
    })

    return { email, error }
}
