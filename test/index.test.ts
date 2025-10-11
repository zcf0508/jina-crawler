import { describe, expect, it } from 'vitest'
import { extractLinks, extractLinksFromHtml, htmlToMarkdown, normalizeUrl, shouldCrawlUrl } from '../src/index'

describe('extractLinks', () => {
  it('should extract links from markdown content', () => {
    const content = `
# Test Document
[Link 1](https://example.com/page1)
[Link 2](https://example.com/page2)
    `
    const baseUrl = 'https://example.com'
    const links = extractLinks(content, baseUrl, baseUrl)

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
    const links = extractLinks(content, baseUrl, baseUrl)

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
    const links = extractLinks(content, baseUrl, baseUrl)

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
      const links = extractLinks(content, baseUrl, baseUrl)

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
      const links = extractLinks(content, baseUrl, baseUrl)

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
      const links = extractLinks(content, baseUrl, baseUrl)

      expect(links).toContain('https://example.com/docs/page1')
      expect(links).toContain('https://example.com/docs/page2')
    })

    it('should handle base URL without trailing slash', () => {
      const content = `
[Link 1](https://example.com/docs/page1)
[Link 2](/docs/page2)
      `
      const baseUrl = 'https://example.com/docs'
      const links = extractLinks(content, baseUrl, baseUrl)

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
      const links = extractLinks(content, baseUrl, baseUrl)

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
      const links = extractLinks(content, baseUrl, baseUrl)

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
      const links = extractLinks(content, baseUrl, baseUrl)

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
      const links = extractLinks(content, baseUrl, baseUrl)

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
      const links = extractLinks(content, baseUrl, baseUrl)

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
      const links = extractLinks(content, baseUrl, baseUrl)

      expect(links.length).toBe(1)
      expect(links).toContain('https://example.com/page1')
    })

    it('should correctly parse relative links from a nested page', () => {
      const content = `
[Same dir](./installation.html)
[Subdirectory](./advanced/config.html)
[Parent dir](../api/methods.html)
[Absolute](/docs/reference.html)
      `
      const currentUrl = 'https://example.com/docs/guide/getting-started.html'
      const baseUrl = 'https://example.com/docs'
      const links = extractLinks(content, currentUrl, baseUrl)

      // Relative links resolved from current page
      expect(links).toContain('https://example.com/docs/guide/installation.html')
      expect(links).toContain('https://example.com/docs/guide/advanced/config.html')
      expect(links).toContain('https://example.com/docs/api/methods.html')
      expect(links).toContain('https://example.com/docs/reference.html')
    })

    it('should filter out relative links that resolve outside scope', () => {
      const content = `
[Within scope](./page1.html)
[Outside scope](../../other/page2.html)
      `
      const currentUrl = 'https://example.com/docs/guide/intro.html'
      const baseUrl = 'https://example.com/docs'
      const links = extractLinks(content, currentUrl, baseUrl)

      // Within scope
      expect(links).toContain('https://example.com/docs/guide/page1.html')
      // Outside scope - resolves to /other/page2.html
      expect(links).not.toContain('https://example.com/other/page2.html')
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
    const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
    const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
    const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
      const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
      const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
      const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
      const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
      const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
      const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
      const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
      const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
      const links = extractLinksFromHtml(content, baseUrl, baseUrl)

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
      const links = extractLinksFromHtml(content, baseUrl, baseUrl)

      expect(links.length).toBe(1)
      expect(links).toContain('https://example.com/page1')
    })

    it('should correctly parse relative links from a nested page', () => {
      const content = `
        <html>
          <body>
            <a href="./installation.html">Same dir</a>
            <a href="./advanced/config.html">Subdirectory</a>
            <a href="../api/methods.html">Parent dir</a>
            <a href="/docs/reference.html">Absolute</a>
          </body>
        </html>
      `
      const currentUrl = 'https://example.com/docs/guide/getting-started.html'
      const baseUrl = 'https://example.com/docs'
      const links = extractLinksFromHtml(content, currentUrl, baseUrl)

      // Relative links resolved from current page
      expect(links).toContain('https://example.com/docs/guide/installation.html')
      expect(links).toContain('https://example.com/docs/guide/advanced/config.html')
      expect(links).toContain('https://example.com/docs/api/methods.html')
      expect(links).toContain('https://example.com/docs/reference.html')
    })

    it('should filter out relative links that resolve outside scope', () => {
      const content = `
        <html>
          <body>
            <a href="./page1.html">Within scope</a>
            <a href="../../other/page2.html">Outside scope</a>
          </body>
        </html>
      `
      const currentUrl = 'https://example.com/docs/guide/intro.html'
      const baseUrl = 'https://example.com/docs'
      const links = extractLinksFromHtml(content, currentUrl, baseUrl)

      // Within scope
      expect(links).toContain('https://example.com/docs/guide/page1.html')
      // Outside scope - resolves to /other/page2.html
      expect(links).not.toContain('https://example.com/other/page2.html')
    })
  })
})

