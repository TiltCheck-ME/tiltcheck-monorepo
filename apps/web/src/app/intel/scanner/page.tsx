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
                        <div className="status-item status-pass">
                        <span className="status-icon status-icon-w">W</span>
                        Stake.com: $50 Daily Reload
                        </div>
                        <div className="status-item status-pass">
                        <span className="status-icon status-icon-w">W</span>
                        Roobet: 100% Weekly Match
                        </div>
                        <div className="status-item status-warn">
                        <span className="status-icon status-icon-warn">!</span>
                        SlottyVegas: Bonus capped 5x
                        </div>
                        <div className="status-item status-fail">
                        <span className="status-icon status-icon-l">L</span>
                        BC.Game: Bonus paused
                        </div>
                    </div>

                    <div className="terminal-divider"></div>

                    <div className="prediction-section">
                        <div className="prompt-prefix">$</div>
                        <span className="prompt-text">PREDICTION ENGINE</span>
                    </div>

                    <div className="vibe-check">
                        <p>next refresh: <span id="countdown">2h 34m 12s</span></p>
                        <p>vibe check: 
                        <span className="vibe-bar-container">
                            <span className="vibe-bar" style={{width: "94%"}}></span>
                        </span>
                        <span className="vibe-percentage">94%</span>
                        </p>
                    </div>
                    </div>
                </div>
            </section>
        </div>
    );
}