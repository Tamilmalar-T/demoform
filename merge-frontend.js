const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

// Merge Frontend into frontend if both exist and are physically different directories
if (fs.existsSync('Frontend') && fs.existsSync('frontend')) {
  try {
    const s1 = fs.statSync('Frontend');
    const s2 = fs.statSync('frontend');
    const isSameDirectory = s1.ino === s2.ino && s1.dev === s2.dev;
    
    if (!isSameDirectory) {
      console.log('Merging Frontend (uppercase) into frontend (lowercase)...');
      copyFolderSync('Frontend', 'frontend');
      console.log('Merge completed successfully.');
    } else {
      console.log('No merging needed: paths point to the same physical directory on Windows.');
    }
  } catch (err) {
    console.error('Error comparing folders:', err);
  }
} else {
  console.log('No merging needed: one or both folders do not exist.');
}
