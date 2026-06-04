<template>
    <button v-bind="$attrs" class="btn btn-ghost gap-1" @click="openModal">
        <i class="fas fa-cog" />
        Settings
        <span v-if="totalBuckets > 0" class="badge badge-sm badge-primary">{{ totalBuckets }}</span>
    </button>

    <dialog ref="modalRef" class="modal">
        <div class="modal-box w-11/12 max-w-2xl">
            <h3 class="mb-4 text-lg font-bold">AWS Settings</h3>

            <!-- Credential + bucket list -->
            <div v-if="mode.type === 'list'" class="flex flex-col gap-3">
                <p v-if="credentials.length === 0" class="text-neutral-500">
                    No credentials configured. Add one to get started.
                </p>

                <div
                    v-for="(cred, ci) in credentials"
                    :key="ci"
                    class="border-base-300 bg-base-200 rounded border"
                >
                    <!-- Credential header -->
                    <div class="flex items-center gap-2 p-3">
                        <div class="min-w-0 flex-grow">
                            <div class="truncate font-semibold">
                                {{ cred.label || cred.aws_access_key_id }}
                            </div>
                            <div class="text-sm text-neutral-500">
                                {{ cred.buckets.length }}
                                {{ cred.buckets.length === 1 ? 'bucket' : 'buckets' }}
                            </div>
                        </div>
                        <button
                            class="btn btn-ghost btn-sm"
                            type="button"
                            @click="startEditCredential(ci)"
                        >
                            <i class="fas fa-edit" />
                        </button>
                        <button
                            class="btn btn-ghost btn-sm text-error"
                            type="button"
                            @click="removeCredential(ci)"
                        >
                            <i class="fas fa-trash" />
                        </button>
                    </div>

                    <!-- Bucket list under credential -->
                    <div class="border-base-300 border-t">
                        <div
                            v-for="(b, bi) in cred.buckets"
                            :key="bi"
                            class="border-base-300 flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
                        >
                            <div class="min-w-0 flex-grow pl-3">
                                <div class="truncate text-sm font-medium">
                                    {{ b.label || b.bucket }}
                                </div>
                                <div class="truncate text-xs text-neutral-500">
                                    {{ b.aws_region }} &bull; {{ b.bucket
                                    }}{{ b.prefix ? '/' + b.prefix : '' }}
                                </div>
                            </div>
                            <button
                                class="btn btn-ghost btn-xs"
                                type="button"
                                @click="startEditBucket(ci, bi)"
                            >
                                <i class="fas fa-edit" />
                            </button>
                            <button
                                class="btn btn-ghost btn-xs text-error"
                                type="button"
                                @click="removeBucket(ci, bi)"
                            >
                                <i class="fas fa-trash" />
                            </button>
                        </div>
                        <div class="p-2 pl-6">
                            <button
                                class="btn btn-ghost btn-xs"
                                type="button"
                                @click="startAddBucket(ci)"
                            >
                                <i class="fas fa-plus" /> Add bucket
                            </button>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap gap-2">
                    <button
                        class="btn btn-primary btn-sm"
                        type="button"
                        @click="startAddCredential"
                    >
                        <i class="fas fa-plus" /> Add Credentials
                    </button>
                    <button class="btn btn-ghost btn-sm" type="button" @click="openWizard">
                        <i class="fas fa-magic" /> Use Setup Wizard
                    </button>
                </div>
            </div>

            <!-- Credential form -->
            <form
                v-else-if="mode.type === 'credential'"
                class="flex flex-col gap-3"
                @submit.prevent="saveCredential"
            >
                <h4 class="font-semibold">
                    {{ mode.index === -1 ? 'Add Credentials' : 'Edit Credentials' }}
                </h4>
                <label class="floating-label">
                    <input
                        v-model="credForm.label"
                        class="input w-full"
                        placeholder="Label (optional)"
                    />
                    <span>Label (optional)</span>
                </label>
                <label class="floating-label">
                    <input
                        v-model="credForm.aws_access_key_id"
                        class="input w-full"
                        type="password"
                        placeholder="AWS Access Key ID"
                        required
                    />
                    <span>AWS Access Key ID</span>
                </label>
                <label class="floating-label">
                    <input
                        v-model="credForm.aws_secret_access_key"
                        class="input w-full"
                        type="password"
                        placeholder="AWS Secret Access Key"
                        required
                    />
                    <span>AWS Secret Access Key</span>
                </label>
                <div class="flex gap-2">
                    <button class="btn btn-primary" type="submit">
                        {{ mode.index === -1 ? 'Add' : 'Save' }}
                    </button>
                    <button class="btn" type="button" @click="goToList">Cancel</button>
                </div>
            </form>

            <!-- Bucket form -->
            <form
                v-else-if="mode.type === 'bucket'"
                class="flex flex-col gap-3"
                @submit.prevent="saveBucket"
            >
                <h4 class="font-semibold">
                    {{ mode.bucketIndex === -1 ? 'Add Bucket' : 'Edit Bucket' }}
                </h4>
                <label class="floating-label">
                    <input
                        v-model="bucketForm.label"
                        class="input w-full"
                        placeholder="Label (optional)"
                    />
                    <span>Label (optional)</span>
                </label>
                <label class="floating-label">
                    <input
                        v-model="bucketForm.aws_region"
                        class="input w-full"
                        placeholder="AWS Region"
                        required
                    />
                    <span>AWS Region</span>
                </label>
                <label class="floating-label">
                    <input
                        v-model="bucketForm.bucketPath"
                        class="input w-full"
                        placeholder="S3 Bucket or bucket/prefix"
                        required
                    />
                    <span>S3 Bucket</span>
                </label>
                <div class="flex gap-2">
                    <button class="btn btn-primary" type="submit">
                        {{ mode.bucketIndex === -1 ? 'Add' : 'Save' }}
                    </button>
                    <button class="btn" type="button" @click="goToList">Cancel</button>
                </div>
            </form>

            <div v-if="mode.type === 'list'" class="modal-action">
                <button class="btn" type="button" @click="closeModal">Close</button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button>close</button>
        </form>
    </dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import type { AwsCredentials, AwsBucketEntry } from './config'
