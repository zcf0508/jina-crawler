import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'
import { consola } from 'consola'
import { got } from 'got-cjs'
import { HttpProxyAgent } from 'http-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { parse } from 'node-html-parser'
import pLimit from 'p-limit'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

const rateLimit = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Limit concurrent crawl function calls to prevent memory overflow
const crawlLimit = pLimit(2)

class RequestScheduler {
  private queue: (() => Promise<void>)[] = []
  private isRunning = false

  addRequest(fn: () => Promise<void>) {
    this.queue.push(fn)
    this.processQueue()
  }

  private async processQueue() {
    if (this.isRunning)
      return
    this.isRunning = true

    while (this.queue.length > 0) {
      const fn = this.queue.shift()
      if (fn) {
        await fn()
        await rateLimit(3000) // 20 RPM by default
      }
    }

    this.isRunning = false
  }
}

const requestScheduler = new RequestScheduler()

const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy
const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy

const httpAgent = httpProxy ? new HttpProxyAgent(httpProxy) : undefined
const httpsAgent = httpsProxy ? new HttpsProxyAgent(httpsProxy) : undefined

async function fetchContent(url: string, token?: string): Promise<string> {
  const proxyUrl = `https://r.jina.ai${url.startsWith('/') ? '' : '/'}${url}`
  consola.log(`Fetching content from: ${proxyUrl}`)

  const response = await got(proxyUrl, {
    agent: {
      http: httpAgent,
      https: httpsAgent,
    },
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })
  return response.body
}

async function fetchOriginalContent(url: string): Promise<string> {
  consola.log(`Fetching original content from: ${url}`)
  const response = await got(url, {
    agent: {
      http: httpAgent,
      https: httpsAgent,
    },
  })
  return response.body
}

/**
 * Convert HTML to Markdown using unified/rehype/remark pipeline
 * @param html - The HTML string to convert
 * @returns Markdown string
 */
export async function htmlToMarkdown(html: string): Promise<string> {
  const file = await unified()
    .use(rehypeParse) // Parse HTML to rehype AST
    .use(rehypeRemark) // Convert rehype AST to remark AST
    .use(remarkStringify) // Convert remark AST to Markdown string
    .process(html)

  return String(file)
}

/**
 * Calculate relative path from a URL relative to a base URL
 * @param baseUrl - The base URL
 * @param url - The URL to calculate relative path for
 * @returns The relative path
 */
export function calculateRelativePath(baseUrl: string, url: string): string {
  const baseUrlObj = new URL(baseUrl)
  const urlObj = new URL(url, baseUrl)

  // Calculate relative path by removing the base path from the URL path
  let relativePath = urlObj.pathname
  if (relativePath.startsWith(baseUrlObj.pathname)) {
    relativePath = relativePath.slice(baseUrlObj.pathname.length)
  }
  return relativePath.replace(/^\//, '')
}

async function saveContent(name: string, baseUrl: string, url: string, content: string): Promise<void> {
  const relativePath = calculateRelativePath(baseUrl, url)

  // ensure base directory
  const baseDir = path.join('./docs', name)
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true })
  }

  const dir = path.join(baseDir, path.dirname(relativePath))
  // ensure sub directory
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const filename = path.basename(relativePath) === '' ? 'index' : path.basename(relativePath)
  const filePath = path.join(dir, `${filename}.md`)

  // check if file already exists
  if (fs.existsSync(filePath)) {
    consola.log(`File already exists: ${filePath}`)
    return
  }

  consola.log(`Saving content to: ${filePath}`)
  fs.writeFileSync(filePath, content, 'utf-8')
}

/**
 * Check if a URL is within the scope of the base URL
 * @param url - The URL to check
 * @param baseUrl - The base URL to compare against
 * @returns true if the URL is within the base URL scope
 */
function isUrlInScope(url: string, baseUrl: string): boolean {
  const urlObj = new URL(url)
  const baseUrlObj = new URL(baseUrl)

  // Must be the same origin (protocol + domain + port)
  if (urlObj.origin !== baseUrlObj.origin) {
    return false
  }

  // Normalize paths by removing trailing slashes for comparison
  const basePath = baseUrlObj.pathname.replace(/\/$/, '')
  const urlPath = urlObj.pathname.replace(/\/$/, '')

  // URL path must either:
  // 1. Exactly match the base path
  // 2. Start with base path followed by a slash
  // 3. Base path is empty (root) and URL path starts with /
  return urlPath === basePath
    || urlPath.startsWith(`${basePath}/`)
    || (basePath === '' && urlPath.startsWith('/'))
}

