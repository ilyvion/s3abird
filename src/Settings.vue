<template>
    <form class="flex gap-2" @submit.prevent="updateConfig">
        <label class="floating-label">
            <input
                class="input"
                placeholder="AWS Region"
                aria-label="AWS Region"
                v-model="config.aws_region"
            />
            <span>AWS Region</span>
        </label>
        <label class="floating-label">
            <input class="input" placeholder="S3 Bucket" aria-label="S3 Bucket" v-model="bucket" />
            <span>S3 Bucket</span>
        </label>
        <label class="floating-label">
            <input
                class="input"
                type="password"
                placeholder="AWS Access Key Id"
                aria-label="AWS Access Key Id"
                v-model="config.aws_access_key_id"
            />
            <span>AWS Access Key Id</span>
        </label>
        <label class="floating-label">
            <input
                class="input"
                type="password"
                placeholder="AWS Secret Access Key"
                aria-label="AWS Secret Access Key"
                v-model="config.aws_secret_access_key"
            />
            <span>AWS Access Key Id</span>
        </label>
        <button class="btn btn-primary" type="submit">Save config</button>
    </form>
</template>

<script lang="ts">
export default {
    name: 'Settings',
    data: function () {
        return {
            config: this.$store.state.config || {},
        }
    },
    computed: {
        bucket: {
            get() {
                if (this.config.prefix) return `${this.config.bucket}/${this.config.prefix}`
                return this.config.bucket
            },
            set(val: string) {
                const [bucket, prefix] = val.split(/\/(.+)/)
                this.config.bucket = bucket
                this.config.prefix = prefix
            },
        },
    },
    methods: {
        updateConfig: function () {
            this.$store.commit('updateConfig', { ...this.config })
        },
    },
}
</script>
