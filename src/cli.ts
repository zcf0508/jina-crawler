import process from 'node:process'
import { defineCommand, runMain } from 'citty'
import { startCrawling } from './index'

const main = defineCommand({
  meta: {
    name: 'jina-crawler',
    description: 'An LLM-friendly crawler from Jina.',
  },
  args: {
    baseUrl: {
      type: 'string',
      description: 'Target URL.',
      alias: 'u',
      required: true,
    },
    name: {
      type: 'string',
      alias: 'n',
      required: true,
    },
    maxDepth: {
      type: 'string',
      description: 'Max depth to crawl.',
      default: '2',
    },
    token: {
      type: 'string',
      description: 'Visite `https://jina.ai/reader/` to get your token.',
    },
  },
  async run({ args }) {
    const { baseUrl, name, maxDepth: _maxDepth, token: _token } = args

    const depth = Number.parseInt(_maxDepth, 10)

    let token = _token

    // read token from env
    if (!token && process.env.JINA_READER_TOKEN) {
      token = process.env.JINA_READER_TOKEN
    }

    await startCrawling(baseUrl, name, depth, token)
  },
})

runMain(main)