/**
 * Check if a URL should be crawled (filter out unwanted link types)
 * @param url - The URL to check
 * @returns true if the URL should be crawled
 */
export function shouldCrawlUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)

    // 1. Only allow HTTP/HTTPS protocols
    // Filter out: javascript:, mailto:, tel:, ftp:, data:, file:, etc.
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false
    }

    // 2. Filter out download files (documents, archives, executables, media)
    // Archives: zip, rar, 7z, tar, gz, bz2, xz
    // Documents: pdf, doc, docx, xls, xlsx, ppt, pptx, odt, ods, odp
    // Executables: exe, dmg, pkg, deb, rpm, msi, apk
    // Videos: mp4, avi, mov, wmv, flv, mkv, webm
    // Audio: mp3, wav, ogg, flac, aac, m4a
    const downloadExtensions = /\.(?:zip|rar|7z|tar|gz|bz2|xz|pdf|docx?|xlsx?|pptx?|odt|ods|odp|exe|dmg|pkg|deb|rpm|msi|apk|mp4|avi|mov|wmv|flv|mkv|webm|mp3|wav|ogg|flac|aac|m4a)$/i

    if (downloadExtensions.test(urlObj.pathname)) {
      return false
    }

    return true
  }
  catch {
    // Invalid URL, don't crawl
    return false
  }
}

