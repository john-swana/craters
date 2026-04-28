const fs = require('fs');
const { execSync } = require('child_process');

// Read the original README
let readme = fs.readFileSync('README.md', 'utf8');

// Replace standard markdown links [label](guides/file.md) with typedoc-plugin-pages tags {@page file.md label}
readme = readme.replace(/\[(.*?)\]\(guides\/(.*?)\.md\)/g, '{@page $2.md $1}');

// Write the temporary README for TypeDoc
fs.writeFileSync('TYPEDOC_README.md', readme);

try {
  // Run TypeDoc
  execSync('npx typedoc', { stdio: 'inherit' });
} catch (err) {
  process.exit(1);
} finally {
  // Clean up the temporary file
  if (fs.existsSync('TYPEDOC_README.md')) {
    fs.unlinkSync('TYPEDOC_README.md');
  }
}
