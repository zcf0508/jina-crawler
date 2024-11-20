# Jina Crawler

[![NPM version](https://img.shields.io/npm/v/jina-crawler?color=a1b858&label=)](https://www.npmjs.com/package/jina-crawler)

An LLM-friendly crawler powered by Jina AI. This tool helps you crawl websites and process the content in a way that's optimized for Large Language Models.

## Features

- Web crawling with configurable depth
- Integration with Jina AI for content processing
- Easy-to-use CLI interface
- TypeScript support

## Installation

```bash
npm install jina-crawler
# or
pnpm add jina-crawler
# or
yarn add jina-crawler
```

## Usage

You can use Jina Crawler via the command line:

```bash
jina-crawler --baseUrl <url> --name <project-name> [options]
```

### Options

- `--baseUrl`, `-u`: Target URL to crawl (required)
- `--name`, `-n`: Project name (required)
- `--maxDepth`: Maximum depth to crawl (default: 2)
- `--token`: Your Jina AI token (can also be set via JINA_READER_TOKEN environment variable)

### Example

```bash
jina-crawler --baseUrl https://example.com --name my-project --maxDepth 3
```

## Authentication

To use Jina Crawler, you'll need a Jina AI token. You can get one by visiting [https://jina.ai/reader/](https://jina.ai/reader/).

You can provide the token in two ways:
1. Via the `--token` command line option
2. Via the `JINA_READER_TOKEN` environment variable

## Development

```bash
# Install dependencies
pnpm install

# Run type checking
pnpm typecheck

# Build the project
pnpm build

# Run linting
pnpm lint
```

## License

MIT License 2024 zcf0508
