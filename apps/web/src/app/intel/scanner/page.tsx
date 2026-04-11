/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11 */
import "@/styles/terminal.css";
import Link from "next/link";

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
                        <div className="p-6 border border-[#283347] bg-black/40 text-center flex flex-col items-center gap-4">
                            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                                NO LIVE DATA — Extension not detected
                            </p>
                            <p className="text-xs font-mono text-gray-600 max-w-sm leading-relaxed">
                                The bonus scanner reads your active casino sessions in real-time.
                                It requires the TiltCheck Chrome extension to function.
                            </p>
                            <Link
                                href="/extension"
                                className="inline-block px-6 py-3 bg-[#17c3b2] text-black font-black text-xs uppercase tracking-widest hover:bg-[#48d5c6] transition-colors"
                            >
                                Get the Extension &rarr;
                            </Link>
                            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                                Extension is in closed beta. Apply on the extension page.
                            </p>
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

            <footer className="mt-20 py-8 text-center text-xs text-gray-600 uppercase tracking-[0.3em]">
                Made for Degens. By Degens.
            </footer>
        </div>
    );
}