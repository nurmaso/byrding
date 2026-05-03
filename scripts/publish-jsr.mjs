#!/usr/bin/env node
/**
 * Publishes each package to JSR if its current version is not yet there.
 *
 * Checks the JSR registry directly rather than relying on whether npm just
 * published — this means JSR publishes correctly even when npm was skipped
 * (e.g. version already on npm from a prior run).
 *
 * Before each publish it syncs the version in jsr.json from package.json,
 * since changesets bumps package.json but not jsr.json.
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packages = ['core', 'react', 'vue']

async function existsOnJsr(scope, pkg, version) {
  try {
    const res = await fetch(`https://jsr.io/@${scope}/${pkg}/${version}_meta.json`)
    return res.status === 200
  } catch {
    return false
  }
}

for (const pkg of packages) {
  const name = `@byrding/${pkg}`
  const pkgDir = join(root, 'packages', pkg)
  const pkgJsonPath = join(pkgDir, 'package.json')
  const jsrJsonPath = join(pkgDir, 'jsr.json')

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
  const { version } = pkgJson

  if (await existsOnJsr('byrding', pkg, version)) {
    console.log(`Skipping ${name}@${version} — already on JSR.`)
    continue
  }

  const jsrJson = JSON.parse(readFileSync(jsrJsonPath, 'utf8'))
  jsrJson.version = version
  writeFileSync(jsrJsonPath, JSON.stringify(jsrJson, null, 2) + '\n')
  console.log(`Synced ${name} jsr.json → ${version}`)

  console.log(`Publishing ${name}@${version} to JSR…`)
  execSync('npx jsr publish --allow-dirty --allow-slow-types', { cwd: pkgDir, stdio: 'inherit' })
}
