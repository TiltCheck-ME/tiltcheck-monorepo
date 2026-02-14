'use client';

import Link from 'next/link';

export default function DashboardHome() {
  return (
    <main className="min-h-screen bg-[#0E0E0F]">
      {/* Hero Section - Restored Legacy Style */}
      <section className="relative pt-24 pb-20 overflow-hidden border-b border-[#00FFC6]/10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(1200px_500px_at_50%_-10%,rgba(0,194,255,0.08),transparent_60%)] pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black font-space mb-6 text-white tracking-tight">
            Built by a degen, <br />
            <span className="bg-gradient-to-r from-[#00FFC6] to-[#00C2FF] bg-clip-text text-transparent">
              for degens
            </span>
          </h1>
          <p className="text-lg md:text-xl text-[#6B7280] max-w-3xl mx-auto mb-10 leading-relaxed">
            Smart tools for casino communities. Scam detection, tipping, bonuses, 
            tilt prevention, and trivia — all integrated into one ecosystem.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/dashboard"
              className="px-8 py-4 bg-[#00FFC6] text-[#0E0E0F] rounded font-bold text-lg hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,255,198,0.2)]"
            >
              OPEN DASHBOARD
            </Link>
            <Link 
              href="https://discord.gg/s6NNfPHxMS"
              className="px-8 py-4 border border-[#00FFC6] text-[#00FFC6] rounded font-bold text-lg hover:bg-[#00FFC6]/5 transition-all"
            >
              JOIN DISCORD
            </Link>
          </div>

          {/* Legacy Stats Bar */}
          <div className="flex flex-wrap justify-center gap-8 mt-16">
            <StatItem number="1.2M+" label="DOMAINS BLOCKED" />
            <StatItem number="450K+" label="USERS PROTECTED" />
            <StatItem number="150+" label="SERVERS SECURED" />
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-20 bg-[#111316]">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-black font-space mb-12 text-white flex items-center gap-4">
            <span className="w-12 h-[2px] bg-[#00FFC6]" />
            ECOSYSTEM TOOLS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* QualifyFirst */}
            <ToolCard
              title="QUALIFYFIRST"
              description="Complete surveys and tasks to earn instant crypto rewards. Powered by TrustEngine."
              href="/qualify"
              status="LIVE"
              icon="SURVEYS"
            />

            {/* CollectClock */}
            <ToolCard
              title="COLLECTCLOCK"
              description="Bonus cycle tracking & nerf detection. Predict Instagram code drops with AI."
              href="/bonus"
              status="BETA"
              icon="BONUSES"
            />

            {/* JustTheTip */}
            <ToolCard
              title="JUSTTHETIP"
              description="The standard for Discord tipping. Fast, secure SOL transfers between users."
              href="/justthetip"
              status="LIVE"
              icon="TIPPING"
            />

            {/* Wallet Check */}
            <ToolCard
              title="WALLET CHECK"
              description="Analyze your wallet for EIP7702 attacks and malicious token approvals."
              href="/wallet-check"
              status="LIVE"
              icon="SECURITY"
            />

            {/* TiltGuard */}
            <ToolCard
              title="TILTGUARD"
              description="Extension-based protection from scam links and tilt-induced losses."
              href="/safety"
              status="LIVE"
              icon="PROTECT"
            />
          </div>
        </div>
      </section>

      {/* Admin Quick Links */}
      <section className="py-12 border-t border-[#00FFC6]/5">
        <div className="container mx-auto px-6">
          <h3 className="text-xs font-bold tracking-[0.2em] text-[#6B7280] mb-8 uppercase">Management Console</h3>
          <div className="flex flex-wrap gap-4">
            <AdminLink title="CASINOS" href="/casinos" />
            <AdminLink title="USERS" href="/users" />
            <AdminLink title="SYSTEM" href="/health" />
            <AdminLink title="ANALYTICS" href="/analytics" />
          </div>
        </div>
      </section>

      <footer className="py-12 bg-[#0E0E0F] border-t border-[#00FFC6]/10 text-center">
        <div className="container mx-auto px-6">
          <p className="text-[#6B7280] text-sm mb-4 tracking-wide">
            © 2024 TILTCHECK • BUILT FOR DEGENS BY DEGENS
          </p>
          <div className="flex justify-center gap-6 text-xs font-bold text-[#00FFC6]">
            <Link href="/terms" className="hover:underline">TERMS</Link>
            <Link href="/privacy" className="hover:underline">PRIVACY</Link>
            <Link href="https://jmenichole.github.io/Portfolio/" className="hover:underline">PORTFOLIO</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function StatItem({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center p-6 bg-[#1A1F24]/50 border border-[#00FFC6]/10 rounded-lg min-w-[200px]">
      <div className="text-3xl font-black font-space text-[#00FFC6] mb-1">{number}</div>
      <div className="text-[10px] tracking-[0.15em] text-[#6B7280] font-bold">{label}</div>
    </div>
  );
}

function ToolCard({
  title,
  description,
  href,
  status,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  status: 'LIVE' | 'BETA' | 'SOON';
  icon: string;
}) {
  const statusColors = {
    LIVE: 'text-[#4CAF50] border-[#4CAF50]/30 bg-[#4CAF50]/10',
    BETA: 'text-[#FFC107] border-[#FFC107]/30 bg-[#FFC107]/10',
    SOON: 'text-[#6B7280] border-[#6B7280]/30 bg-[#6B7280]/10',
  };

  return (
    <Link 
      href={href}
      className="group bg-[#1A1F24]/80 border border-[#00FFC6]/5 p-8 rounded-lg hover:border-[#00FFC6]/30 transition-all flex flex-col backdrop-blur-sm"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="text-xs font-bold tracking-widest text-[#00FFC6]">{icon}</div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${statusColors[status]}`}>
          {status}
        </span>
      </div>
      <h3 className="text-xl font-black font-space text-white mb-3 tracking-tight group-hover:text-[#00FFC6] transition-colors">
        {title}
      </h3>
      <p className="text-[#6B7280] text-sm leading-relaxed mb-6 flex-grow">
        {description}
      </p>
      <div className="text-[#00FFC6] text-xs font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
        LAUNCH TOOL <span className="text-lg">→</span>
      </div>
    </Link>
  );
}

function AdminLink({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 bg-[#1A1F24] border border-[#00FFC6]/10 rounded text-[10px] font-bold text-[#6B7280] hover:text-[#00FFC6] hover:border-[#00FFC6]/30 transition-all tracking-widest"
    >
      {title}
    </Link>
  );
}

