/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */

type OptionalPropertyNames<T> = {
    [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never
}[keyof T]

type SpreadProperties<L, R, K extends keyof L & keyof R> = {
    [P in K]: L[P] | Exclude<R[P], undefined>
}

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

type SpreadTwo<L, R> = Id<
    Pick<L, Exclude<keyof L, keyof R>> &
        Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
        Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
        SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>

type Spread<A extends readonly [...any]> = A extends [infer L, ...infer R]
    ? SpreadTwo<L, Spread<R>>
    : unknown

export default function merge<A extends object[]>(...a: [...A]) {
    return Object.assign({}, ...a) as Spread<A>
}

export function mergeWithDefaults<P extends {}, D extends Partial<P>>(
    props: P,
    defaults: D
): Id<SpreadTwo<P, D>> {
    const result = {} as any
    const keys = new Set([...Object.keys(defaults), ...Object.keys(props)]) as Set<keyof P>

    for (const key of keys) {
        const propValue = props[key]
        const defaultValue = defaults[key]

        // compose both functions so both constraints must pass
        if (typeof propValue === 'function' && typeof defaultValue === 'function') {
            result[key] = (...args: any[]) => {
                const result1 = defaultValue(...args)
                const result2 = propValue(...args)
                return result1 && result2
            }
        } else {
            result[key] = propValue !== undefined ? propValue : defaultValue
        }
    }

    return result
}
