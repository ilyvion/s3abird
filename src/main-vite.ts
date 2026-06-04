import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'

import App from './App.vue'
import Email from './EmailItem.vue'
import EmailList from './EmailList.vue'
import NotFound from './NotFound.vue'
import SetupWizard from './SetupWizard.vue'
import ThreadView from './ThreadView.vue'

import 'animate.css'
import './style.css'
import { getItem as lsGetItem } from './localStorage'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: EmailList },
        { path: '/inbox', component: EmailList },
        { path: '/inbox/thread/:threadId', component: ThreadView, props: true },
        { path: '/inbox/:messageId', component: Email, props: true },
        { path: '/setup', component: SetupWizard },
        { path: '/setup/add', component: SetupWizard },
        { path: '/:pathMatch(.*)*', component: NotFound },
    ],
})

router.beforeEach((to) => {
    const config = lsGetItem('config')
    const isConfigured = !!config && config !== 'null'
    // Unconfigured users may only visit the initial setup page
    if (!isConfigured && to.path !== '/setup') {
        return '/setup'
    }
    // Configured users are bounced away from initial setup (but /setup/add is fine)
    if (isConfigured && to.path === '/setup') {
        return '/inbox'
    }
})

createApp(App).use(createHead()).use(router).use(createPinia()).mount('#app')
