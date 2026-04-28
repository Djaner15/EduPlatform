import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const srcRoot = path.join(projectRoot, 'src')
const outputPath = path.join(projectRoot, 'i18n-candidates.json')

const targetExtensions = new Set(['.ts', '.tsx', '.js', '.jsx'])

const walk = (directory, files = []) => {
  readdirSync(directory).forEach((entry) => {
    const fullPath = path.join(directory, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') {
        return
      }

      walk(fullPath, files)
      return
    }

    if (targetExtensions.has(path.extname(fullPath))) {
      files.push(fullPath)
    }
  })

  return files
}

const stringPattern = /(?:>|=)\s*(["'`])((?:(?!\1).)*[A-Za-zА-Яа-я][^"'`<{]*)\1/g

const isIgnorable = (value) => {
  const trimmed = value.trim()

  return (
    trimmed.length < 3 ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('http') ||
    trimmed.startsWith('#') ||
    trimmed.includes('className') ||
    trimmed.includes('aria-') ||
    /^[A-Z0-9_./-]+$/.test(trimmed)
  )
}

const results = walk(srcRoot).flatMap((filePath) => {
  const content = readFileSync(filePath, 'utf8')
  const relativePath = path.relative(projectRoot, filePath)
  const matches = []

  for (const match of content.matchAll(stringPattern)) {
    const value = match[2]?.trim()
    if (!value || isIgnorable(value)) {
      continue
    }

    const line = content.slice(0, match.index).split('\n').length
    matches.push({ line, value })
  }

  if (!matches.length) {
    return []
  }

  return [{ file: relativePath, entries: matches }]
})

writeFileSync(outputPath, JSON.stringify(results, null, 2))
console.log(`Wrote ${results.length} file entries to ${path.relative(projectRoot, outputPath)}`)
