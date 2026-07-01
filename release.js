import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const packageJsonPath = path.resolve('./package.json')

try {
  // 1. Read current version from package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const currentVersion = packageJson.version

  const [major, minor, patch] = currentVersion.split('.').map(Number)

  // 2. Calculate the next mathematical options
  const nextPatch = `${major}.${minor}.${patch + 1}`
  const nextMinor = `${major}.${minor + 1}.0`
  const nextMajor = `${major + 1}.0.0`

  console.log(`\n📦 Current Version: \x1b[36m${currentVersion}\x1b[0m`)
  console.log('-------------------------------------------')
  console.log(`1️⃣  \x1b[32mPatch Update\x1b[0m   ➡️  ${nextPatch}  (Bug fixes, tiny tweaks)`)
  console.log(
    `2️⃣  \x1b[33mMinor Update\x1b[0m   ➡️  ${nextMinor}  (New features, backward-compatible)`
  )
  console.log(
    `3️⃣  \x1b[35mMajor Update\x1b[0m   ➡️  ${nextMajor}  (Massive overhauls, database changes)`
  )
  console.log('-------------------------------------------')

  rl.question('🚀 Select the type of update (1, 2, or 3): ', (choice) => {
    let newVersion = ''

    if (choice.trim() === '1') newVersion = nextPatch
    else if (choice.trim() === '2') newVersion = nextMinor
    else if (choice.trim() === '3') newVersion = nextMajor
    else {
      console.error('❌ Invalid selection. Aborting release.')
      rl.close()
      process.exit(1)
    }

    try {
      // 3. Update package.json dynamically
      console.log('\n📝 Updating package.json version...')
      packageJson.version = newVersion
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')
      console.log(`✅ Bumped version from ${currentVersion} ➡️ ${newVersion}`)

      // 4. Run the local production build
      console.log('\n📦 Compiling production assets (npm run build:win)...')
      execSync('npm run build:win', { stdio: 'inherit' })
      console.log('✅ Build compiled successfully!')

      // 5. NEW: Scan the dist folder to isolate the exact target installer file
      console.log('\n🔍 Scanning dist/ folder for the target executable...')
      const distFiles = fs.readdirSync(path.resolve('./dist'))

      // Look for the executable file that matches the new version number
      const targetedInstaller = distFiles.find(
        (file) => file.endsWith('.exe') && file.includes(newVersion)
      )

      if (!targetedInstaller) {
        throw new Error(
          `Could not find a generated .exe file matching version ${newVersion} inside the dist/ folder.`
        )
      }

      const exactInstallerPath = `./dist/${targetedInstaller}`
      const exactYmlPath = './dist/latest.yml'
      console.log(`🎯 Isolated Installer: \x1b[32m${targetedInstaller}\x1b[0m`)
      console.log(`🎯 Isolated Auto-Updater File: \x1b[32mlatest.yml\x1b[0m`)

      // 6. Deploy ONLY those two explicit files directly to GitHub Releases
      console.log(`\n☁️ Pushing release v${newVersion} to GitHub Releases...`)
      const releaseCmd = `gh release create v${newVersion} "${exactInstallerPath}" "${exactYmlPath}" --title "v${newVersion}" --notes "Krishnapriya Textiles Billing System Update"`
      execSync(releaseCmd, { stdio: 'inherit' })
      console.log(`\n🎉 Successfully published version v${newVersion} to GitHub Releases!`)

      // 7. Sync package.json version changes back to your source Git repository
      console.log('\n🔀 Committing and pushing version bump to Git repository...')
      execSync('git add package.json', { stdio: 'inherit' })
      execSync(`git commit -m "chore: bump version to v${newVersion}"`, { stdio: 'inherit' })
      execSync('git push origin main', { stdio: 'inherit' })
      console.log('✅ Git repository is perfectly in sync!')
    } catch (error) {
      console.error('\n❌ An error occurred during execution:', error.message)
    } finally {
      rl.close()
    }
  })
} catch (err) {
  console.error('❌ Failed to read package.json:', err.message)
  rl.close()
}
