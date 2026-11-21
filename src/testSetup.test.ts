// @vitest-environment happy-dom
import createDOMPurify from 'dompurify'
import { describe, expect, it } from 'vitest'
import { fixHappyDomNodeName } from './testSetup'

function nodeNameViaPrototype(node: Node): string | undefined {
    return Object.getOwnPropertyDescriptor(Node.prototype, 'nodeName')?.get?.call(node)
}

describe('testSetup', () => {
    it('makes the Node.prototype nodeName getter report each node type like a browser', () => {
        expect(nodeNameViaPrototype(document.createElement('script'))).toBe('SCRIPT')
        expect(nodeNameViaPrototype(document.createElement('b'))).toBe('B')
        expect(nodeNameViaPrototype(document.createTextNode('x'))).toBe('#text')
        expect(nodeNameViaPrototype(document.createComment('x'))).toBe('#comment')
        expect(nodeNameViaPrototype(document)).toBe('#document')
    })

    it('leaves the nodeName property on nodes unchanged', () => {
        expect(document.createElement('div').nodeName).toBe('DIV')
        expect(document.createTextNode('x').nodeName).toBe('#text')
    })

    it('is safe to apply more than once', () => {
        fixHappyDomNodeName()
        expect(nodeNameViaPrototype(document.createElement('p'))).toBe('P')
    })

    it('lets DOMPurify keep allowed tags and remove scripts and event handlers', () => {
        const purify = createDOMPurify(window)
        expect(purify.sanitize('<b>x</b><script>y</script>')).toBe('<b>x</b>')
        expect(purify.sanitize('<p onclick="a()">x<img src="x" onerror="alert(1)"></p>')).toBe(
            '<p>x<img src="x"></p>'
        )
    })
})
