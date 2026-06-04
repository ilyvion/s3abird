<template>
    <footer
        class="bg-base-300 flex flex-row justify-between gap-2 border-t border-neutral-300 p-2 text-xs md:px-6"
    >
        <div class="flex flex-col gap-2">
            <span
                ><button class="link cursor-pointer" @click="openChangelogModal">
                    v{{ version }}
                </button>
                — Current version maintained with <i class="fas fa-heart" /> by
                <a class="link" href="https://alexanderschroeder.net/"
                    >Alexander&nbsp;Krivács&nbsp;Schrøder</a
                ></span
            >
            <span>
                Original made with <i class="fas fa-heart" /> by
                <a class="link" href="https://marcinchmiel.com">Marcin&nbsp;Chmiel</a>
            </span>
        </div>
        <div class="flex items-center">
            <a class="link flex gap-1 no-underline" href="https://github.com/ilyvion/s3abird"
                ><i class="fabx fa-github" />Contribute</a
            >
        </div>
    </footer>
</template>

<script setup lang="ts">
import { version } from '../package.json'
import { useChangelogModal } from './composables/useChangelogModal.js'

const { openModal: openChangelogModal } = useChangelogModal()
</script>
