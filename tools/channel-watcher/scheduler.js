import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const analyzeScript = path.resolve(__dirname, 'analyze-log.js');
const nodeCmd = process.execPath; // full path to current node binary

const INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

function runAnalyzer() {
    console.log(chalk.bold.blue(`\n[Scheduler] Starting automated analysis pass at ${new Date().toLocaleTimeString()}...`));
    
    const proc = exec(`"${nodeCmd}" "${analyzeScript}"`, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error(chalk.red(`[Scheduler] Error: ${error.message}`));
            return;
        }
        if (stderr) {
            console.error(chalk.yellow(`[Scheduler] Stderr: ${stderr}`));
        }
        console.log(chalk.green(`[Scheduler] Analysis Complete.`));
        console.log(stdout);
    });
}

// Initial run
runAnalyzer();

// Schedule repeated runs
setInterval(runAnalyzer, INTERVAL_MS);

console.log(chalk.bold.green(`\n🚀 TiltCheck Channel Watcher Scheduler Active (Interval: 2 mins)`));
console.log(chalk.gray(`Press Ctrl+C to stop.\n`));
