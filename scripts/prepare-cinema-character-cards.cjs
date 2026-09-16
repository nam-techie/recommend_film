const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require('sharp')

async function main() {
  const root = path.resolve(__dirname, '../public/3d')
  await fs.mkdir(path.join(root, 'character-cards'), { recursive: true })
  for (const name of ['male', 'female', 'male_vip', 'female_vip']) {
    const result = await sharp(path.join(root, `${name}.png`))
      .resize({ width: 350, withoutEnlargement: true }).webp({ quality: 85 })
      .toFile(path.join(root, 'character-cards', `${name}.webp`))
    console.log(`${name}: ${result.size} bytes`)
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
