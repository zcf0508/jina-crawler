import * as fs from 'node:fs'
import * as path from 'node:path'
import { URL } from 'node:url'
import { consola } from 'consola'

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
  const urlRegex = /\[.*?\]\((.*?)\)/g // regex to match [text](url)
  let match
  // eslint-disable-next-line no-cond-assign
  while ((match = urlRegex.exec(content)) !== null) {
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
    const links = extractLinks(content, baseUrl)
    await Promise.all(links.map(link => crawl(link, name, baseUrl, visited, depth + 1, maxDepth)))
    return
  }

  requestScheduler.addRequest(async () => {
    const content = await fetchContent(url, token)
    await saveContent(name, baseUrl, url.split('#')[0], content)
    const links = extractLinks(content, baseUrl)
    await Promise.all(links.map(link => crawl(link, name, baseUrl, visited, depth + 1, maxDepth)))
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
