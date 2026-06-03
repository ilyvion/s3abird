<template>
    <div>
        <div class="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div class="flex">
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
            <label class="label cursor-pointer gap-2">
                <span class="text-sm">Group by thread</span>
                <input v-model="groupThreads" type="checkbox" class="toggle toggle-sm" />
            </label>
            <button
                class="btn btn-ghost btn-sm mr-auto text-sm text-neutral-400 sm:mr-0 sm:ml-auto"
                @click="openModal"
            >
                Press <kbd class="kbd kbd-xs">?</kbd> for keyboard shortcuts
            </button>
        </div>

        <Filters class="mb-3" />

        <div class="alert mb-2 flex items-center gap-2">
            <span>{{ selectedKeys.size }} selected</span>
            <button
                v-if="selectedKeys.size > 0"
                class="btn btn-sm btn-primary"
                @click="markSelectedRead"
            >
                Mark as read
            </button>
            <button
                v-if="selectedKeys.size > 0"
                class="btn btn-sm btn-ghost ml-auto"
                @click="clearSelection"
            >
                Clear selection
            </button>
        </div>

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
                    <th>
                        <input
                            ref="selectAllRef"
                            type="checkbox"
                            class="checkbox checkbox-sm"
                            tabindex="-1"
                            @change="toggleSelectAll"
                        />
                    </th>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody class="block md:table-row-group">
                <template v-if="!groupThreads">
                    <tr
                        v-for="(meta, index) in pagedMeta"
                        :key="meta.key"
                        :ref="(el) => setRowRef(el as HTMLElement | null, index)"
                        tabindex="0"
                        class="hover:bg-base-300 max-md:border-b-base-content/5 block cursor-pointer max-md:border-b max-md:py-2 max-md:shadow-sm max-md:last:border-b-0 md:table-row"
                        :class="{
                            'font-semibold': !emailStore.isRead(meta.key),
                            active: selectedIndex === index,
                        }"
                        @click="openEmail(meta)"
                        @focus="selectedIndex = index"
                        @keydown.enter.prevent="openEmail(meta)"
                    >
                        <td class="block md:table-cell" @click.stop>
                            <input
                                type="checkbox"
                                class="checkbox checkbox-sm"
                                :checked="selectedKeys.has(meta.key)"
                                tabindex="-1"
                                @change="toggleSelection(meta.key)"
                            />
                        </td>
                        <td
                            class="block truncate max-md:font-semibold md:table-cell"
                            style="max-width: 300px"
                        >
                            <i
                                :class="
                                    emailStore.isRead(meta.key)
                                        ? 'far fa-envelope-open'
                                        : 'fas fa-envelope'
                                "
                                class="mr-1 text-sm"
                                :aria-label="emailStore.isRead(meta.key) ? 'Read' : 'Unread'"
                            ></i>
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
                </template>
                <template v-else>
                    <tr
                        v-for="(thread, index) in pagedThreads"
                        :key="thread.threadId"
                        :ref="(el) => setRowRef(el as HTMLElement | null, index)"
                        tabindex="0"
                        class="hover:bg-base-300 max-md:border-b-base-content/5 block cursor-pointer max-md:border-b max-md:py-2 max-md:shadow-sm max-md:last:border-b-0 md:table-row"
                        :class="{
                            'font-semibold': !emailStore.isRead(thread.latest.key),
                            active: selectedIndex === index,
                        }"
                        @click="openThread(thread)"
                        @focus="selectedIndex = index"
                        @keydown.enter.prevent="openThread(thread)"
                    >
                        <td class="block md:table-cell" @click.stop>
                            <input
                                v-indeterminate="threadSelectionState(thread) === 'some'"
                                type="checkbox"
                                class="checkbox checkbox-sm"
                                :checked="threadSelectionState(thread) === 'all'"
                                tabindex="-1"
                                @change="toggleThreadSelection(thread)"
                            />
                        </td>
                        <td
                            class="block truncate max-md:font-semibold md:table-cell"
                            style="max-width: 300px"
                        >
                            <i
                                :class="
                                    emailStore.isRead(thread.latest.key)
                                        ? 'far fa-envelope-open'
                                        : 'fas fa-envelope'
                                "
                                class="mr-1 text-sm"
                                :aria-label="
                                    emailStore.isRead(thread.latest.key) ? 'Read' : 'Unread'
                                "
                            ></i>
                            <EmailAddress :address="thread.latest.from" />
                        </td>
                        <td
                            class="block truncate max-md:text-xs md:table-cell md:w-full md:max-w-[1px] md:min-w-[300px]"
                        >
                            <span class="max-md:font-semibold">{{
                                thread.latest.subject || '(no subject)'
                            }}</span>
                            <span
                                v-if="thread.count > 1"
                                class="badge badge-sm ml-1 align-middle"
                                >{{ thread.count }}</span
                            ><span class="text-neutral-400"
                                ><span class="max-md:hidden">&nbsp;-&nbsp;</span
                                ><br class="md:hidden" />{{ thread.latest.textPreview }}</span
                            >
                        </td>
                        <td class="block text-xs text-nowrap md:table-cell md:text-right">
                            {{ thread.latest.formattedDate }}
                        </td>
                    </tr>
                </template>
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
import {
    ref,
    computed,
    onMounted,
    onUnmounted,
    onActivated,
    onDeactivated,
    watch,
    nextTick,
    type ObjectDirective,
} from 'vue'
import { useRouter } from 'vue-router'
import { type EmailMeta } from './parser.js'
import { groupIntoThreads, type ThreadGroup } from './threads.js'
import Filters from './FilterList.vue'
import EmailAddress from './EmailAddress.vue'
import { type EffectiveBucketConfig } from './config.js'
import { useEmailStore } from './stores/email.js'
import { useConfigStore } from './stores/config.js'
import { getPage, totalPages, PAGE_SIZE } from './s3Utils.js'
import { useKeyboardShortcutsModal } from './useKeyboardShortcutsModal.js'
import { useThreeStateCheckbox } from './useThreeStateCheckbox.js'
import { useInboxLoader } from './useInboxLoader.js'

