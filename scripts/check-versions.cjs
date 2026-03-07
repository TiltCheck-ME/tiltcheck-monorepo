const fs = require('fs');
const { execSync } = require('child_process');

try {
    const files = execSync('git ls-files "**/package.json"').toString().split('\n').filter(Boolean);
    files.push('package.json'); // add root

    files.forEach(f => {
        if (!fs.existsSync(f)) return;
        try {
            const content = fs.readFileSync(f, 'utf8');
            const pkg = JSON.parse(content);
            if (!pkg.version) {
                console.log(`Missing version in: ${f}`);
            } else {
                // Check for invalid version (simplistic)
                if (typeof pkg.version !== 'string' || pkg.version.trim() === '') {
                    console.log(`Invalid version string in: ${f} -> "${pkg.version}"`);
                }
            }
        } catch (e) {
            console.log(`Parse error in ${f}: ${e.message}`);
        }
    });
} catch (err) {
    console.error(err);
}
