import { describe, it, expect, beforeEach } from 'vitest'
import {
    filterAndSortByDate,
    getPage,
    totalPages,
    PAGE_SIZE,
    getS3Client,
    clearS3ClientCache,
} from './s3Utils'
import type { _Object } from '@aws-sdk/client-s3'

describe('filterAndSortByDate', () => {
    it('returns empty array for empty input', () => {
        expect(filterAndSortByDate([])).toEqual([])
    })

    it('filters out objects without LastModified', () => {
        const objects: _Object[] = [
            { Key: 'a', LastModified: new Date('2024-01-02') },
            { Key: 'b' },
        ]
        const result = filterAndSortByDate(objects)
        expect(result).toHaveLength(1)
        expect(result[0].Key).toBe('a')
    })

    it('sorts by LastModified descending (newest first)', () => {
        const objects: _Object[] = [
            { Key: 'older', LastModified: new Date('2024-01-01') },
            { Key: 'newest', LastModified: new Date('2024-01-03') },
            { Key: 'middle', LastModified: new Date('2024-01-02') },
        ]
        const result = filterAndSortByDate(objects)
        expect(result.map((o) => o.Key)).toEqual(['newest', 'middle', 'older'])
    })

    it('handles all objects missing LastModified', () => {
        const objects: _Object[] = [{ Key: 'a' }, { Key: 'b' }]
        expect(filterAndSortByDate(objects)).toEqual([])
    })
})

describe('getPage', () => {
    const items = [1, 2, 3, 4, 5, 6, 7]

    it('returns first page', () => {
        expect(getPage(items, 1, 3)).toEqual([1, 2, 3])
    })

    it('returns second page', () => {
        expect(getPage(items, 2, 3)).toEqual([4, 5, 6])
    })

    it('returns partial last page', () => {
        expect(getPage(items, 3, 3)).toEqual([7])
    })

    it('returns empty for page beyond end', () => {
        expect(getPage(items, 4, 3)).toEqual([])
    })

    it('handles empty items', () => {
        expect(getPage([], 1, 25)).toEqual([])
    })
})

describe('getS3Client', () => {
    beforeEach(() => {
        clearS3ClientCache()
    })

    it('returns an S3Client instance', () => {
        const client = getS3Client('us-east-1', 'AKID', 'secret')
        expect(client).toBeDefined()
        expect(typeof client.send).toBe('function')
    })

    it('returns the same instance for the same region and access key', () => {
        const a = getS3Client('us-east-1', 'AKID', 'secret')
        const b = getS3Client('us-east-1', 'AKID', 'different-secret')
        expect(a).toBe(b)
    })

    it('returns different instances for different access keys', () => {
        const a = getS3Client('us-east-1', 'AKID1', 'secret')
        const b = getS3Client('us-east-1', 'AKID2', 'secret')
        expect(a).not.toBe(b)
    })

    it('returns different instances for different regions', () => {
        const a = getS3Client('us-east-1', 'AKID', 'secret')
        const b = getS3Client('eu-west-1', 'AKID', 'secret')
        expect(a).not.toBe(b)
    })
})

describe('clearS3ClientCache', () => {
    it('forces a new client to be created after clearing', () => {
        const before = getS3Client('us-east-1', 'AKID', 'secret')
        clearS3ClientCache()
        const after = getS3Client('us-east-1', 'AKID', 'secret')
        expect(before).not.toBe(after)
    })
})

describe('totalPages', () => {
    it('returns 1 when items fit exactly in one page', () => {
        expect(totalPages(PAGE_SIZE, PAGE_SIZE)).toBe(1)
    })

    it('rounds up for partial last page', () => {
        expect(totalPages(PAGE_SIZE + 1, PAGE_SIZE)).toBe(2)
    })

    it('returns 0 for empty list', () => {
        expect(totalPages(0, PAGE_SIZE)).toBe(0)
    })

    it('calculates multiple full pages', () => {
        expect(totalPages(75, 25)).toBe(3)
    })
})
