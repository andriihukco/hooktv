import fs from 'node:fs'
import vm from 'node:vm'

const sourcePath = new URL('../src/services/online_sources_catalog.js', import.meta.url)
const outputPath = new URL('../config/online-sources.json', import.meta.url)
const source = fs.readFileSync(sourcePath, 'utf8')
const match = /^const SOURCE_CATALOG = ([\s\S]*?)\n\nexport default SOURCE_CATALOG/m.exec(source)

if(!match) throw new Error('Could not find SOURCE_CATALOG in src/services/online_sources_catalog.js')

const catalog = vm.runInNewContext('(' + match[1] + ')')

if(!Array.isArray(catalog)) throw new Error('Online source catalog must be an array')

const keys = catalog.map(source => source.key)

if(new Set(keys).size !== keys.length) throw new Error('Online source catalog contains duplicate keys')

fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2) + '\n')
console.log(`Wrote ${catalog.length} online sources to config/online-sources.json`)
