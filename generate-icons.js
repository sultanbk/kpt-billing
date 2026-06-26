// Script to generate app icons from SVG
const sharp = require('sharp')
const pngToIcoModule = require('png-to-ico')
const pngToIco = pngToIcoModule.default || pngToIcoModule
const fs = require('fs')
const path = require('path')

const BUILD_DIR = path.join(__dirname, 'build')
const SVG_PATH = path.join(BUILD_DIR, 'icon.svg')
const PNG_PATH = path.join(BUILD_DIR, 'icon.png')
const ICO_PATH = path.join(BUILD_DIR, 'icon.ico')
const RES_PNG = path.join(__dirname, 'resources', 'icon.png')

async function generate() {
  console.log('Reading SVG...')
  const svgBuffer = fs.readFileSync(SVG_PATH)

  // Generate 512x512 PNG
  console.log('Generating 512x512 PNG...')
  await sharp(svgBuffer).resize(512, 512).png().toFile(PNG_PATH)
  console.log(`  -> ${PNG_PATH}`)

  // Copy to resources/icon.png
  fs.copyFileSync(PNG_PATH, RES_PNG)
  console.log(`  -> ${RES_PNG}`)

  // Generate ICO (256x256 PNG input, library handles multi-size)
  console.log('Generating ICO...')
  const png256 = path.join(BUILD_DIR, 'icon-256.png')
  await sharp(svgBuffer).resize(256, 256).png().toFile(png256)

  const icoBuffer = await pngToIco(png256)
  fs.writeFileSync(ICO_PATH, icoBuffer)
  fs.unlinkSync(png256)
  console.log(`  -> ${ICO_PATH}`)
  console.log(`  -> ${ICO_PATH}`)

  console.log('Done! Icons generated successfully.')
}

generate().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
