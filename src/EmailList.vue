<script lang="ts" setup>
import EmailAddress from './EmailAddress.vue'
</script>
<template>
    <div>
        <h2 class="text-2xl font-semibold">Inbox</h2>

        <Filters class="mb-3"></Filters>

        <div class="alert alert-error text-error-content font-semibold" v-if="error">
            Error: {{ error }}
        </div>
        <table class="table-hover table" v-if="!(emails?.length > 0) && loading">
            <tbody>
                <tr v-for="index in 10" :key="index">
                    <td class="truncate" style="max-width: 300px">
                        <div class="skeleton h-6 w-64"></div>
                    </td>
                    <td class="truncate" style="width: 100%; min-width: 300px; max-width: 1px">
                        <div class="flex gap-2">
                            <div class="skeleton h-6 w-full flex-1"></div>
                            <div class="skeleton h-6 w-full flex-1/3"></div>
                        </div>
                    </td>
                    <td class="text-muted text-right text-nowrap">
                        <div class="skeleton h-6 w-32"></div>
                    </td>
                </tr>
            </tbody>
        </table>
        <h3 class="text-neutral-500" v-if="!loading && emails && emails.length == 0">
            There's nothing in here
        </h3>
        <table class="block md:table" v-if="emails && emails.length > 0">
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
                    @click="openEmail(email)"
                    class="hover:bg-base-300 block cursor-pointer max-sm:m-2 max-sm:rounded-2xl max-sm:border max-sm:border-neutral-300 max-sm:p-2 max-sm:shadow-sm md:table-row"
                >
                    <td class="block truncate md:table-cell" style="max-width: 300px">
                        <EmailAddress :address="email.from" />
                    </td>
                    <td
                        class="block truncate md:table-cell md:w-full md:max-w-[1px] md:min-w-[300px]"
                    >
                        {{ email.subject || '(no subject)'
                        }}<span class="text-neutral-400">&nbsp;-&nbsp;{{ email.text }}</span>
                    </td>
                    <td class="text-muted block text-nowrap md:table-cell md:text-right">
                        <small>{{ email.date ? new Date(email.date).toLocaleString() : '' }}</small>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts">
import { S3Client, ListObjectsV2Command, GetObjectCommand, type _Object } from '@aws-sdk/client-s3'
import parser, { type ParsedEmail } from './parser.js'
import Filters from './Filters.vue'
import { defineComponent } from 'vue'

interface Data {
    error: string | null
    loading: boolean
}
export default defineComponent({
    name: 'EmailList',
    data: function (): Data {
        return {
            error: null,
            loading: false,
        }
    },
    computed: {
        config: function () {
            return this.$store.state.config
        },
        emails: function (): ParsedEmail[] {
            return this.$store.getters.emails
        },
    },
    methods: {
        openEmail: function (e: ParsedEmail) {
            this.$router.push({ path: `/inbox/${e.key}` })
        },
        loadEmails() {
            if (!this.config) {
                this.loading = false
                return
            }

            if (!this.config.aws_region) {
                this.error = 'Missing AWS region in settings'
                this.loading = false
                return
            }
            if (!this.config.aws_access_key_id || !this.config.aws_secret_access_key) {
                this.error = 'Please set AWS credentials in settings'
                this.loading = false
                return
            }
            if (!this.config.bucket) {
                this.error = 'Missing bucket name in settings'
                this.loading = false
                return
            }

            const s3 = new S3Client({
                region: this.config.aws_region,
                credentials: {
                    accessKeyId: this.config.aws_access_key_id,
                    secretAccessKey: this.config.aws_secret_access_key,
                },
            })

            this.error = null
            this.loading = true
            const config = this.config
            s3.send(
                new ListObjectsV2Command({
                    Bucket: config.bucket,
                    Prefix: config.prefix,
                })
            )
                .then((r) => r.Contents)
                .then((r) =>
                    (r ?? [])
                        .filter(
                            (obj): obj is _Object & { LastModified: Date } =>
                                obj.LastModified instanceof Date
                        )
                        .sort((a, b) => b.LastModified.getTime() - a.LastModified.getTime())
                )
                .then((items) =>
                    Promise.all(
                        items.map((item) =>
                            s3
                                .send(
                                    new GetObjectCommand({
                                        Bucket: config.bucket,
                                        Key: item.Key,
                                    })
                                )
                                .then((msg) => {
                                    return parser(msg.Body)
                                })
                                .then((parsed) => {
                                    // 🔐 guard to satisfy TS — should never really happen
                                    if (!item.Key) throw new Error('Missing key')

                                    parsed.key = btoa(item.Key)
                                    return parsed
                                })
                        )
                    )
                )
                .then((emails) => {
                    this.loading = false
                    this.$store.commit('updateEmails', emails)
                })
                .catch((e) => {
                    this.loading = false
                    this.error = e
                })
        },
    },
    created: function () {
        if (this.config) {
            this.loadEmails()
        }
    },
    watch: {
        config: function (val) {
            this.loadEmails()
        },
    },
    components: {
        Filters,
    },
})
</script>

<!-- <style lang="scss" scoped>
.table {
    font-size: 0.875rem;

    tbody tr {
        cursor: pointer;
    }
}
</style> -->
