import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const packageJsonPath = path.resolve('./package.json');

try {
  // 1. Read current version from package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;
  
  // Split the version into [major, minor, patch] numbers
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  // 2. Calculate the next mathematical options
  const nextMajor = `${major + 1}.0.0`;
  const nextMinor = `${major}.${minor + 1}.0`;
  const nextPatch = `${major}.${minor}.${patch + 1}`;

  console.log(`\n📦 Current Version: \x1b[36m${currentVersion}\x1b[0m`);
  console.log('-------------------------------------------');
  console.log(`1️⃣  \x1b[32mPatch Update\x1b[0m   ➡️  ${nextPatch}  (Bug fixes, tiny tweaks)`);
  console.log(`2️⃣  \x1b[33mMinor Update\x1b[0m   ➡️  ${nextMinor}  (New features, backward-compatible)`);
  console.log(`3️⃣  \x1b[35mMajor Update\x1b[0m   ➡️  ${nextMajor}  (Massive overhauls, database changes)`);
  console.log('-------------------------------------------');

  // 3. Ask the user to choose an option
  rl.question('🚀 Select the type of update (1, 2, or 3): ', (choice) => {
    let newVersion = '';

    if (choice.trim() === '1') newVersion = nextPatch;
    else if (choice.trim() === '2') newVersion = nextMinor;
    else if (choice.trim() === '3') newVersion = nextMajor;
    else {
      console.error('❌ Invalid selection. Aborting release.');
      rl.close();
      process.exit(1);
    }

    try {
      // 4. Update package.json dynamically
      console.log('\n📝 Updating package.json version...');
      packageJson.version = newVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      console.log(`✅ Bumped version from ${currentVersion} ➡️ ${newVersion}`);

      // 5. Run the local production build
      console.log('\n📦 Compiling production assets (npm run build:win)...');
      execSync('npm run build:win', { stdio: 'inherit' });
      console.log('✅ Build compiled successfully!');

      // 6. Deploy assets directly to GitHub Releases
      console.log(`\n☁️ Pushing release v${newVersion} to GitHub...`);
      const releaseCmd = `gh release create v${newVersion} ./dist/*.exe ./dist/latest.yml --title "v${newVersion}" --notes "Krishnapriya Textiles Billing System Update"` ;
      execSync(releaseCmd, { stdio: 'inherit' });
      console.log(`\n🎉 Successfully published version v${newVersion}!`);

    } catch (error) {
      console.error('\n❌ An error occurred during execution:', error.message);
    } finally {
      rl.close();
    }
  });

} catch (err) {
  console.error('❌ Failed to read package.json:', err.message);
  rl.close();
}