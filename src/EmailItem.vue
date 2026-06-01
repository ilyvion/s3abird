<template>
    <div v-if="email">
        <h2 class="text-xl font-bold">{{ email.subject || '(no subject)' }}</h2>
        <ul>
            <li class="font-semibold">From: <EmailAddress :address="email.from" /></li>
            <li>
                <span class="text-neutral-500">To: </span>
                <template v-for="(addr, index) in email.to" :key="'to-' + index">
                    <EmailAddress :address="addr" />
                    <span v-if="email.to && index < email.to.length - 1">, </span>
                </template>
            </li>

            <li v-if="email.cc && email.cc.length > 0">
                <span class="text-neutral-500">CC: </span>
                <template v-for="(addr, index) in email.cc" :key="'cc-' + index">
                    <EmailAddress :address="addr" />
                    <span v-if="email.cc && index < email.cc.length - 1">, </span>
                </template>
            </li>
        </ul>
        <details class="bg-base-100 border-base-300 collapse-arrow collapse block">
            <summary class="collapse-title font-semibold">Additional e-mail headers</summary>
            <dl class="m-2">
                <template v-for="(header, index) in headers" :key="'header-' + index">
                    <dt class="text-neutral-500">{{ header.key }}:</dt>
                    <dd class="ms-2 break-words text-ellipsis">{{ header.value }}</dd>
                </template>
            </dl>
        </details>
        <div class="reset my-2">
            <!-- eslint-disable vue/no-v-html -->
            <div class="prose mx-auto" v-html="email.html || email.textAsHtml" />
            <!-- eslint-enable vue/no-v-html -->
        </div>
    </div>
    <div v-else-if="error" class="alert alert-error text-error-content font-semibold">
        Error: {{ error }}
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import parser, { type ParsedEmail } from './parser.js'
import EmailAddress from './EmailAddress.vue'
import { validateEffectiveConfig, decodeCacheKey } from './config.js'
import { getCachedEmail, setCachedEmail } from './cache.js'
import { useEmailStore } from './stores/email.js'
import { useConfigStore } from './stores/config.js'

const props = defineProps<{
    messageId: string
}>()

const emailStore = useEmailStore()
const configStore = useConfigStore()

const email = ref<ParsedEmail | undefined>(emailStore.emails.get(props.messageId))
const error = ref<string | null>(null)

const headers = computed(() =>
    (email.value?.headers || []).sort((a, b) => a.key.localeCompare(b.key))
)

onMounted(async () => {
    if (email.value) return

    if (configStore.allBuckets.length === 0) {
        error.value = 'Missing settings'
        return
    }

    const info = decodeCacheKey(props.messageId)
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

    const { aws_region, aws_access_key_id, aws_secret_access_key, bucket } = result.validatedConfig

    const cached = await getCachedEmail(props.messageId)
    if (cached) {
        email.value = cached
        return
    }

    const s3 = new S3Client({
        region: aws_region,
        credentials: {
            accessKeyId: aws_access_key_id,
            secretAccessKey: aws_secret_access_key,
        },
    })

    try {
        const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: info.s3Key }))
        const body: ReadableStream | undefined = res.Body?.transformToWebStream()
        if (!body) {
            error.value = 'No body in response'
            return
        }
        const parsed = await parser(body, props.messageId)
        await setCachedEmail(props.messageId, parsed)
        email.value = parsed
    } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : 'Unknown error while loading email'
    }
})
</script>
