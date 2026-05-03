#!/usr/bin/env node
/**
 * Publishes to JSR only the packages that changesets just published to npm.
 *
 * Reads PUBLISHED env var — the JSON array from changesets/action@v1's
 * `publishedPackages` output, e.g. [{"name":"@byrding/core","version":"0.1.0"}].
 *
 * Before each JSR publish it syncs the version in jsr.json from package.json,
 * since changesets bumps package.json but not jsr.json.
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const published = JSON.parse(process.env.PUBLISHED ?? '[]')
if (published.length === 0) {
  console.log('PUBLISHED is empty — nothing to publish to JSR.')
  process.exit(0)
}

const packages = ['core', 'react', 'vue']
const root = new URL('..', import.meta.url).pathname

for (const pkg of packages) {
  const name = `@byrding/${pkg}`
  if (!published.find((p) => p.name === name)) {
    console.log(`Skipping ${name} — not in this release.`)
    continue
  }

  const pkgDir = join(root, 'packages', pkg)
  const pkgJsonPath = join(pkgDir, 'package.json')
  const jsrJsonPath = join(pkgDir, 'jsr.json')

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
  const jsrJson = JSON.parse(readFileSync(jsrJsonPath, 'utf8'))

  jsrJson.version = pkgJson.version
  writeFileSync(jsrJsonPath, JSON.stringify(jsrJson, null, 2) + '\n')
  console.log(`Synced ${name} jsr.json → ${pkgJson.version}`)

  console.log(`Publishing ${name}@${pkgJson.version} to JSR…`)
  execSync('npx jsr publish --allow-dirty --allow-slow-types', { cwd: pkgDir, stdio: 'inherit' })
}
