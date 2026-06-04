import { describe, it, expect } from 'vitest'
import { stripEmptyUnreleased } from './changelogUtils.js'

const withItems = `# Changelog

## [Unreleased]

### Added

- Some new feature

## [1.0.0] - 2026-01-01

- Initial release
`

const withoutItems = `# Changelog

## [Unreleased]

### Added

### Fixed

## [1.0.0] - 2026-01-01

- Initial release
`

const withoutItemsNoSubheadings = `# Changelog

## [Unreleased]

## [1.0.0] - 2026-01-01

- Initial release
`

const noUnreleased = `# Changelog

## [1.0.0] - 2026-01-01

- Initial release
`

const unreleasedOnly = `# Changelog

## [Unreleased]

### Added

`

describe('stripEmptyUnreleased', () => {
    it('leaves the section when it has list items', () => {
        expect(stripEmptyUnreleased(withItems)).toBe(withItems)
    })

    it('removes the section when sub-headings are present but no list items', () => {
        const result = stripEmptyUnreleased(withoutItems)
        expect(result).not.toContain('[Unreleased]')
        expect(result).toContain('[1.0.0]')
    })

    it('removes the section when it has no content at all', () => {
        const result = stripEmptyUnreleased(withoutItemsNoSubheadings)
        expect(result).not.toContain('[Unreleased]')
        expect(result).toContain('[1.0.0]')
    })

    it('does nothing when there is no Unreleased section', () => {
        expect(stripEmptyUnreleased(noUnreleased)).toBe(noUnreleased)
    })

    it('removes the section when Unreleased is the only section and is empty', () => {
        const result = stripEmptyUnreleased(unreleasedOnly)
        expect(result).not.toContain('[Unreleased]')
    })
})
