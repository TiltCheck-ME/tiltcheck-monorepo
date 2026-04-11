/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11 */
export default function TermsPage() {
  return (
    <div className="min-h-screen pt-32 pb-24 px-4 bg-black relative">
      <div className="max-w-3xl mx-auto flex flex-col gap-10 animate-in fade-in duration-500">

        <header className="border-b border-[#283347] pb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">Legal</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#17c3b2]">Terms of Service</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-gray-500">
            Version 2.1 — Last updated 2026-04-11
          </p>
          <p className="mt-4 text-sm text-gray-400 leading-relaxed">
            TiltCheck is an audit and transparency tool for gamblers who want to play with data instead of vibes.
            It is not a gambling operator, financial advisor, or bank. Read this before you use it.
          </p>
        </header>

        <section className="space-y-6">

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">01. Who This Applies To</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              By using TiltCheck — including the website, Discord bots, Chrome extension, or any API — you agree to these terms.
              You must be 18 years of age or older. If gambling is restricted in your jurisdiction, that is your problem to manage, not ours.
              We provide tools. You are the adult making decisions.
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">02. What TiltCheck Is</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              TiltCheck is a read-only session audit and trust scoring layer. It monitors your activity, scores casino behavior,
              scans links, and surfaces patterns that indicate tilt or risk. It does not operate any gambling games, manage your
              bankroll, execute trades, or hold any funds on your behalf.
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">03. Non-Custodial</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              TiltCheck does not hold, control, or have access to your funds or private keys. The vault feature is a
              self-imposed timed lock on your own wallet — you set it, you enforce it. We cannot override, reverse, or
              recover a vault lock. Your keys are yours. Your losses are yours.
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">04. No Financial or Gambling Advice</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Nothing on TiltCheck constitutes financial, investment, tax, or gambling advice. RTP calculations, trust scores,
              and tilt alerts are informational tools based on publicly available data and your own session inputs.
              The math is accurate. What you do with it is entirely up to you.
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">05. Tips and Payments</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              SOL tips sent through JustTheTip are non-refundable once confirmed on-chain. Blockchain transactions are
              irreversible. A 0.07 SOL processing fee applies per tip transaction. Premium subscriptions are billed through
              Discord or via direct SOL payment — all sales are final. Contact support within 48 hours for billing disputes.
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">06. Prohibited Uses</h2>
            <ul className="text-sm text-gray-400 leading-relaxed space-y-2 list-none">
              <li>— Using TiltCheck to facilitate money laundering or fraud</li>
              <li>— Attempting to scrape, reverse-engineer, or abuse the API at scale without a partner agreement</li>
              <li>— Impersonating TiltCheck or its staff in Discord or on social platforms</li>
              <li>— Using bot accounts to manipulate trust scores or leaderboards</li>
              <li>— Accessing TiltCheck on behalf of a person under 18</li>
            </ul>
          </div>

          <div className="p-5 border border-yellow-500/20 bg-yellow-500/5">
            <h2 className="text-yellow-500 font-mono text-xs font-black uppercase mb-3 tracking-widest">07. Limitation of Liability</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              TiltCheck is provided as-is. We make no guarantees about uptime, accuracy of trust scores, or completeness
              of data. To the maximum extent permitted by law, TiltCheck and its contributors are not liable for any
              gambling losses, financial decisions made using our tools, wallet incidents, or service outages.
              You use this at your own risk.
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">08. Account Termination</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              We reserve the right to suspend or terminate access for any account found in violation of these terms,
              at our discretion, without refund. This includes banning bot accounts, removing Discord roles, and
              revoking API access.
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">09. Changes to These Terms</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              We update these terms when the product meaningfully changes. The version number and date at the top of this
              page reflect the current version. Continued use of TiltCheck after an update constitutes acceptance.
              Material changes will be announced in the Discord server.
            </p>
          </div>

          <div className="p-5 border border-[#283347] bg-black/40">
            <h2 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-3 tracking-widest">10. Contact</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Legal questions: <a href="mailto:legal@tiltcheck.me" className="text-[#17c3b2] hover:underline">legal@tiltcheck.me</a><br/>
              Privacy questions: <a href="mailto:privacy@tiltcheck.me" className="text-[#17c3b2] hover:underline">privacy@tiltcheck.me</a><br/>
              Billing disputes: <a href="mailto:support@tiltcheck.me" className="text-[#17c3b2] hover:underline">support@tiltcheck.me</a>
            </p>
          </div>

        </section>

        <nav className="flex gap-6 pt-4 border-t border-[#283347]">
          <a href="/privacy" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] uppercase tracking-widest transition-colors">Privacy Policy</a>
          <a href="/legal" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] uppercase tracking-widest transition-colors">All Legal Docs</a>
          <a href="/" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] uppercase tracking-widest transition-colors ml-auto">Return to Terminal</a>
        </nav>

        <p className="text-center text-[10px] font-mono text-gray-600 uppercase tracking-widest">Made for Degens. By Degens.</p>
      </div>
    </div>
  );
}
