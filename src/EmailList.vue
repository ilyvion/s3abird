<template>
    <div>
        <h2 class="text-2xl font-semibold">Inbox</h2>

        <Filters class="mb-3" />

        <div v-if="error" class="alert alert-error text-error-content font-semibold">
            Error: {{ error }}
        </div>
        <table v-if="!(emails?.length > 0) && loading" class="table-hover table">
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
        <h3 v-if="!loading && emails && emails.length == 0" class="text-neutral-500">
            There's nothing in here
        </h3>
        <table v-if="emails && emails.length > 0" class="block md:table">
            <thead class="hidden md:table-header-group">
                <tr>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody class="block md:table-row-group">
                <tr
                    v-for="email in emails"
                    :key="email.key"
                    class="hover:bg-base-300 max-md:border-b-base-content/5 block cursor-pointer max-md:border-b max-md:py-2 max-md:shadow-sm max-md:last:border-b-0 md:table-row"
                    @click="openEmail(email)"
                >
                    <td
                        class="block truncate max-md:font-semibold md:table-cell"
                        style="max-width: 300px"
                    >
                        <EmailAddress :address="email.from" />
                    </td>
                    <td
                        class="block truncate max-md:text-xs md:table-cell md:w-full md:max-w-[1px] md:min-w-[300px]"
                    >
                        <span class="max-md:font-semibold">{{
                            email.subject || '(no subject)'
                        }}</span
                        ><span class="text-neutral-400"
                            ><span class="max-md:hidden">&nbsp;-&nbsp;</span
                            ><br class="md:hidden" />{{ email.text }}</span
                        >
                    </td>
                    <td class="block text-xs text-nowrap md:table-cell md:text-right">
                        {{ email.date ? new Date(email.date).toLocaleString() : '' }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { S3Client, ListObjectsV2Command, GetObjectCommand, type _Object } from '@aws-sdk/client-s3'
import parser, { type ParsedEmail } from './parser.js'
import Filters from './FilterList.vue'
import EmailAddress from './EmailAddress.vue'
import { validateEffectiveConfig, makeCacheKey, type EffectiveBucketConfig } from './config.js'
import { getCachedEmail, setCachedEmail } from './cache.js'
import { useEmailStore } from './stores/email.js'
import { useConfigStore } from './stores/config.js'

const emailStore = useEmailStore()
const configStore = useConfigStore()

const router = useRouter()

const error = ref<string | null>(null)
const loading = ref(false)

const emails = computed<ParsedEmail[]>(() => emailStore.filteredEmails)

function openEmail(email: ParsedEmail) {
    router.push({ path: `/inbox/${email.key}` })
}

async function loadFromBucket(bucketConfig: EffectiveBucketConfig): Promise<ParsedEmail[]> {
    const errRef = ref<string | null>(null)
    const result = validateEffectiveConfig(bucketConfig, errRef)
    if (!result.result) return []

    const { aws_region, aws_access_key_id, aws_secret_access_key, bucket, prefix } =
        result.validatedConfig

    const s3 = new S3Client({
        region: aws_region,
        credentials: {
            accessKeyId: aws_access_key_id,
            secretAccessKey: aws_secret_access_key,
        },
    })

    const listResponse = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }))

    const sorted = (listResponse.Contents ?? [])
        .filter((obj): obj is _Object & { LastModified: Date } => obj.LastModified instanceof Date)
        .sort((a, b) => b.LastModified.getTime() - a.LastModified.getTime())

    return Promise.all(
        sorted.map(async (item) => {
            if (!item.Key) throw new Error('Missing key')

            const cacheKey = makeCacheKey(bucketConfig, item.Key)
            const cached = await getCachedEmail(cacheKey)
            if (cached) return cached

            const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: item.Key }))
            const body: ReadableStream | undefined = res.Body?.transformToWebStream()
            if (!body) throw new Error('No body in response')
            const parsed = await parser(body, cacheKey)
            await setCachedEmail(cacheKey, parsed)
            return parsed
        })
    )
}

async function loadEmails() {
    const activeBucket = configStore.activeBucket
    if (!activeBucket) {
        loading.value = false
        return
    }

    error.value = null
    loading.value = true

    try {
        emailStore.updateEmails(await loadFromBucket(activeBucket))
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
        loadEmails()
    }
)
</script>
