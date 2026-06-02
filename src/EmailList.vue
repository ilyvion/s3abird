<template>
    <div>
        <div class="mb-1 flex items-center gap-2">
            <h2 class="text-2xl font-semibold">Inbox</h2>
            <button
                class="btn btn-ghost btn-sm"
                :class="{ 'animate-spin': loading }"
                :disabled="loading"
                aria-label="Refresh inbox"
                title="Refresh inbox"
                @click="loadEmails(true)"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                </svg>
            </button>
        </div>

        <Filters class="mb-3" />

        <div v-if="error" class="alert alert-error text-error-content font-semibold">
            Error: {{ error }}
        </div>
        <table v-if="!(pagedMeta?.length > 0) && loading" class="table-hover table">
            <tbody>
                <tr v-for="index in 10" :key="index">
                    <td class="truncate" style="max-width: 300px">
                        <div class="skeleton h-6 w-64" />
                    </td>
                    <td class="truncate" style="width: 100%; min-width: 300px; max-width: 1px">
                        <div class="flex gap-2">
                            <div class="skeleton h-6 w-full flex-1" />
                            <div class="skeleton h-6 w-full flex-1/3" />
                        </div>
                    </td>
                    <td class="text-muted text-right text-nowrap">
                        <div class="skeleton h-6 w-32" />
                    </td>
                </tr>
            </tbody>
        </table>
        <h3 v-if="!loading && pagedMeta && pagedMeta.length == 0" class="text-neutral-500">
            There's nothing in here
        </h3>
        <table v-if="pagedMeta && pagedMeta.length > 0" class="block md:table">
            <thead class="hidden md:table-header-group">
                <tr>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody class="block md:table-row-group">
                <tr
                    v-for="meta in pagedMeta"
                    :key="meta.key"
                    class="hover:bg-base-300 max-md:border-b-base-content/5 block cursor-pointer max-md:border-b max-md:py-2 max-md:shadow-sm max-md:last:border-b-0 md:table-row"
                    @click="openEmail(meta)"
                >
                    <td
                        class="block truncate max-md:font-semibold md:table-cell"
                        style="max-width: 300px"
                    >
                        <EmailAddress :address="meta.from" />
                    </td>
                    <td
                        class="block truncate max-md:text-xs md:table-cell md:w-full md:max-w-[1px] md:min-w-[300px]"
                    >
                        <span class="max-md:font-semibold">{{
                            meta.subject || '(no subject)'
                        }}</span
                        ><span class="text-neutral-400"
                            ><span class="max-md:hidden">&nbsp;-&nbsp;</span
                            ><br class="md:hidden" />{{ meta.textPreview }}</span
                        >
                    </td>
                    <td class="block text-xs text-nowrap md:table-cell md:text-right">
                        {{ meta.formattedDate }}
                    </td>
                </tr>
            </tbody>
        </table>
        <div v-if="numPages > 1" class="join mt-4 flex justify-center">
            <button class="join-item btn" :disabled="currentPage <= 1" @click="currentPage--">
                «
            </button>
            <button class="join-item btn pointer-events-none">
                Page {{ currentPage }} of {{ numPages }}
            </button>
            <button
                class="join-item btn"
                :disabled="currentPage >= numPages"
                @click="currentPage++"
            >
                »
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { S3Client, ListObjectsV2Command, GetObjectCommand, type _Object } from '@aws-sdk/client-s3'
import parser, { extractMeta, applyFormattedDate, type EmailMeta } from './parser.js'
import Filters from './FilterList.vue'
import EmailAddress from './EmailAddress.vue'
import { validateEffectiveConfig, makeCacheKey, type EffectiveBucketConfig } from './config.js'
import {
    getCachedEmail,
    setCachedEmail,
    setEmailMeta,
    getAllEmailMetas,
    evictStaleEntries,
} from './cache.js'
import { useEmailStore } from './stores/email.js'
import { useConfigStore } from './stores/config.js'
import { filterAndSortByDate, getPage, totalPages, PAGE_SIZE } from './s3Utils.js'

const CONCURRENCY_LIMIT = 10

const emailStore = useEmailStore()
const configStore = useConfigStore()

const router = useRouter()

const error = ref<string | null>(null)
const loading = ref(false)
const currentPage = ref(1)

const filteredIndex = computed(() => emailStore.filteredIndex)
const numPages = computed(() => totalPages(filteredIndex.value.length, PAGE_SIZE))
const pagedMeta = computed<EmailMeta[]>(() => {
    const page = getPage(filteredIndex.value, currentPage.value, PAGE_SIZE)
    return page
        .map(({ cacheKey }) => emailStore.emailMeta.get(cacheKey))
        .filter((m): m is EmailMeta => m !== undefined)
})

watch(filteredIndex, () => {
    currentPage.value = 1
})

function openEmail(meta: EmailMeta) {
    router.push({ path: `/inbox/${meta.key}` })
}

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

async function loadFromBucket(bucketConfig: EffectiveBucketConfig): Promise<void> {
    const errRef = ref<string | null>(null)
    const result = validateEffectiveConfig(bucketConfig, errRef)
    if (!result.result) throw new Error(errRef.value ?? 'Invalid bucket configuration')

    const { aws_region, aws_access_key_id, aws_secret_access_key, bucket, prefix } =
        result.validatedConfig

    const s3 = new S3Client({
        region: aws_region,
        credentials: {
            accessKeyId: aws_access_key_id,
            secretAccessKey: aws_secret_access_key,
        },
    })

    await evictStaleEntries()
    const sorted = filterAndSortByDate(await listAllObjects(s3, bucket, prefix))

    const s3Index = sorted
        .filter((item) => !!item.Key)
        .map((item) => ({ s3Key: item.Key!, cacheKey: makeCacheKey(bucketConfig, item.Key!) }))
    emailStore.setS3Index(s3Index)

    // Load all cached metadata into the store immediately so the list renders without waiting
    const cachedMetas = await getAllEmailMetas()
    const cachedMetaKeys = new Set(cachedMetas.map((m) => m.key))
    emailStore.setEmailMetas(cachedMetas.map(applyFormattedDate))

    // Fetch uncached emails in concurrency-limited batches; add each to the store as it arrives
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

async function loadEmails(force = false) {
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
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : 'Unknown error while loading emails'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    if (configStore.activeBucket) loadEmails()
})

watch(
    () => configStore.activeBucket,
    () => {
        loadEmails(true)
    }
)
</script>
