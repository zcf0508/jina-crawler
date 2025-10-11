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

  describe('uRL scope validation', () => {
    it('should include links within the same base path', () => {
      const content = `
[Link 1](https://example.com/docs/page1)
[Link 2](https://example.com/docs/sub/page2)
      `
      const baseUrl = 'https://example.com/docs'
      const links = extractLinks(content, baseUrl)

      expect(links).toContain('https://example.com/docs/page1')
      expect(links).toContain('https://example.com/docs/sub/page2')
    })

    it('should exclude links outside the base path scope', () => {
      const content = `
[Link 1](https://example.com/docs/page1)
[Link 2](https://example.com/blog/post1)
[Link 3](https://example.com/documentation/guide)
      `
      const baseUrl = 'https://example.com/docs'
      const links = extractLinks(content, baseUrl)

      expect(links).toContain('https://example.com/docs/page1')
      expect(links).not.toContain('https://example.com/blog/post1')
      // Should not include URLs that just start with the base path string
      expect(links).not.toContain('https://example.com/documentation/guide')
    })

    it('should handle base URL with trailing slash', () => {
      const content = `
[Link 1](https://example.com/docs/page1)
[Link 2](/docs/page2)
      `
      const baseUrl = 'https://example.com/docs/'
      const links = extractLinks(content, baseUrl)

      expect(links).toContain('https://example.com/docs/page1')
      expect(links).toContain('https://example.com/docs/page2')
    })

    it('should handle base URL without trailing slash', () => {
      const content = `
[Link 1](https://example.com/docs/page1)
[Link 2](/docs/page2)
      `
      const baseUrl = 'https://example.com/docs'
      const links = extractLinks(content, baseUrl)

      expect(links).toContain('https://example.com/docs/page1')
      expect(links).toContain('https://example.com/docs/page2')
    })

    it('should exclude links from different domains', () => {
      const content = `
[Link 1](https://example.com/page1)
[Link 2](https://other-domain.com/page2)
[Link 3](https://example.org/page3)
      `
      const baseUrl = 'https://example.com'
      const links = extractLinks(content, baseUrl)

      expect(links).toContain('https://example.com/page1')
      expect(links).not.toContain('https://other-domain.com/page2')
      expect(links).not.toContain('https://example.org/page3')
    })

    it('should handle root level base URL', () => {
      const content = `
[Link 1](https://example.com/page1)
[Link 2](https://example.com/docs/page2)
[Link 3](https://other-domain.com/page3)
      `
      const baseUrl = 'https://example.com'
      const links = extractLinks(content, baseUrl)

      expect(links).toContain('https://example.com/page1')
      expect(links).toContain('https://example.com/docs/page2')
      expect(links).not.toContain('https://other-domain.com/page3')
    })

    it('should handle relative paths within scope', () => {
      const content = `
[Link 1](https://example.com/docs/page1)
[Link 2](https://example.com/docs/sub/page2)
[Link 3](https://example.com/other/page3)
      `
      const baseUrl = 'https://example.com/docs'
      const links = extractLinks(content, baseUrl)

      // Links within /docs should be included
      expect(links).toContain('https://example.com/docs/page1')
      expect(links).toContain('https://example.com/docs/sub/page2')
      // Links outside /docs should be excluded
      expect(links).not.toContain('https://example.com/other/page3')
    })

    it('should handle absolute paths correctly', () => {
      const content = `
[Link 1](/docs/page1)
[Link 2](/docs/guide/page2)
[Link 3](/other/page3)
      `
      const baseUrl = 'https://example.com/docs'
      const links = extractLinks(content, baseUrl)

      expect(links).toContain('https://example.com/docs/page1')
      expect(links).toContain('https://example.com/docs/guide/page2')
      expect(links).not.toContain('https://example.com/other/page3')
    })

    it('should handle relative paths with trailing slash base URL', () => {
      const content = `
[Link 1](./page1)
[Link 2](page2)
[Link 3](sub/page3)
      `
      // When baseUrl ends with /, it's treated as a directory
      const baseUrl = 'https://example.com/docs/guide/'
      const links = extractLinks(content, baseUrl)

      expect(links).toContain('https://example.com/docs/guide/page1')
      expect(links).toContain('https://example.com/docs/guide/page2')
      expect(links).toContain('https://example.com/docs/guide/sub/page3')
    })

    it('should deduplicate identical links', () => {
      const content = `
[Link 1](https://example.com/page1)
[Link 2](https://example.com/page1)
[Link 3](/page1)
      `
      const baseUrl = 'https://example.com'
      const links = extractLinks(content, baseUrl)

      expect(links.length).toBe(1)
      expect(links).toContain('https://example.com/page1')
    })
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

  describe('uRL scope validation', () => {
    it('should include links within the same base path', () => {
      const content = `
        <html>
          <body>
            <a href="https://example.com/docs/page1">Link 1</a>
            <a href="https://example.com/docs/sub/page2">Link 2</a>
          </body>
        </html>
      `
      const baseUrl = 'https://example.com/docs'
      const links = extractLinksFromHtml(content, baseUrl)

      expect(links).toContain('https://example.com/docs/page1')
      expect(links).toContain('https://example.com/docs/sub/page2')
    })

    it('should exclude links outside the base path scope', () => {
      const content = `
        <html>
          <body>
            <a href="https://example.com/docs/page1">Link 1</a>
            <a href="https://example.com/blog/post1">Link 2</a>
            <a href="https://example.com/documentation/guide">Link 3</a>
          </body>
        </html>
      `
      const baseUrl = 'https://example.com/docs'
      const links = extractLinksFromHtml(content, baseUrl)

      expect(links).toContain('https://example.com/docs/page1')
      expect(links).not.toContain('https://example.com/blog/post1')
      // Should not include URLs that just start with the base path string
      expect(links).not.toContain('https://example.com/documentation/guide')
    })

    it('should handle base URL with trailing slash', () => {
      const content = `
        <html>
          <body>
            <a href="https://example.com/docs/page1">Link 1</a>
            <a href="/docs/page2">Link 2</a>
          </body>
        </html>
      `
      const baseUrl = 'https://example.com/docs/'
      const links = extractLinksFromHtml(content, baseUrl)

      expect(links).toContain('https://example.com/docs/page1')
      expect(links).toContain('https://example.com/docs/page2')
    })

    it('should handle base URL without trailing slash', () => {
      const content = `
        <html>
          <body>
            <a href="https://example.com/docs/page1">Link 1</a>
            <a href="/docs/page2">Link 2</a>
          </body>
        </html>
      `
      const baseUrl = 'https://example.com/docs'
      const links = extractLinksFromHtml(content, baseUrl)

      expect(links).toContain('https://example.com/docs/page1')
      expect(links).toContain('https://example.com/docs/page2')
    })

    it('should exclude links from different domains', () => {
      const content = `
        <html>
          <body>
            <a href="https://example.com/page1">Link 1</a>
            <a href="https://other-domain.com/page2">Link 2</a>
            <a href="https://example.org/page3">Link 3</a>
          </body>
        </html>
      `
      const baseUrl = 'https://example.com'
      const links = extractLinksFromHtml(content, baseUrl)

      expect(links).toContain('https://example.com/page1')
      expect(links).not.toContain('https://other-domain.com/page2')
      expect(links).not.toContain('https://example.org/page3')
    })

    it('should handle root level base URL', () => {
      const content = `
        <html>
          <body>
            <a href="https://example.com/page1">Link 1</a>
            <a href="https://example.com/docs/page2">Link 2</a>
            <a href="https://other-domain.com/page3">Link 3</a>
          </body>
        </html>
      `
      const baseUrl = 'https://example.com'
      const links = extractLinksFromHtml(content, baseUrl)

      expect(links).toContain('https://example.com/page1')
      expect(links).toContain('https://example.com/docs/page2')
      expect(links).not.toContain('https://other-domain.com/page3')
    })

    it('should handle relative paths within scope', () => {
      const content = `
        <html>
          <body>
            <a href="https://example.com/docs/page1">Link 1</a>
            <a href="https://example.com/docs/sub/page2">Link 2</a>
            <a href="https://example.com/other/page3">Link 3</a>
          </body>
        </html>
      `
      const baseUrl = 'https://example.com/docs'
      const links = extractLinksFromHtml(content, baseUrl)

      // Links within /docs should be included
      expect(links).toContain('https://example.com/docs/page1')
      expect(links).toContain('https://example.com/docs/sub/page2')
      // Links outside /docs should be excluded
      expect(links).not.toContain('https://example.com/other/page3')
    })

    it('should handle absolute paths correctly', () => {
      const content = `
        <html>
          <body>
            <a href="/docs/page1">Link 1</a>
            <a href="/docs/guide/page2">Link 2</a>
            <a href="/other/page3">Link 3</a>
          </body>
        </html>
      `
      const baseUrl = 'https://example.com/docs'
      const links = extractLinksFromHtml(content, baseUrl)

      expect(links).toContain('https://example.com/docs/page1')
      expect(links).toContain('https://example.com/docs/guide/page2')
      expect(links).not.toContain('https://example.com/other/page3')
    })

    it('should handle relative paths with trailing slash base URL', () => {
      const content = `
        <html>
          <body>
            <a href="./page1">Link 1</a>
            <a href="page2">Link 2</a>
            <a href="sub/page3">Link 3</a>
          </body>
        </html>
      `
      // When baseUrl ends with /, it's treated as a directory
      const baseUrl = 'https://example.com/docs/guide/'
      const links = extractLinksFromHtml(content, baseUrl)

      expect(links).toContain('https://example.com/docs/guide/page1')
      expect(links).toContain('https://example.com/docs/guide/page2')
      expect(links).toContain('https://example.com/docs/guide/sub/page3')
    })

    it('should deduplicate identical links', () => {
      const content = `
        <html>
          <body>
            <a href="https://example.com/page1">Link 1</a>
            <a href="https://example.com/page1">Link 2</a>
            <a href="/page1">Link 3</a>
          </body>
        </html>
      `
      const baseUrl = 'https://example.com'
      const links = extractLinksFromHtml(content, baseUrl)

      expect(links.length).toBe(1)
      expect(links).toContain('https://example.com/page1')
    })
  })
})
