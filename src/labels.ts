import type { Address, Email } from 'postal-mime'

export type FilterableEmail = Pick<Email, 'from' | 'to' | 'subject'> & {
    textPreview?: string
}

export type Label = {
    type: 'to' | 'from' | 'subject' | 'body'
    value: string
    f: (e: FilterableEmail) => boolean
}

const To = (addr: string): Label => {
    return {
        type: 'to',
        value: addr,
        f: (e: FilterableEmail) =>
            e.to?.find((address) => address_contains(address, addr)) !== undefined,
    }
}

const From = (addr: string): Label => {
    return {
        type: 'from',
        value: addr,
        f: (e: FilterableEmail) => e.from !== undefined && address_contains(e.from, addr),
    }
}

const Subject = (text: string): Label => {
    const needle = text.toLowerCase()
    return {
        type: 'subject',
        value: text,
        f: (e: FilterableEmail) => (e.subject?.toLowerCase().indexOf(needle) ?? -1) !== -1,
    }
}

const Body = (text: string): Label => {
    const needle = text.toLowerCase()
    return {
        type: 'body',
        value: text,
        f: (e: FilterableEmail) => (e.textPreview?.toLowerCase().indexOf(needle) ?? -1) !== -1,
    }
}

const parse = (s: string) => {
    let i = s.indexOf(':')
    if (i == -1) {
        return null
    }

    let type = s.substring(0, i).trim().toLowerCase()
    let value = s.substring(i + 1).trim()

    switch (type) {
        case 'to':
            return To(value)
        case 'from':
            return From(value)
        case 'subject':
            return Subject(value)
        case 'body':
            return Body(value)
    }

    return null
}

interface SerializedLabel {
    type: string
    value: string
}

function serialize(labels: Label[]): string {
    return JSON.stringify(labels.map(({ type, value }): SerializedLabel => ({ type, value })))
}

function deserialize(s: string): Label[] {
    try {
        const items = JSON.parse(s) as SerializedLabel[]
        if (!Array.isArray(items)) return []
        return items.flatMap((item): Label[] => {
            switch (item.type) {
                case 'to':
                    return [To(item.value)]
                case 'from':
                    return [From(item.value)]
                case 'subject':
                    return [Subject(item.value)]
                case 'body':
                    return [Body(item.value)]
                default:
                    return []
            }
        })
    } catch {
        return []
    }
}

export { To, From, Subject, Body, parse, serialize, deserialize }

function address_contains(address: Address, needle: string) {
    const n = needle.toLowerCase()
    return (
        address.name.toLowerCase().indexOf(n) !== -1 ||
        (address.address?.toLowerCase().indexOf(n) ?? -1) !== -1
    )
}
