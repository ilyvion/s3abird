// happy-dom's Node.prototype.nodeName getter returns '' and each node class overrides it,
// whereas browsers have one Node.prototype getter that works for every node. DOMPurify
// calls the Node.prototype getter directly, so without this fix it sees every element
// as nameless and sanitizing in tests does not match the browser.
export function fixHappyDomNodeName(): void {
    if (typeof Node === 'undefined' || typeof document === 'undefined') return

    const baseDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeName')
    const baseGetter = baseDescriptor?.get
    if (!baseDescriptor || !baseGetter) return
    if (baseGetter.call(document.createElement('div')) !== '') return

    Object.defineProperty(Node.prototype, 'nodeName', {
        ...baseDescriptor,
        get(this: Node): string {
            let proto: object | null = Object.getPrototypeOf(this)
            while (proto && proto !== Node.prototype) {
                const ownGetter = Object.getOwnPropertyDescriptor(proto, 'nodeName')?.get
                if (ownGetter) return ownGetter.call(this)
                proto = Object.getPrototypeOf(proto)
            }
            return baseGetter.call(this)
        },
    })
}

fixHappyDomNodeName()
