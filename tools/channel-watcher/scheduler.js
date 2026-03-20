import { exec } from 'child_process';
import chalk from 'chalk';

const INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

function runAnalyzer() {
    console.log(chalk.bold.blue(`\n[Scheduler] Starting automated analysis pass at ${new Date().toLocaleTimeString()}...`));
    
    // Execute analyze-log.js using node
    const proc = exec('node analyze-log.js', (error, stdout, stderr) => {
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
