// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const analyzeScript = path.resolve(__dirname, 'analyze-log.js');
const nodeCmd = process.execPath; // full path to current node binary

const INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
let isAnalyzerRunning = false;

function runAnalyzer() {
    if (isAnalyzerRunning) {
        console.warn(chalk.yellow('[Scheduler] Previous analysis pass is still running. Skipping overlap.'));
        return;
    }

    isAnalyzerRunning = true;
    console.log(chalk.bold.blue(`\n[Scheduler] Starting automated analysis pass at ${new Date().toLocaleTimeString()}...`));
    
    execFile(nodeCmd, [analyzeScript], { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error(chalk.red(`[Scheduler] Error: ${error.message}`));
            isAnalyzerRunning = false;
            return;
        }
        if (stderr) {
            console.error(chalk.yellow(`[Scheduler] Stderr: ${stderr}`));
        }
        console.log(chalk.green(`[Scheduler] Analysis Complete.`));
        console.log(stdout);
        isAnalyzerRunning = false;
    });
}

// Initial run
runAnalyzer();

// Schedule repeated runs
setInterval(runAnalyzer, INTERVAL_MS);

console.log(chalk.bold.green(`\nTiltCheck Channel Watcher Scheduler Active (Interval: 2 mins)`));
console.log(chalk.gray(`Press Ctrl+C to stop.\n`));