/**
 * Normalize URL by intelligently handling hash fragments
 *
 * Hash fragments serve different purposes:
 * 1. Anchor links (e.g., #section): Used for in-page navigation
 *    - Should be removed to avoid crawling the same page multiple times
 * 2. Hash routing (e.g., #/guide/intro): Used in SPAs for client-side routing
 *    - Should be kept as they represent different pages
 *
 * Heuristic: If hash contains "/", it's likely hash routing; otherwise, it's an anchor
 *
 * @param url - The URL to normalize
 * @returns Normalized URL
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const hash = urlObj.hash

    // If hash contains "/", it's likely a hash router (SPA like VuePress 1.x, GitBook)
    // Examples: #/guide/intro, #/api/methods, #/
    // Keep the hash to preserve different "pages"
    if (hash && hash.includes('/')) {
      return url
    }

    // Otherwise, it's an anchor link within the same page
    // Examples: #section, #introduction, #top
    // Remove hash to avoid crawling the same page multiple times
    return url.split('#')[0]
  }
  catch {
    // If URL parsing fails, return as-is
    return url.split('#')[0]
  }
}

export function extractLinks(content: string, currentUrl: string, baseUrl: string): string[] {
  const urls: string[] = []
  // First, remove all image links from the content
  const contentWithoutImages = content.replace(/!\[[^\]]*\]\([^)]*\)/g, '')

  // Then match regular links
  const urlRegex = /\[[^\]]*\]\((.*?)\)/g
  let match
  // eslint-disable-next-line no-cond-assign
  while ((match = urlRegex.exec(contentWithoutImages)) !== null) {
    const link = match[1]
    try {
      // Convert relative URL to absolute, using currentUrl as the base for resolution
      const absoluteUrl = new URL(link, currentUrl).href

      // Filter out unwanted link types
      if (!shouldCrawlUrl(absoluteUrl)) {
        continue
      }

      // Check if the resolved URL is within the baseUrl scope
      if (isUrlInScope(absoluteUrl, baseUrl)) {
        urls.push(absoluteUrl)
      }
    }
    catch (e: unknown) {
      consola.warn(`Invalid URL: ${link}\n${e}`)
    }
  }
  return Array.from(new Set(urls))
}

export function extractLinksFromHtml(content: string, currentUrl: string, baseUrl: string): string[] {
  const urls: string[] = []
  const root = parse(content)
  const links = root.querySelectorAll('a')

  // Common image extensions to ignore
  const imageExtensions = /\.(?:jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i

  links.forEach((link) => {
    const href = link.getAttribute('href')
    if (href && !imageExtensions.test(href)) {
      try {
        // Convert relative URL to absolute, using currentUrl as the base for resolution
        const absoluteUrl = new URL(href, currentUrl).href

        // Filter out unwanted link types
        if (!shouldCrawlUrl(absoluteUrl)) {
          return
        }

        // Check if the resolved URL is within the baseUrl scope
        if (isUrlInScope(absoluteUrl, baseUrl)) {
          urls.push(absoluteUrl)
        }
      }
      catch (e: unknown) {
        consola.error(`Invalid URL: ${href}\n${e}`)
      }
    }
  })

  return Array.from(new Set(urls))
}

async function crawl(
  url: string,
  name: string,
  baseUrl: string,
  visited: Set<string>,
  depth: number,
  maxDepth: number,
  token?: string,
): Promise<void> {
  // Normalize URL to handle hash fragments intelligently
  const normalizedUrl = normalizeUrl(url)

  if (depth > maxDepth || visited.has(normalizedUrl)) {
    return
  }

  visited.add(normalizedUrl)
  const filePath = getFilePath(name, baseUrl, normalizedUrl)

  // check if file already exists
  if (fs.existsSync(filePath)) {
    consola.log(`Reading existing file: ${filePath}`)
    const content = fs.readFileSync(filePath, 'utf-8')
    const mdLinks = extractLinks(content, normalizedUrl, baseUrl)
    // Apply concurrency limit to prevent memory overflow
    await Promise.all(
      mdLinks.map(link =>
        crawlLimit(() => crawl(link, name, baseUrl, visited, depth + 1, maxDepth, token)),
      ),
    )
    return
  }

  requestScheduler.addRequest(async () => {
    let mdLinks: string[] = []
    let htmlContent: string | null = null

    try {
      // Try to get MD content from Jina (preferred method)
      const mdContent = await fetchContent(normalizedUrl, token)
      await saveContent(name, baseUrl, normalizedUrl, mdContent)
      mdLinks = extractLinks(mdContent, normalizedUrl, baseUrl)
      consola.success(`Saved MD content from Jina for ${normalizedUrl}`)
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      consola.error(`Failed to fetch MD content from Jina for ${normalizedUrl}: ${errorMessage}`)

      // Jina failed, try to fetch original HTML and convert it locally
      try {
        consola.info(`Attempting local HTML to MD conversion for ${normalizedUrl}`)
        htmlContent = await fetchOriginalContent(normalizedUrl)
        const convertedMd = await htmlToMarkdown(htmlContent)
        await saveContent(name, baseUrl, normalizedUrl, convertedMd)
        mdLinks = extractLinks(convertedMd, normalizedUrl, baseUrl)
        consola.success(`Saved content using local HTML-to-MD conversion for ${normalizedUrl}`)
      }
      catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        consola.error(`Failed to convert HTML to MD for ${normalizedUrl}: ${fallbackMessage}`)
      }
    }

    // Try to extract links from original HTML for better coverage
    try {
      // If we haven't fetched HTML yet, fetch it now
      if (!htmlContent) {
        htmlContent = await fetchOriginalContent(normalizedUrl)
      }

      const htmlLinks = extractLinksFromHtml(htmlContent, normalizedUrl, baseUrl)

      // Combine MD links and HTML links
      if (htmlLinks.length > 0) {
        const allLinks = Array.from(new Set([...mdLinks, ...htmlLinks]))
        // Apply concurrency limit to prevent memory overflow
        await Promise.all(
          allLinks.map(link =>
            crawlLimit(() => crawl(link, name, baseUrl, visited, depth + 1, maxDepth, token)),
          ),
        )
        return
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      consola.warn(`Failed to fetch/parse HTML content for ${normalizedUrl}: ${errorMessage}`)
    }

    // Fallback: use MD links if available
    if (mdLinks.length > 0) {
      // Apply concurrency limit to prevent memory overflow
      await Promise.all(
        mdLinks.map(link =>
          crawlLimit(() => crawl(link, name, baseUrl, visited, depth + 1, maxDepth, token)),
        ),
      )
    }
  })
}

function getFilePath(name: string, baseUrl: string, url: string): string {
  const relativePath = calculateRelativePath(baseUrl, url)
  const dir = path.join('./docs', name, path.dirname(relativePath))
  const filename = path.basename(relativePath) === '' ? 'index' : path.basename(relativePath)
  return path.join(dir, `${filename}.md`)
}

export async function startCrawling(
  baseUrl: string,
  name: string,
  maxDepth: number,
  token?: string,
): Promise<void> {
  const visited = new Set<string>()
  await crawl(baseUrl, name, baseUrl, visited, 0, maxDepth, token)
}
