/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-32 pb-24 px-4 bg-black relative">
      <div className="max-w-3xl mx-auto flex flex-col gap-10 animate-in fade-in duration-500">

        <header className="border-b border-[#283347] pb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">Legal</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#17c3b2]">Privacy Policy</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-gray-500">
            Version 1.1 — Last updated 2026-04-11
          </p>
          <p className="mt-4 text-sm text-gray-400 leading-relaxed">
            Short version: we collect the minimum required to make TiltCheck work. We don&apos;t sell it.
            We don&apos;t store your private keys. We&apos;re not trying to build an ad profile on you.
          </p>
        </header>

        <section className="space-y-6">

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">01. What We Collect</h2>
            <ul className="text-sm text-gray-400 leading-relaxed space-y-2 list-none">
              <li><span className="text-[#17c3b2]">Discord ID and username</span> — collected at OAuth2 sign-in for account identity</li>
              <li><span className="text-[#17c3b2]">Solana wallet address</span> — public key only, collected when you run <code className="text-gray-300 bg-[#1a1a2e] px-1">/linkwallet</code></li>
              <li><span className="text-[#17c3b2]">Session data</span> — tilt signals, session goals, and vault lock events you explicitly create</li>
              <li><span className="text-[#17c3b2]">Terms acceptance</span> — timestamp and version recorded at onboarding</li>
              <li><span className="text-[#17c3b2]">Support messages</span> — content you submit via <code className="text-gray-300 bg-[#1a1a2e] px-1">/support</code></li>
            </ul>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">02. What We Never Collect</h2>
            <ul className="text-sm text-gray-400 leading-relaxed space-y-2 list-none">
              <li>— Private keys, seed phrases, or wallet passwords</li>
              <li>— Payment card numbers or bank details</li>
              <li>— Government ID or KYC documents</li>
              <li>— Browsing history outside of the Chrome extension&apos;s active session detection</li>
              <li>— Any data from gambling sites beyond session telemetry you grant via the extension</li>
            </ul>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">03. How We Use It</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your data is used exclusively to power TiltCheck features: trust scoring, session auditing, vault management,
              and tipping flows. We do not use it for advertising, profiling, or resale. Anonymized aggregate statistics
              (e.g., &quot;X degens locked $Y this week&quot;) may appear on the platform as social proof — individual accounts
              are never identified in these displays.
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">04. Data Retention</h2>
            <ul className="text-sm text-gray-400 leading-relaxed space-y-2 list-none">
              <li><span className="text-[#17c3b2]">Session logs</span> — 7 days, then purged</li>
              <li><span className="text-[#17c3b2]">Vault events</span> — retained for audit trail until you delete your account</li>
              <li><span className="text-[#17c3b2]">Tip history</span> — retained for dispute resolution (90 days)</li>
              <li><span className="text-[#17c3b2]">Account data</span> — retained until deletion request is submitted</li>
            </ul>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">05. Third Parties</h2>
            <ul className="text-sm text-gray-400 leading-relaxed space-y-2 list-none">
              <li><span className="text-[#17c3b2]">Discord</span> — OAuth2 identity provider. Subject to <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#17c3b2] hover:underline">Discord&apos;s Privacy Policy</a></li>
              <li><span className="text-[#17c3b2]">Solana blockchain</span> — Wallet addresses and on-chain transactions are public by design</li>
              <li><span className="text-[#17c3b2]">Supabase / Neon</span> — Database infrastructure. Data stored in encrypted, access-controlled environments</li>
              <li><span className="text-[#17c3b2]">Railway / GCP</span> — Hosting infrastructure. No third-party data access beyond infrastructure operation</li>
            </ul>
            <p className="text-xs text-gray-600 mt-3">We do not use Google Analytics, Meta Pixel, or any advertising SDK.</p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">06. Chrome Extension</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              The TiltCheck browser extension reads active tab URLs and session-visible data (wager amounts, session duration, balance changes)
              only on domains you have explicitly activated it for. It does not log keystrokes, capture screenshots, or read data
              from tabs where it is inactive. Extension data is transmitted to your TiltCheck account in real time and subject
              to the same retention rules as session logs (7 days).
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">07. Your Rights</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">
              Regardless of your jurisdiction, you can:
            </p>
            <ul className="text-sm text-gray-400 leading-relaxed space-y-2 list-none">
              <li>— Request a copy of all data we hold on your account</li>
              <li>— Request deletion of your account and associated data</li>
              <li>— Correct inaccurate information linked to your Discord ID</li>
              <li>— Opt out of anonymized aggregate statistics display</li>
            </ul>
            <p className="text-sm text-gray-400 mt-3 leading-relaxed">
              Send requests to <a href="mailto:privacy@tiltcheck.me" className="text-[#17c3b2] hover:underline">privacy@tiltcheck.me</a>.
              We respond within 30 days.
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">08. Cookies</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              TiltCheck uses session cookies for authentication only. No tracking cookies. No cross-site cookies.
              No cookie consent banners because there is nothing to consent to beyond keeping you logged in.
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">09. Contact</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Privacy inquiries: <a href="mailto:privacy@tiltcheck.me" className="text-[#17c3b2] hover:underline">privacy@tiltcheck.me</a><br />
              Data deletion requests: same address, subject line &quot;Delete My Data&quot;<br />
              Response time: within 30 days
            </p>
          </div>

        </section>

        <nav className="flex gap-6 pt-4 border-t border-[#283347]">
          <a href="/terms" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] uppercase tracking-widest transition-colors">Terms of Service</a>
          <a href="/legal" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] uppercase tracking-widest transition-colors">All Legal Docs</a>
          <a href="/" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] uppercase tracking-widest transition-colors ml-auto">Return to Terminal</a>
        </nav>

        <p className="text-center text-[10px] font-mono text-gray-600 uppercase tracking-widest">Made for Degens. By Degens.</p>
      </div>
    </div>
  );
}
