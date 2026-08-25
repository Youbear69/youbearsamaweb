const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname);

async function checkGitStatus() {
  try {
    // 1. Initialize git repo if not already initialized
    const gitDirExists = fs.existsSync(path.join(dir, '.git'));
    if (!gitDirExists) {
      console.log('Initializing Git repository...');
      await git.init({ fs, dir });
    }

    // 2. Read .gitignore patterns
    const gitignoreContent = fs.readFileSync(path.join(dir, '.gitignore'), 'utf-8');
    const ignoreLines = gitignoreContent.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    console.log('.gitignore patterns:', ignoreLines);

    // 3. List all files in directory
    function getAllFiles(dirPath, arrayOfFiles = []) {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const relPath = path.relative(dir, fullPath).replace(/\\/g, '/');

        if (relPath === '.git' || relPath.startsWith('.git/')) return;
        if (relPath === 'node_modules' || relPath.startsWith('node_modules/')) return;

        if (fs.statSync(fullPath).isDirectory()) {
          getAllFiles(fullPath, arrayOfFiles);
        } else {
          arrayOfFiles.push(relPath);
        }
      });
      return arrayOfFiles;
    }

    const allFiles = getAllFiles(dir);
    console.log('Total files found (excluding node_modules & .git):', allFiles.length);

    // Explicit check for sensitive key file
    const sensitiveFile = 'vtubergame-676dc-firebase-adminsdk-fbsvc-082a608eba.json';
    const isSensitivePresent = allFiles.includes(sensitiveFile);
    console.log(`Sensitive key file present on disk: ${isSensitivePresent}`);

    // Filter files to stage
    const filesToStage = allFiles.filter(f => {
      if (f === sensitiveFile) return false;
      if (f.startsWith('database/')) return false;
      if (f.startsWith('scratch/')) return false;
      return true;
    });

    console.log(`Files ready to stage (${filesToStage.length} files):`);
    filesToStage.forEach(f => console.log(' - ' + f));

    // Verify sensitive file is NOT in filesToStage
    if (filesToStage.includes(sensitiveFile)) {
      throw new Error('SECURITY ALERT: Sensitive key file was accidentally included in staging list!');
    }

    console.log('\nSECURITY VERIFICATION PASSED: vtubergame-676dc-firebase-adminsdk-fbsvc-082a608eba.json will NOT be added to Git!');

    // Stage files
    for (const filepath of filesToStage) {
      await git.add({ fs, dir, filepath });
    }

    // Check status of sensitive file in git
    const status = await git.status({ fs, dir, filepath: sensitiveFile });
    console.log(`Git status for sensitive file (${sensitiveFile}):`, status);

    // Create commit
    const sha = await git.commit({
      fs,
      dir,
      author: {
        name: 'Youbear69',
        email: 'youbear@vtubergame.com',
      },
      message: 'Initial commit: 12 Vtuber Zodiac Web App with Admin Panel and Firebase Integration'
    });

    console.log('Successfully created Git commit:', sha);

  } catch (err) {
    console.error('Git error:', err);
  }
}

checkGitStatus();
