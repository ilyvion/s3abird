<template>
    <div>
        <Settings></Settings>
        <div class="container-fluid">
            <div class="row justify-content-center">
                <div class="mt-2 col col-sm-9 col-md-10">
                    <div class="bg-light rounded px-3 py-2">
                        <router-view v-slot="{ Component }">
                            <keep-alive include="EmailList">
                                <transition name="fade" mode="out-in">
                                    <component :is="Component" />
                                </transition>
                            </keep-alive>
                        </router-view>
                    </div>
                </div>
            </div>
            <div class="row">
                <footer class="container d-flex justify-content-between my-2">
                    <span
                        >Maintained with <i class="fas fa-heart"></i> by
                        <a href="https://alexanderschroeder.net/"
                            >Alexander Krivács Schrøder</a
                        ></span
                    >
                    <a href="https://github.com/ilyvion/s3abird"
                        ><i class="fab fa-github"></i> Contribute</a
                    >
                </footer>
                <footer class="container mb-2">
                    <span
                        >Originally made with <i class="fas fa-heart"></i> by
                        <a href="https://marcinchmiel.com">Marcin Chmiel</a></span
                    >
                </footer>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Settings from './Settings.vue'

export default {
    name: 'App',
    components: {
        Settings,
    },
}
</script>

<style lang="scss" scoped>
footer {
    font-size: 0.875rem;

    color: rgba(#fff, 0.4);

    a {
        &:hover {
            color: rgba(#fff, 7);
        }

        color: inherit;
        text-decoration: none;
    }
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
    opacity: 1;
}
</style>
