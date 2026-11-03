import fs from 'fs';
import path from 'path';

const gradleFile = path.resolve('node_modules/@capacitor/local-notifications/android/build.gradle');
if (fs.existsSync(gradleFile)) {
  let content = fs.readFileSync(gradleFile, 'utf8');
  if (content.includes('jvmToolchain(21)') && !content.includes('// jvmToolchain(21)')) {
    content = content.replace(/kotlin\s*\{\s*jvmToolchain\(21\)\s*\}/g, '// kotlin { jvmToolchain(21) }');
    fs.writeFileSync(gradleFile, content, 'utf8');
    console.log('[Patch] @capacitor/local-notifications jvmToolchain patched successfully.');
  }
}