describe('normalizeUrl', () => {
  describe('hash Router detection (SPA)', () => {
    it('should keep hash for hash router patterns', () => {
      const hashRouterUrls = [
        'https://example.com/docs/#/guide/intro',
        'https://example.com/docs/#/api/methods',
        'https://example.com/docs/#/',
        'https://example.com/docs/index.html#/guide',
        'https://example.com/#/page/subpage',
      ]

      hashRouterUrls.forEach((url) => {
        expect(normalizeUrl(url)).toBe(url)
      })
    })

    it('should keep hash containing multiple slashes', () => {
      const url = 'https://example.com/docs/#/guide/advanced/config'
      expect(normalizeUrl(url)).toBe(url)
    })
  })

  describe('anchor link detection (MPA)', () => {
    it('should remove hash for anchor links', () => {
      const testCases = [
        {
          input: 'https://example.com/docs/guide.html#installation',
          expected: 'https://example.com/docs/guide.html',
        },
        {
          input: 'https://example.com/docs/api#methods',
          expected: 'https://example.com/docs/api',
        },
        {
          input: 'https://example.com/page#top',
          expected: 'https://example.com/page',
        },
        {
          input: 'https://example.com/docs/#section',
          expected: 'https://example.com/docs/',
        },
        {
          input: 'https://example.com/docs/#heading-1',
          expected: 'https://example.com/docs/',
        },
      ]

      testCases.forEach(({ input, expected }) => {
        expect(normalizeUrl(input)).toBe(expected)
      })
    })

    it('should handle URLs without hash', () => {
      const url = 'https://example.com/docs/guide.html'
      expect(normalizeUrl(url)).toBe(url)
    })

    it('should handle empty hash', () => {
      const url = 'https://example.com/docs/#'
      expect(normalizeUrl(url)).toBe('https://example.com/docs/')
    })
  })

  describe('edge cases', () => {
    it('should handle query parameters with hash', () => {
      expect(normalizeUrl('https://example.com/page?q=test#section'))
        .toBe('https://example.com/page?q=test')

      expect(normalizeUrl('https://example.com/page?q=test#/route'))
        .toBe('https://example.com/page?q=test#/route')
    })

    it('should preserve hash router with query parameters', () => {
      const url = 'https://example.com/docs?lang=en#/guide/intro'
      expect(normalizeUrl(url)).toBe(url)
    })

    it('should handle URLs with port numbers', () => {
      expect(normalizeUrl('http://localhost:3000/#/docs'))
        .toBe('http://localhost:3000/#/docs')

      expect(normalizeUrl('http://localhost:3000/page#section'))
        .toBe('http://localhost:3000/page')
    })
  })

  describe('real-world examples', () => {
    it('should handle VuePress 1.x style URLs', () => {
      expect(normalizeUrl('https://v1.vuepress.vuejs.org/#/guide/'))
        .toBe('https://v1.vuepress.vuejs.org/#/guide/')

      expect(normalizeUrl('https://v1.vuepress.vuejs.org/#/guide/getting-started'))
        .toBe('https://v1.vuepress.vuejs.org/#/guide/getting-started')
    })

    it('should handle modern docs with anchors', () => {
      expect(normalizeUrl('https://vuejs.org/guide/introduction.html#what-is-vue'))
        .toBe('https://vuejs.org/guide/introduction.html')

      expect(normalizeUrl('https://react.dev/learn#thinking-in-react'))
        .toBe('https://react.dev/learn')
    })

    it('should handle GitBook style URLs', () => {
      expect(normalizeUrl('https://docs.example.com/#/'))
        .toBe('https://docs.example.com/#/')

      expect(normalizeUrl('https://docs.example.com/#/chapter1/section1'))
        .toBe('https://docs.example.com/#/chapter1/section1')
    })
  })
})