const vIndeterminate: ObjectDirective<HTMLInputElement, boolean> = {
    mounted: (el, { value }) => {
        el.indeterminate = value
    },
    updated: (el, { value }) => {
        el.indeterminate = value
    },
}

const emailStore = useEmailStore()
const configStore = useConfigStore()

const router = useRouter()
const { showShortcutsModal, openModal } = useKeyboardShortcutsModal()
const { loading, error, loadEmails } = useInboxLoader()

const currentPage = ref(1)
const selectedIndex = ref(0)
const groupThreads = ref(false)
const rowRefs: (HTMLElement | null)[] = []
const selectedKeys = ref<Set<string>>(new Set())
const selectAllRef = ref<HTMLInputElement | null>(null)

function groupThreadsKey(bucket: EffectiveBucketConfig): string {
    return `groupThreads:${bucketFilterId(bucket)}`
}

function loadGroupThreads(bucket: EffectiveBucketConfig): void {
    try {
        groupThreads.value = localStorage.getItem(groupThreadsKey(bucket)) === 'true'
    } catch {
        groupThreads.value = false
    }
}

function saveGroupThreads(bucket: EffectiveBucketConfig): void {
    try {
        localStorage.setItem(groupThreadsKey(bucket), String(groupThreads.value))
    } catch {
        // ignore storage errors
    }
}

const filteredIndex = computed(() => emailStore.filteredIndex)
const numPages = computed(() =>
    groupThreads.value
        ? totalPages(allThreads.value.length, PAGE_SIZE)
        : totalPages(filteredIndex.value.length, PAGE_SIZE)
)
const pagedMeta = computed<EmailMeta[]>(() => {
    const page = getPage(filteredIndex.value, currentPage.value, PAGE_SIZE)
    return page
        .map(({ cacheKey }) => emailStore.emailMeta.get(cacheKey))
        .filter((m): m is EmailMeta => m !== undefined)
})
const allThreads = computed<ThreadGroup[]>(() => {
    const allMetas = filteredIndex.value
        .map(({ cacheKey }) => emailStore.emailMeta.get(cacheKey))
        .filter((m): m is EmailMeta => m !== undefined)
    return groupIntoThreads(allMetas)
})
const pagedThreads = computed<ThreadGroup[]>(() =>
    getPage(allThreads.value, currentPage.value, PAGE_SIZE)
)

type SelectionState = 'all' | 'some' | 'none'

const pageEmailKeys = computed<string[]>(() => {
    if (groupThreads.value) {
        return pagedThreads.value.flatMap((t) => t.emails.map((e) => e.key))
    }
    return pagedMeta.value.map((m) => m.key)
})

const selectionState = computed<SelectionState>(() => {
    const keys = pageEmailKeys.value
    if (keys.length === 0) return 'none'
    const selectedOnPage = keys.filter((k) => selectedKeys.value.has(k)).length
    if (selectedOnPage === 0) return 'none'
    if (selectedOnPage === keys.length) return 'all'
    return 'some'
})

useThreeStateCheckbox(selectAllRef, selectionState, {
    isChecked: (s) => s === 'all',
    isIndeterminate: (s) => s === 'some',
})

