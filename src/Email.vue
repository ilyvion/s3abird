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
        <div class="reset my-2">
            <div class="prose mx-auto" v-html="email.html || email.textAsHtml"></div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import parser, { type ParsedEmail } from './parser.js'
import type { Address } from 'postal-mime'
import EmailAddress from './EmailAddress.vue'
import { key as injectionKey } from './store'
import { validateAwsConfig } from './config.js'

const props = defineProps<{
    messageId: string
}>()

const store = useStore(injectionKey)

const email = ref<ParsedEmail | undefined>(store.state.emails.get(props.messageId))
const error = ref<string | null>(null)

const key = computed(() => atob(props.messageId))
const config = computed(() => store.state.config)

onMounted(async () => {
    if (email.value) {
        // email already loaded
        return
    }

    if (!config.value) {
        error.value = 'Missing settings'
        return
    }

    const result = validateAwsConfig(config.value, error)
    if (!result.result) {
        return
    }
    const { aws_region, aws_access_key_id, aws_secret_access_key, bucket } = result.validatedConfig

    const s3 = new S3Client({
        region: aws_region,
        credentials: {
            accessKeyId: aws_access_key_id,
            secretAccessKey: aws_secret_access_key,
        },
    })

    try {
        const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key.value }))
        email.value = await parser(res.Body, btoa(key.value))
    } catch (err: any) {
        error.value = err.message || 'Unknown error while loading email'
    }
})
</script>
