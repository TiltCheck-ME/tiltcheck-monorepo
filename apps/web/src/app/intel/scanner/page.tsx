/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
import "@/styles/terminal.css";

export default function ScannerPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <header className="tool-header terminal-header text-center">
                <div className="container">
                    <h1 className="terminal-title">Terminal v1.2.1 // DEGEN_OS</h1>
                    <p className="terminal-subtitle">bonus cycle intelligence</p>
                </div>
            </header>

            <section className="terminal-section">
                <div className="container">
                    <div className="terminal-box">
                    <div className="terminal-prompt">
                        <span className="prompt-prefix">$</span>
                        <span className="prompt-text">LIVE BONUS SCANNER</span>
                    </div>

                    <div className="status-list">
                        <div className="p-4 text-center text-xs font-mono text-gray-600">
                          NO LIVE DATA. Connect your casino accounts via the Chrome extension to enable live bonus scanning.
                        </div>
                    </div>

                    <div className="terminal-divider"></div>

                    <div className="prediction-section">
                        <div className="prompt-prefix">$</div>
                        <span className="prompt-text">PREDICTION ENGINE</span>
                    </div>

                    <div className="vibe-check">
                        <p>next refresh: <span id="countdown" className="text-gray-600">— connect accounts to enable —</span></p>
                        <p>vibe check: <span className="text-gray-600 font-mono text-xs">N/A</span></p>
                    </div>
                    </div>
                </div>
            </section>
        </div>
    );
}