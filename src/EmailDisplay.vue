<template>
    <div>
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
                <template v-for="(header, index) in sortedHeaders" :key="'header-' + index">
                    <dt class="text-neutral-500">{{ header.key }}:</dt>
                    <dd class="ms-2 break-words text-ellipsis">{{ header.value }}</dd>
                </template>
            </dl>
        </details>
        <div class="reset my-2">
            <!-- eslint-disable vue/no-v-html -->
            <div class="prose mx-auto" v-html="processedHtml" />
            <!-- eslint-enable vue/no-v-html -->
        </div>
        <div v-if="downloadableAttachments.length > 0" class="mt-4">
            <h3 class="mb-2 font-semibold">Attachments</h3>
            <ul class="space-y-1">
                <li
                    v-for="(att, index) in downloadableAttachments"
                    :key="index"
                    class="flex items-center gap-2"
                >
                    <span>{{ att.filename || `attachment-${index + 1}` }}</span>
                    <span class="badge badge-sm">{{ att.mimeType }}</span>
                    <button
                        class="btn btn-ghost btn-sm"
                        @click="downloadAttachment(att, index + 1)"
                    >
                        Download
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { type Attachment } from 'postal-mime'
import { type ParsedEmail, attachmentToBase64, isInlineAttachment } from './parser.js'
import { collapseBlockquotes } from './quoteCollapser.js'
import EmailAddress from './EmailAddress.vue'

interface Props {
    email: ParsedEmail
}

const props = defineProps<Props>()

const processedHtml = computed(() =>
    collapseBlockquotes(props.email.html || props.email.textAsHtml)
)

const sortedHeaders = computed(() =>
    (props.email.headers || []).slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
)

const downloadableAttachments = computed(() =>
    props.email.attachments.filter((att) => !isInlineAttachment(att, props.email.html))
)

function downloadAttachment(att: Attachment, n: number): void {
    const base64 = attachmentToBase64(att)
    const byteString = atob(base64)
    const bytes = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i)
    const blob = new Blob([bytes], { type: att.mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = att.filename || `attachment-${n}`
    a.click()
    URL.revokeObjectURL(url)
}
</script>
