/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Script to generate/update CHANGELOG.md files for individual packages
 * based on the standardized template.
 */

const args = process.argv.slice(2);
const params: Record<string, string> = {};

for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
        const key = args[i].slice(2);
        const value = args[i + 1];
        if (value && !value.startsWith('--')) {
            params[key] = value;
            i++;
        } else {
            params[key] = 'true';
        }
    }
}

const packagePath = params.package || '.';
const version = params.version;
const changeType = params.type || 'Added';
const description = params.description;
const targetChangelog = path.resolve(packagePath, 'CHANGELOG.md');
const templatePath = path.resolve('.github', 'CHANGELOG_TEMPLATE.md');

if (!version || !description) {
    console.error('Usage: npx tsx scripts/generate-changelog.ts --package <path> --version <v> --type <Added|Changed|Fixed|Removed|Security> --description "<msg>"');
    process.exit(1);
}

const date = new Date().toISOString().split('T')[0];

async function generate() {
    try {
        let template = '';
        if (fs.existsSync(templatePath)) {
            template = fs.readFileSync(templatePath, 'utf8');
        } else {
            // Fallback if template is missing
            template = '## [{version}] - {date}\n\n### {type}\n- {description}\n';
        }

        // Replace placeholders
        let entry = template
            .replace('{version}', version)
            .replace('{date}', date);

        // If the template has specific sections, we try to insert our change into the correct one.
        // If it's a generic template, we might just append.

        // For this implementation, we'll check if the CHANGELOG.md exists.
        // If it does, we prepend the new version after the header (if present).

        let currentContent = '';
        const boilerplate = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n';

        if (fs.existsSync(targetChangelog)) {
            currentContent = fs.readFileSync(targetChangelog, 'utf8');
            if (!currentContent.startsWith('# Changelog')) {
                currentContent = boilerplate + '\n' + currentContent;
            }
        } else {
            currentContent = boilerplate;
        }

        let formattedEntry = `## [${version}] - ${date}\n\n`;
        const types = ['Added', 'Changed', 'Fixed', 'Removed', 'Security'];

        // Check if version already exists in CHANGELOG.md
        const versionHeader = `## [${version}]`;
        if (currentContent.includes(versionHeader)) {
            // Version already exists, find its block
            const nextVersionIndex = currentContent.indexOf('## [', currentContent.indexOf(versionHeader) + 1);
            let versionBlock = '';
            if (nextVersionIndex === -1) {
                versionBlock = currentContent.slice(currentContent.indexOf(versionHeader));
            } else {
                versionBlock = currentContent.slice(currentContent.indexOf(versionHeader), nextVersionIndex);
            }

            let newVersionBlock = versionBlock;
            const sectionHeader = `### ${changeType}`;

            if (versionBlock.includes(sectionHeader)) {
                // Append to existing section
                const lines = versionBlock.split('\n');
                const sectionIndex = lines.findIndex(l => l.startsWith(sectionHeader));
                let insertIndex = sectionIndex + 1;
                while (insertIndex < lines.length && (lines[insertIndex].trim().startsWith('-') || lines[insertIndex].trim() === '')) {
                    if (lines[insertIndex].trim() === '' && (insertIndex + 1 >= lines.length || !lines[insertIndex + 1].trim().startsWith('-'))) break;
                    insertIndex++;
                }
                lines.splice(insertIndex, 0, `- ${description}`);
                newVersionBlock = lines.join('\n');
            } else {
                // Add new section to version block
                newVersionBlock = versionBlock.trimEnd() + `\n\n### ${changeType}\n- ${description}\n\n`;
            }
            currentContent = currentContent.replace(versionBlock, newVersionBlock);
        } else {
            // New version, prepend after boilerplate
            const insertIndex = currentContent.includes('documented in this file.')
                ? currentContent.indexOf('documented in this file.') + 'documented in this file.'.length
                : currentContent.indexOf('\n\n') + 2;

            formattedEntry += `### ${changeType}\n- ${description}\n\n`;
            currentContent = currentContent.slice(0, insertIndex) + '\n\n' + formattedEntry + currentContent.slice(insertIndex);
        }
        fs.writeFileSync(targetChangelog, currentContent);
        console.log(`Successfully updated ${targetChangelog}`);
    } catch (error) {
        console.error('Error generating changelog:', error);
    }
}

generate();
