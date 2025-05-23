import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'

import App from './App.vue'
import Email from './EmailItem.vue'
import EmailList from './EmailList.vue'

import 'animate.css'
import './style.css'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: EmailList },
        { path: '/inbox', component: EmailList },
        { path: '/inbox/:messageId', component: Email, props: true },
    ],
})

createApp(App).use(router).use(createPinia()).mount('#app')
