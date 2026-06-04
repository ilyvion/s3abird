const PREFIX = import.meta.env.VITE_STORAGE_PREFIX ?? ''

function prefixed(key: string): string {
    return PREFIX ? `${PREFIX}:${key}` : key
}

export function getItem(key: string): string | null {
    return localStorage.getItem(prefixed(key))
}

export function setItem(key: string, value: string): void {
    localStorage.setItem(prefixed(key), value)
}

export function removeItem(key: string): void {
    localStorage.removeItem(prefixed(key))
}
