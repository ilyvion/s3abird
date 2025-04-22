import type { Address, Email } from 'postal-mime'

export type Label = {
    type: 'to' | 'from' | 'subject'
    value: string
    f: (e: Email) => boolean
}

const To = (addr: string): Label => {
    return {
        type: 'to',
        value: addr,
        f: (e: Email) => e.to?.find((address) => address_contains(address, addr)) !== undefined,
    }
}

const From = (addr: string): Label => {
    return {
        type: 'from',
        value: addr,
        f: (e: Email) => address_contains(e.from, addr),
    }
}

const Subject = (text: string): Label => {
    return {
        type: 'subject',
        value: text,
        f: (e: Email) => e.subject?.indexOf(text) !== -1,
    }
}

const parse = (s: string) => {
    let i = s.indexOf(':')
    if (i == -1) {
        return null
    }

    let type = s.substring(0, i).trim()
    let value = s.substring(i + 1).trim()

    switch (type) {
        case 'to':
            return To(value)
        case 'from':
            return From(value)
        case 'subject':
            return Subject(value)
    }

    return null
}

export { To, From, Subject, parse }

function address_contains(address: Address, needle: string) {
    return address.name.indexOf(needle) !== -1 || address.address?.indexOf(needle) !== -1
}
