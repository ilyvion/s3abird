<script lang="ts" setup>
import EmailAddress from './EmailAddress.vue'
</script>
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

<script lang="ts">
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import parser, { type ParsedEmail } from './parser.js'
import { defineComponent } from 'vue'

interface Data {
    email: ParsedEmail | undefined
    error: string | null
}
export default defineComponent({
    name: 'Email',
    props: {
        messageId: {
            type: String,
            required: true,
        },
    },
    data: function (): Data {
        return {
            email: this.$store.state.emails.get(this.messageId),
            error: null,
        }
    },
    computed: {
        key: function () {
            return atob(this.messageId)
        },
        config: function () {
            return this.$store.state.config
        },
    },
    created: function () {
        if (this.email) {
            // email already loaded
            return
        }
        if (!this.config) {
            this.error = 'Missing settings'
            return
        }

        if (!this.config.aws_region) {
            this.error = 'Missing AWS region in settings'
            return
        }
        if (!this.config.aws_access_key_id || !this.config.aws_secret_access_key) {
            this.error = 'Please set AWS credentials in settings'
            return
        }
        if (!this.config.bucket) {
            this.error = 'Missing bucket name in settings'
            return
        }

        const s3 = new S3Client({
            region: this.config.aws_region,
            credentials: {
                accessKeyId: this.config.aws_access_key_id,
                secretAccessKey: this.config.aws_secret_access_key,
            },
        })

        s3.send(
            new GetObjectCommand({
                Bucket: this.config.bucket,
                Key: this.key,
            })
        )
            .then((msg) => {
                return parser(msg.Body)
            })
            .then((parsed) => {
                this.email = parsed
            })
    },
})
</script>
