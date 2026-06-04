import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'

import App from './App.vue'
import Email from './EmailItem.vue'
import EmailList from './EmailList.vue'
import NotFound from './NotFound.vue'
import ThreadView from './ThreadView.vue'

import 'animate.css'
import './style.css'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: EmailList },
        { path: '/inbox', component: EmailList },
        { path: '/inbox/thread/:threadId', component: ThreadView, props: true },
        { path: '/inbox/:messageId', component: Email, props: true },
        { path: '/:pathMatch(.*)*', component: NotFound },
    ],
})

createApp(App).use(createHead()).use(router).use(createPinia()).mount('#app')
