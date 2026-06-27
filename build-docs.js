const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read the original README
let readme = fs.readFileSync('README.md', 'utf8');

// Replace standard markdown links [label](guides/file.md) with typedoc-plugin-pages tags {@page file.md label}
readme = readme.replace(/\[(.*?)\]\(guides\/(.*?)\.md\)/g, '{@page $2.md $1}');

// The CHANGELOG lives at the repo root, outside guides/, so the guides regex above
// doesn't touch it and TypeDoc never emits it — the homepage link 404s on the site.
// Rewrite it to a page tag and stage a copy where the pages plugin reads its sources
// so it renders as an in-site page (see the "Changelog" entry in typedoc.json).
readme = readme.replace(/\[(.*?)\]\(CHANGELOG\.md\)/g, '{@page changelog.md $1}');

// Write the temporary README for TypeDoc
fs.writeFileSync('TYPEDOC_README.md', readme);

// Stage the root CHANGELOG.md inside the pages source dir (guides/) so the registered
// "Changelog" page can be generated from the single canonical changelog (no drift).
const stagedChangelog = path.join('guides', 'changelog.md');
fs.copyFileSync('CHANGELOG.md', stagedChangelog);

try {
  // Run TypeDoc
  execSync('npx typedoc', { stdio: 'inherit' });
} catch (err) {
  process.exit(1);
} finally {
  // Clean up the temporary files
  if (fs.existsSync('TYPEDOC_README.md')) {
    fs.unlinkSync('TYPEDOC_README.md');
  }
  if (fs.existsSync(stagedChangelog)) {
    fs.unlinkSync(stagedChangelog);
  }
}
