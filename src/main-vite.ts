import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import { store, key } from './store'
import App from './App.vue'
import Email from './Email.vue'
import EmailList from './EmailList.vue'

import '../scss/custom.scss'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: EmailList },
        { path: '/inbox', component: EmailList },
        { path: '/inbox/:messageId', component: Email, props: true },
    ],
})

createApp(App).use(router).use(store, key).mount('#app')
