import { ref } from 'vue'
import {
    type S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
    type _Object,
} from '@aws-sdk/client-s3'
import parser, { extractMeta, applyFormattedDate } from './parser.js'
import { validateEffectiveConfig, makeCacheKey, type EffectiveBucketConfig } from './config.js'
import {
    getCachedEmail,
    setCachedEmail,
    setEmailMeta,
    getAllEmailMetas,
    evictStaleEntries,
    getReadKeys,
} from './cache.js'
import { useEmailStore } from './stores/email.js'
import { useConfigStore } from './stores/config.js'
import { getS3Client, filterAndSortByDate } from './s3Utils.js'

const CONCURRENCY_LIMIT = 10

async function listAllObjects(
    s3: S3Client,
    bucket: string,
    prefix: string | undefined
): Promise<_Object[]> {
    const objects: _Object[] = []
    let continuationToken: string | undefined

    do {
        const response = await s3.send(
            new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            })
        )
        objects.push(...(response.Contents ?? []))
        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
    } while (continuationToken)

    return objects
}

async function fetchInBatches<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: T[] = []
    for (let i = 0; i < tasks.length; i += limit) {
        results.push(...(await Promise.all(tasks.slice(i, i + limit).map((t) => t()))))
    }
    return results
}

export function useInboxLoader() {
    const emailStore = useEmailStore()
    const configStore = useConfigStore()
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function loadFromBucket(bucketConfig: EffectiveBucketConfig): Promise<void> {
        const errRef = ref<string | null>(null)
        const result = validateEffectiveConfig(bucketConfig, errRef)
        if (!result.result) throw new Error(errRef.value ?? 'Invalid bucket configuration')

        const { aws_region, aws_access_key_id, aws_secret_access_key, bucket, prefix } =
            result.validatedConfig

        const s3 = getS3Client(aws_region, aws_access_key_id, aws_secret_access_key)

        const [sorted] = await Promise.all([
            listAllObjects(s3, bucket, prefix).then(filterAndSortByDate),
            evictStaleEntries(),
        ])

        const s3Index = sorted
            .filter((item) => !!item.Key)
            .map((item) => ({ s3Key: item.Key!, cacheKey: makeCacheKey(bucketConfig, item.Key!) }))
        emailStore.setS3Index(s3Index)
        emailStore.setReadKeys(await getReadKeys())

        const cachedMetas = await getAllEmailMetas()
        const cachedMetaKeys = new Set(cachedMetas.map((m) => m.key))
        emailStore.setEmailMetas(cachedMetas.map(applyFormattedDate))

        const uncached = s3Index.filter(({ cacheKey }) => !cachedMetaKeys.has(cacheKey))
        const tasks = uncached.map(({ s3Key, cacheKey }) => async () => {
            const cached = await getCachedEmail(cacheKey)
            if (cached) {
                emailStore.addEmailMeta(applyFormattedDate(extractMeta(cached)))
                return
            }

            const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: s3Key }))
            const body: ReadableStream | undefined = res.Body?.transformToWebStream()
            if (!body) throw new Error(`No body in response for ${s3Key}`)
            const parsed = await parser(body, cacheKey)
            const meta = extractMeta(parsed)
            await setCachedEmail(cacheKey, parsed)
            await setEmailMeta(cacheKey, meta)
            emailStore.addEmailMeta(applyFormattedDate(meta))
        })

        await fetchInBatches(tasks, CONCURRENCY_LIMIT)
    }

    async function loadEmails(force = false): Promise<void> {
        const activeBucket = configStore.activeBucket
        if (!activeBucket) {
            loading.value = false
            return
        }

        if (!force && emailStore.s3Index.length > 0) return

        error.value = null
        loading.value = true

        try {
            await loadFromBucket(activeBucket)
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Unknown error while loading emails'
        } finally {
            loading.value = false
        }
    }

    return { loading, error, loadEmails }
}
