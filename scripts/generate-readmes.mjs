#!/usr/bin/env node
/**
 * Generates packages/{pkg}/README.md from docs/api/{pkg}.md.
 * Inserts an ## Install section before the first ## content heading.
 * Run via `pnpm generate:readmes` or automatically before publish in CI.
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const packages = {
  core: {
    npm: 'npm install @byrding/core',
    jsr: 'npx jsr add @byrding/core',
  },
  react: {
    npm: 'npm install @byrding/react',
    jsr: 'npx jsr add @byrding/react',
  },
  vue: {
    npm: 'npm install @byrding/vue',
    jsr: 'npx jsr add @byrding/vue',
  },
}

for (const [pkg, { npm, jsr }] of Object.entries(packages)) {
  const src = readFileSync(join(root, 'docs/api', `${pkg}.md`), 'utf8')

  const installSection =
    `## Install\n\n` +
    `\`\`\`bash\n${npm}\n# or\n${jsr}\n\`\`\`\n\n`

  // Insert before the first ## heading in the doc
  const readme = src.replace(/\n(## )/, `\n${installSection}$1`)

  writeFileSync(join(root, 'packages', pkg, 'README.md'), readme)
  console.log(`Generated packages/${pkg}/README.md`)
}
