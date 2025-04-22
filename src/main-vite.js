import Vue from "vue";
import VueRouter from "vue-router";
import Vuex from "vuex";

import App from "./App.vue";
import Email from "./Email.vue";
import EmailList from "./EmailList.vue";

import "../scss/custom.scss";

Vue.use(VueRouter);
Vue.use(Vuex);

const router = new VueRouter({
    routes: [
        { path: "/", component: EmailList },
        { path: "/inbox", component: EmailList },
        { path: "/inbox/:messageId", component: Email, props: true },
    ],
});

const store = new Vuex.Store({
    state: {
        config: JSON.parse(localStorage.config || null),
        emails: new Map(),
        labels: [],
    },
    getters: {
        emails: (state) => {
            let emails = [];
            state.emails.forEach((v) => emails.push(v));
            state.labels.forEach((label) => {
                emails = emails.filter(label.f);
            });
            return emails;
        },
    },
    mutations: {
        updateConfig(state, newConfig) {
            state.config = newConfig;
            localStorage.config = JSON.stringify(newConfig);
        },
        updateEmails(state, emails) {
            const map = new Map();
            emails.forEach((email) => {
                map.set(email.key, email);
            });
            state.emails = map;
        },
        updateEmail(state, email) {
            state.emails.set(email.key, email);
        },
        addLabel(state, label) {
            state.labels.push(label);
        },
        removeLabel(state, label) {
            state.labels = state.labels.filter((l) => l !== label);
        },
    },
});

new Vue({
    router,
    store,
    render: (h) => h(App),
}).$mount("#app");
