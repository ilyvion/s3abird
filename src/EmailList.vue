<script lang="ts" setup>
import EmailAddress from './EmailAddress.vue'
</script>
<template>
    <div>
        <h4>Inbox</h4>

        <Filters class="mb-3"></Filters>

        <div class="alert alert-danger" v-if="error">Error: {{ error }}</div>
        <h5 class="text-secondary" v-if="!emails || loading">Loading...</h5>
        <h5 class="text-secondary" v-if="!loading && emails && emails.length == 0">
            There's nothing in here
        </h5>
        <table class="table table-hover table-responsive-lg">
            <tbody>
                <tr v-for="email in emails" @click="openEmail(email)">
                    <td class="text-truncate" style="max-width: 300px">
                        <EmailAddress :address="email.from" />
                    </td>
                    <td class="text-truncate" style="width: 100%; min-width: 300px; max-width: 1px">
                        {{ email.subject || '(no subject)'
                        }}<span class="text-secondary">&nbsp;-&nbsp;{{ email.text }}</span>
                    </td>
                    <td class="text-nowrap text-muted text-right">
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

<style lang="scss" scoped>
.table {
    font-size: 0.875rem;

    tbody tr {
        cursor: pointer;
    }
}
</style>