// Re-sync checkbox visual state when element is re-mounted (e.g. toggling thread mode)
watch(selectAllRef, (checkbox) => {
    if (!checkbox) return
    checkbox.checked = selectionState.value === 'all'
    checkbox.indeterminate = selectionState.value === 'some'
})

watch(filteredIndex, () => {
    currentPage.value = 1
})

watch(pagedMeta, () => {
    selectedIndex.value = 0
    selectedKeys.value = new Set()
})

watch(selectedIndex, async (index) => {
    await nextTick()
    rowRefs[index]?.focus()
})

function setRowRef(el: HTMLElement | null, index: number) {
    rowRefs[index] = el
}

function isInputFocused(): boolean {
    const el = document.activeElement
    return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLButtonElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLAnchorElement ||
        (el instanceof HTMLElement && el.isContentEditable)
    )
}

function handleKeyDown(e: KeyboardEvent) {
    if (isInputFocused()) return
    if (showShortcutsModal.value) return

    const len = pagedMeta.value.length
    if (len === 0) return

    if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        selectedIndex.value = Math.min(selectedIndex.value + 1, len - 1)
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
    } else if (e.key === 'Enter') {
        const meta = pagedMeta.value[selectedIndex.value]
        if (meta) openEmail(meta)
    } else if (e.key === ']' || e.key === 'ArrowRight') {
        if (currentPage.value < numPages.value) currentPage.value++
    } else if (e.key === '[' || e.key === 'ArrowLeft') {
        if (currentPage.value > 1) currentPage.value--
    } else if (e.key === 'x' || e.key === ' ') {
        e.preventDefault()
        if (groupThreads.value) {
            const thread = pagedThreads.value[selectedIndex.value]
            if (thread) toggleThreadSelection(thread)
        } else {
            const meta = pagedMeta.value[selectedIndex.value]
            if (meta) toggleSelection(meta.key)
        }
    }
}

function openEmail(meta: EmailMeta) {
    emailStore.markRead(meta.key)
    router.push({ path: `/inbox/${meta.key}` })
}

function openThread(thread: ThreadGroup) {
    if (thread.count === 1) {
        openEmail(thread.latest)
    } else {
        router.push({ path: `/inbox/thread/${encodeURIComponent(thread.threadId)}` })
    }
}

function toggleSelectAll() {
    if (selectionState.value === 'all') {
        selectedKeys.value = new Set()
    } else {
        selectedKeys.value = new Set(pageEmailKeys.value)
    }
}

function threadSelectionState(thread: ThreadGroup): SelectionState {
    const keys = thread.emails.map((e) => e.key)
    const count = keys.filter((k) => selectedKeys.value.has(k)).length
    if (count === 0) return 'none'
    if (count === keys.length) return 'all'
    return 'some'
}

function toggleThreadSelection(thread: ThreadGroup) {
    const keys = thread.emails.map((e) => e.key)
    const next = new Set(selectedKeys.value)
    if (threadSelectionState(thread) === 'all') {
        keys.forEach((k) => next.delete(k))
    } else {
        keys.forEach((k) => next.add(k))
    }
    selectedKeys.value = next
}

function toggleSelection(key: string) {
    const next = new Set(selectedKeys.value)
    if (next.has(key)) {
        next.delete(key)
    } else {
        next.add(key)
    }
    selectedKeys.value = next
}

function clearSelection() {
    selectedKeys.value = new Set()
}

async function markSelectedRead() {
    for (const key of selectedKeys.value) {
        await emailStore.markRead(key)
    }
    selectedKeys.value = new Set()
}

function bucketFilterId(bucket: EffectiveBucketConfig): string {
    return bucket.prefix
        ? `${bucket.aws_region}:${bucket.bucket}:${bucket.prefix}`
        : `${bucket.aws_region}:${bucket.bucket}`
}

onMounted(() => {
    const bucket = configStore.activeBucket
    if (bucket) {
        emailStore.loadPersistedFilters(bucketFilterId(bucket))
        loadGroupThreads(bucket)
        loadEmails()
    }
    window.addEventListener('keydown', handleKeyDown)
})

onActivated(() => {
    rowRefs[selectedIndex.value]?.focus()
    window.addEventListener('keydown', handleKeyDown)
})

onDeactivated(() => {
    window.removeEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
})

watch(
    () => configStore.activeBucket,
    (bucket) => {
        if (bucket) {
            emailStore.loadPersistedFilters(bucketFilterId(bucket))
            loadGroupThreads(bucket)
        }
        loadEmails(true)
    }
)

watch(groupThreads, () => {
    const bucket = configStore.activeBucket
    if (bucket) saveGroupThreads(bucket)
})
</script>
