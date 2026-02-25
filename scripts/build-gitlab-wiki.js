const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs', 'tiltcheck');
const WIKI_DIR = path.join(__dirname, '..', 'gitlab-wiki');

// Ensure wiki dir exists
if (!fs.existsSync(WIKI_DIR)) {
    fs.mkdirSync(WIKI_DIR, { recursive: true });
}

// Map old filenames to new wiki-friendly names
const fileMap = {};
const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));

files.forEach(file => {
    let newName = file;

    // Remove numeric prefixes: '0-intro.md' -> 'Intro.md'
    const match = file.match(/^\d+-(.*)$/);
    if (match) {
        // Capitalize each word and remove hyphens
        newName = match[1]
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('-') + (match[1].endsWith('.md') ? '' : '.md');
    } else if (file === 'index.md') {
        newName = 'Home.md';
    } else {
        // Just Capitalize
        newName = file.replace(/\.md$/, '').split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-') + '.md';
    }

    // Clean up any double extensions
    newName = newName.replace('.md.md', '.md');

    fileMap[file] = newName;
});

// Sidebar generation
let sidebarContent = '## TiltCheck Wiki\n\n';
sidebarContent += '- [Home](Home)\n';

const categories = {
    'Core Ecosystem': ['Ecosystem-Overview', 'Tools-Overview', 'Architecture', 'Rgaas-Pivot', 'Future-Roadmap'],
    'Modules & Tools': ['Tool-Specs-1', 'Tool-Specs-2', 'Tool-Specs-3', 'Trust-Engines', 'Justthetip', 'Poker-Module', 'Lockvault'],
    'System & APIs': ['Apis', 'Data-Models', 'System-Prompts', 'Discord-Bots', 'Diagrams'],
    'Development': ['Coding-Standards', 'Testing-Strategy', 'Migration-Checklist', 'Brand', 'Founder-Voice', 'Branch-Protection', 'Dashboard-Design', 'Components-Audits', 'Trust-Migration']
};

let uncategorized = Object.values(fileMap).map(f => f.replace('.md', '')).filter(f => f !== 'Home');

// Copy & Transform files
Object.entries(fileMap).forEach(([oldName, newName]) => {
    const oldPath = path.join(DOCS_DIR, oldName);
    const newPath = path.join(WIKI_DIR, newName);

    let content = fs.readFileSync(oldPath, 'utf8');

    // Rewrite internal links: [text](./old-file.md) -> [text](New-File)
    Object.entries(fileMap).forEach(([linkOld, linkNew]) => {
        const wikiLink = linkNew.replace('.md', '');
        // regex to replace ./old-file.md or old-file.md
        const regex1 = new RegExp(`\\(\\./${linkOld.replace(/\./g, '\\.')}\\)`, 'g');
        const regex2 = new RegExp(`\\(${linkOld.replace(/\./g, '\\.')}\\)`, 'g');
        content = content.replace(regex1, `(${wikiLink})`).replace(regex2, `(${wikiLink})`);
    });

    fs.writeFileSync(newPath, content);
});

// Construct sidebar
for (const [category, itemNames] of Object.entries(categories)) {
    sidebarContent += `\n### ${category}\n`;
    for (const name of itemNames) {
        // Find matching real filename case
        const match = Object.values(fileMap).find(v => v.toLowerCase() === name.toLowerCase() + '.md');
        if (match) {
            const link = match.replace('.md', '');
            sidebarContent += `- [${link.replace(/-/g, ' ')}](${link})\n`;
            uncategorized = uncategorized.filter(u => u !== link);
        }
    }
}

if (uncategorized.length > 0) {
    sidebarContent += `\n### Other Documentation\n`;
    for (const link of uncategorized) {
        if (link === '_sidebar') continue;
        sidebarContent += `- [${link.replace(/-/g, ' ')}](${link})\n`;
    }
}

fs.writeFileSync(path.join(WIKI_DIR, '_sidebar.md'), sidebarContent);

// Generate generic Home if index.md didn't exist or wasn't mapped
if (!fs.existsSync(path.join(WIKI_DIR, 'Home.md'))) {
    fs.writeFileSync(path.join(WIKI_DIR, 'Home.md'), `# TiltCheck Wiki\n\nWelcome to the TiltCheck ecosystem wiki. Please use the sidebar on the right to navigate through the modules, architecture, and deployment specs.\n\n## Parts & Pieces\n- **Trust Engines:** Casino & User scoring\n- **Bots:** Discord integrated core logic\n- **Modules:** JustTheTip, CollectClock, SusLink, QualifyFirst, and more.\n`);
}

console.log('✅ GitLab Wiki successfully generated in ./gitlab-wiki');
