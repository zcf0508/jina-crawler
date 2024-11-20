import * as fs from 'node:fs'
import * as path from 'node:path'
import { URL } from 'node:url'
import { consola } from 'consola'
import { parse } from 'node-html-parser'

const rateLimit = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

async function fetchContent(url: string, token?: string): Promise<string> {
  const proxyUrl = `https://r.jina.ai${url.startsWith('/') ? '' : '/'}${url}`
  consola.log(`Fetching content from: ${proxyUrl}`)
  const response = await fetch(proxyUrl, {
    method: 'GET',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }
  return response.text()
}

async function fetchOriginalContent(url: string): Promise<string> {
  consola.log(`Fetching original content from: ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch original content from ${url}`)
  }
  return response.text()
}

async function saveContent(name: string, baseUrl: string, url: string, content: string): Promise<void> {
  const baseUrlObj = new URL(baseUrl)
  const urlObj = new URL(url, baseUrl)
  const relativePath = path.join(baseUrlObj.pathname, urlObj.pathname).replace(/^\//, '')

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

function extractLinks(content: string, baseUrl: string): string[] {
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
      const absoluteUrl = new URL(link, baseUrl).href // transfer relative url to absolute
      if (absoluteUrl.startsWith(baseUrl)) {
        urls.push(absoluteUrl)
      }
    }
    catch (e: unknown) {
      consola.warn(`Invalid URL: ${link}\n${e}`)
    }
  }
  return Array.from(new Set(urls))
}

function extractLinksFromHtml(content: string, baseUrl: string): string[] {
  const urls: string[] = []
  const root = parse(content)
  const links = root.querySelectorAll('a')

  // Common image extensions to ignore
  const imageExtensions = /\.(?:jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i

  links.forEach((link) => {
    const href = link.getAttribute('href')
    if (href && !imageExtensions.test(href)) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href
        if (absoluteUrl.startsWith(baseUrl)) {
          urls.push(absoluteUrl)
        }
      }
      catch (e: unknown) {
        consola.error(`Invalid URL: ${href}\n${e}`)
      }
    }
  })

  return urls
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
  if (depth > maxDepth || visited.has(url)) {
    return
  }

  visited.add(url)
  const filePath = getFilePath(name, baseUrl, url)

  // check if file already exists
  if (fs.existsSync(filePath)) {
    consola.log(`Reading existing file: ${filePath}`)
    const content = fs.readFileSync(filePath, 'utf-8')
    const mdLinks = extractLinks(content, baseUrl)
    await Promise.all(mdLinks.map(link => crawl(link, name, baseUrl, visited, depth + 1, maxDepth, token)))
    return
  }

  requestScheduler.addRequest(async () => {
    // First try to get MD content from Jina as it's more reliable
    const mdContent = await fetchContent(url, token)
    await saveContent(name, baseUrl, url.split('#')[0], mdContent)
    const mdLinks = extractLinks(mdContent, baseUrl)

    try {
      // Try to fetch and parse original HTML content
      const originalContent = await fetchOriginalContent(url)
      const htmlLinks = extractLinksFromHtml(originalContent, baseUrl)

      // If HTML parsing was successful and found links, combine them with MD links
      if (htmlLinks.length > 0) {
        const allLinks = Array.from(new Set([...mdLinks, ...htmlLinks]))
        await Promise.all(allLinks.map(link => crawl(link, name, baseUrl, visited, depth + 1, maxDepth, token)))
        return
      }
    }
    catch (e) {
      consola.warn(`Failed to fetch/parse original content from ${url}, falling back to MD links only: ${e}`)
    }

    // Fallback: use only MD links if HTML parsing failed or found no links
    await Promise.all(mdLinks.map(link => crawl(link, name, baseUrl, visited, depth + 1, maxDepth, token)))
  })
}

function getFilePath(name: string, baseUrl: string, url: string): string {
  const baseUrlObj = new URL(baseUrl)
  const urlObj = new URL(url, baseUrl)
  const relativePath = path.join(baseUrlObj.pathname, urlObj.pathname).replace(/^\//, '')
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
