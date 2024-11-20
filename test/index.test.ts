import { describe, expect, it } from 'vitest'
import { extractLinks, extractLinksFromHtml } from '../src/index'

describe('extractLinks', () => {
  it('should extract links from markdown content', () => {
    const content = `
# Test Document
[Link 1](https://example.com/page1)
[Link 2](https://example.com/page2)
    `
    const baseUrl = 'https://example.com'
    const links = extractLinks(content, baseUrl)

    expect(links).toContain('https://example.com/page1')
    expect(links).toContain('https://example.com/page2')
  })

  it('should handle relative paths', () => {
    const content = `
# Test Document
[Link 1](/page1)
[Link 2](./page2)
    `
    const baseUrl = 'https://example.com'
    const links = extractLinks(content, baseUrl)

    expect(links).toContain('https://example.com/page1')
    expect(links).toContain('https://example.com/page2')
  })

  it('should exclude markdown image links', () => {
    const content = `
# Test Document

Here is a [regular link](https://example.com/page1).

![An image](https://example.com/image.jpg)

Here's another [link](https://example.com/page2) and another ![image](https://example.com/photo.png).

[![Clickable image](https://example.com/clickable.jpg)](https://example.com/page3)
`
    const baseUrl = 'https://example.com'
    const links = extractLinks(content, baseUrl)

    // Regular links should be included
    expect(links).toContain('https://example.com/page1')
    expect(links).toContain('https://example.com/page2')
    expect(links).toContain('https://example.com/page3')

    // Image links should be excluded
    expect(links).not.toContain('https://example.com/image.jpg')
    expect(links).not.toContain('https://example.com/photo.png')
    expect(links).not.toContain('https://example.com/clickable.jpg')
  })
})

describe('extractLinksFromHtml', () => {
  it('should extract links from HTML content', () => {
    const content = `
      <html>
        <body>
          <a href="https://example.com/page1">Link 1</a>
          <a href="https://example.com/page2">Link 2</a>
        </body>
      </html>
    `
    const baseUrl = 'https://example.com'
    const links = extractLinksFromHtml(content, baseUrl)

    expect(links).toContain('https://example.com/page1')
    expect(links).toContain('https://example.com/page2')
  })

  it('should handle relative paths in HTML', () => {
    const content = `
      <html>
        <body>
          <a href="/page1">Link 1</a>
          <a href="./page2">Link 2</a>
        </body>
      </html>
    `
    const baseUrl = 'https://example.com'
    const links = extractLinksFromHtml(content, baseUrl)

    expect(links).toContain('https://example.com/page1')
    expect(links).toContain('https://example.com/page2')
  })

  it('should exclude image links', () => {
    const content = `
      <html>
        <body>
          <a href="https://example.com/page1">Regular Link</a>
          <a href="https://example.com/image.jpg">Image Link 1</a>
          <a href="https://example.com/photo.png">Image Link 2</a>
          <a href="https://example.com/page2.html">Another Regular Link</a>
          <a href="https://example.com/icon.svg">Image Link 3</a>
        </body>
      </html>
    `
    const baseUrl = 'https://example.com'
    const links = extractLinksFromHtml(content, baseUrl)

    expect(links).toContain('https://example.com/page1')
    expect(links).toContain('https://example.com/page2.html')
    expect(links).not.toContain('https://example.com/image.jpg')
    expect(links).not.toContain('https://example.com/photo.png')
    expect(links).not.toContain('https://example.com/icon.svg')
  })
})
