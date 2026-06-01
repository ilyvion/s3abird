import type { _Object } from '@aws-sdk/client-s3'

export const PAGE_SIZE = 25

export type DatedObject = _Object & { LastModified: Date }

export function filterAndSortByDate(objects: _Object[]): DatedObject[] {
    return objects
        .filter((obj): obj is DatedObject => obj.LastModified instanceof Date)
        .sort((a, b) => b.LastModified.getTime() - a.LastModified.getTime())
}

export function getPage<T>(items: T[], page: number, pageSize: number): T[] {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
}

export function totalPages(itemCount: number, pageSize: number): number {
    return Math.ceil(itemCount / pageSize)
}