import { useConfigStore } from './stores/config'

defineOptions({ inheritAttrs: false })

type Mode =
    | { type: 'list' }
    | { type: 'credential'; index: number }
    | { type: 'bucket'; credentialIndex: number; bucketIndex: number }

const configStore = useConfigStore()
const router = useRouter()
const modalRef = ref<HTMLDialogElement | null>(null)
const mode = ref<Mode>({ type: 'list' })

const credentials = computed(() => configStore.config?.credentials ?? [])
const totalBuckets = computed(() => configStore.allBuckets.length)

const credForm = reactive({ label: '', aws_access_key_id: '', aws_secret_access_key: '' })
const bucketForm = reactive({ label: '', aws_region: '', bucketPath: '' })

function openModal() {
    mode.value = { type: 'list' }
    modalRef.value?.showModal()
}

function closeModal() {
    modalRef.value?.close()
}

function goToList() {
    mode.value = { type: 'list' }
}

function openWizard() {
    closeModal()
    void router.push('/setup/add')
}

function startAddCredential() {
    credForm.label = ''
    credForm.aws_access_key_id = ''
    credForm.aws_secret_access_key = ''
    mode.value = { type: 'credential', index: -1 }
}

function startEditCredential(index: number) {
    const cred = credentials.value[index]
    credForm.label = cred.label ?? ''
    credForm.aws_access_key_id = cred.aws_access_key_id
    credForm.aws_secret_access_key = cred.aws_secret_access_key
    mode.value = { type: 'credential', index }
}

function saveCredential() {
    if (mode.value.type !== 'credential') return
    const newCreds = [...credentials.value]
    if (mode.value.index === -1) {
        const entry: AwsCredentials = {
            label: credForm.label || undefined,
            aws_access_key_id: credForm.aws_access_key_id,
            aws_secret_access_key: credForm.aws_secret_access_key,
            buckets: [],
        }
        newCreds.push(entry)
    } else {
        const existing = newCreds[mode.value.index]
        newCreds[mode.value.index] = {
            ...existing,
            label: credForm.label || undefined,
            aws_access_key_id: credForm.aws_access_key_id,
            aws_secret_access_key: credForm.aws_secret_access_key,
        }
    }
    configStore.updateConfig({ credentials: newCreds })
    mode.value = { type: 'list' }
}

function removeCredential(index: number) {
    const newCreds = credentials.value.filter((_, i) => i !== index)
    configStore.updateConfig({ credentials: newCreds })
}

function startAddBucket(credentialIndex: number) {
    bucketForm.label = ''
    bucketForm.aws_region = ''
    bucketForm.bucketPath = ''
    mode.value = { type: 'bucket', credentialIndex, bucketIndex: -1 }
}

function startEditBucket(credentialIndex: number, bucketIndex: number) {
    const b = credentials.value[credentialIndex].buckets[bucketIndex]
    bucketForm.label = b.label ?? ''
    bucketForm.aws_region = b.aws_region
    bucketForm.bucketPath = b.prefix ? `${b.bucket}/${b.prefix}` : b.bucket
    mode.value = { type: 'bucket', credentialIndex, bucketIndex }
}

function saveBucket() {
    if (mode.value.type !== 'bucket') return
    const { credentialIndex, bucketIndex } = mode.value
    const [bucketName, ...prefixParts] = bucketForm.bucketPath.split('/')
    const entry: AwsBucketEntry = {
        label: bucketForm.label || undefined,
        aws_region: bucketForm.aws_region,
        bucket: bucketName,
        prefix: prefixParts.length > 0 ? prefixParts.join('/') : undefined,
    }
    const newCreds = credentials.value.map((cred, ci) => {
        if (ci !== credentialIndex) return cred
        const newBuckets = [...cred.buckets]
        if (bucketIndex === -1) {
            newBuckets.push(entry)
        } else {
            newBuckets[bucketIndex] = entry
        }
        return { ...cred, buckets: newBuckets }
    })
    configStore.updateConfig({ credentials: newCreds })
    mode.value = { type: 'list' }
}

function removeBucket(credentialIndex: number, bucketIndex: number) {
    const newCreds = credentials.value.map((cred, ci) => {
        if (ci !== credentialIndex) return cred
        return { ...cred, buckets: cred.buckets.filter((_, bi) => bi !== bucketIndex) }
    })
    configStore.updateConfig({ credentials: newCreds })
}
</script>
