export async function loadChangelog(): Promise<string> {
    const mod = await import('../CHANGELOG.md?raw')
    return mod.default
}