describe('htmlToMarkdown', () => {
  it('should convert basic HTML to Markdown', async () => {
    const html = `
      <h1>Hello World</h1>
      <p>This is a paragraph.</p>
    `
    const md = await htmlToMarkdown(html)

    expect(md).toContain('# Hello World')
    expect(md).toContain('This is a paragraph.')
  })

  it('should convert links in HTML to Markdown', async () => {
    const html = `
      <p>Check out <a href="https://example.com">this link</a>.</p>
    `
    const md = await htmlToMarkdown(html)

    expect(md).toContain('[this link](https://example.com)')
  })

  it('should convert lists in HTML to Markdown', async () => {
    const html = `
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
    `
    const md = await htmlToMarkdown(html)

    // remark-stringify uses * for unordered lists by default
    expect(md).toContain('* Item 1')
    expect(md).toContain('* Item 2')
    expect(md).toContain('* Item 3')
  })

  it('should convert complex HTML document', async () => {
    const html = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>Documentation</h1>
          <p>Welcome to the <strong>documentation</strong>.</p>
          <h2>Getting Started</h2>
          <p>Follow these steps:</p>
          <ol>
            <li>Install the package</li>
            <li>Configure settings</li>
          </ol>
          <p>For more info, visit <a href="/docs/guide">the guide</a>.</p>
        </body>
      </html>
    `
    const md = await htmlToMarkdown(html)

    expect(md).toContain('# Documentation')
    expect(md).toContain('**documentation**')
    expect(md).toContain('## Getting Started')
    expect(md).toContain('1. Install the package')
    expect(md).toContain('2. Configure settings')
    expect(md).toContain('[the guide](/docs/guide)')
  })

  it('should handle code blocks', async () => {
    const html = `
      <pre><code>const x = 42;</code></pre>
    `
    const md = await htmlToMarkdown(html)

    expect(md).toContain('const x = 42;')
  })

  it('should preserve emphasis and strong', async () => {
    const html = `
      <p>This is <em>italic</em> and <strong>bold</strong> text.</p>
    `
    const md = await htmlToMarkdown(html)

    expect(md).toContain('*italic*')
    expect(md).toContain('**bold**')
  })

  it('should handle empty or malformed HTML gracefully', async () => {
    const html = ''
    const md = await htmlToMarkdown(html)

    expect(md).toBe('')
  })
})

describe('shouldCrawlUrl', () => {
  describe('protocol filtering', () => {
    it('should allow HTTP and HTTPS protocols', () => {
      expect(shouldCrawlUrl('http://example.com/page')).toBe(true)
      expect(shouldCrawlUrl('https://example.com/page')).toBe(true)
    })

    it('should filter out javascript: protocol', () => {
      expect(shouldCrawlUrl('javascript:void(0)')).toBe(false)
      expect(shouldCrawlUrl('javascript:alert("test")')).toBe(false)
    })

    it('should filter out mailto: protocol', () => {
      expect(shouldCrawlUrl('mailto:admin@example.com')).toBe(false)
      expect(shouldCrawlUrl('mailto:user@domain.com?subject=Hello')).toBe(false)
    })

    it('should filter out tel: protocol', () => {
      expect(shouldCrawlUrl('tel:+1234567890')).toBe(false)
      expect(shouldCrawlUrl('tel:123-456-7890')).toBe(false)
    })

    it('should filter out other non-HTTP protocols', () => {
      expect(shouldCrawlUrl('ftp://files.example.com')).toBe(false)
      expect(shouldCrawlUrl('data:text/html,<h1>Test</h1>')).toBe(false)
      expect(shouldCrawlUrl('file:///home/user/file.txt')).toBe(false)
      expect(shouldCrawlUrl('about:blank')).toBe(false)
    })
  })

  describe('download file filtering', () => {
    it('should filter out archive files', () => {
      expect(shouldCrawlUrl('https://example.com/file.zip')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/archive.rar')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/package.tar.gz')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/data.7z')).toBe(false)
    })

    it('should filter out document files', () => {
      expect(shouldCrawlUrl('https://example.com/document.pdf')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/report.docx')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/old.doc')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/data.xlsx')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/sheet.xls')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/slides.pptx')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/presentation.ppt')).toBe(false)
    })

    it('should filter out executable files', () => {
      expect(shouldCrawlUrl('https://example.com/installer.exe')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/app.dmg')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/package.deb')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/software.msi')).toBe(false)
    })

    it('should filter out video files', () => {
      expect(shouldCrawlUrl('https://example.com/video.mp4')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/movie.avi')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/clip.mov')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/film.mkv')).toBe(false)
    })

    it('should filter out audio files', () => {
      expect(shouldCrawlUrl('https://example.com/song.mp3')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/audio.wav')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/music.ogg')).toBe(false)
      expect(shouldCrawlUrl('https://example.com/track.flac')).toBe(false)
    })
  })

  describe('web page URLs', () => {
    it('should allow HTML pages', () => {
      expect(shouldCrawlUrl('https://example.com/page.html')).toBe(true)
      expect(shouldCrawlUrl('https://example.com/docs/guide.html')).toBe(true)
      expect(shouldCrawlUrl('https://example.com/index.htm')).toBe(true)
    })

    it('should allow paths without extensions', () => {
      expect(shouldCrawlUrl('https://example.com/docs')).toBe(true)
      expect(shouldCrawlUrl('https://example.com/guide/intro')).toBe(true)
      expect(shouldCrawlUrl('https://example.com/')).toBe(true)
    })

    it('should allow PHP and other server-side pages', () => {
      expect(shouldCrawlUrl('https://example.com/page.php')).toBe(true)
      expect(shouldCrawlUrl('https://example.com/api.jsp')).toBe(true)
      expect(shouldCrawlUrl('https://example.com/page.asp')).toBe(true)
    })
  })

  describe('invalid URLs', () => {
    it('should return false for invalid URLs', () => {
      expect(shouldCrawlUrl('not-a-url')).toBe(false)
      expect(shouldCrawlUrl('ht tp://example.com')).toBe(false)
      expect(shouldCrawlUrl('')).toBe(false)
    })
  })
})
