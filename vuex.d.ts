import { Store } from 'vuex'
import { State } from './src/store'

declare module 'vue' {
    // provide typings for `this.$store`
    interface ComponentCustomProperties {
        $store: Store<State>
    }
}
