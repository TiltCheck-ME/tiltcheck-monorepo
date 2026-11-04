/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30 */
import Link from "next/link";
import "@/styles/stepper.css";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";
import JsonLd from "@/components/JsonLd";
import { softwareApplicationJsonLd } from "@/lib/structured-data";
import BrandTagline from "@/components/BrandTagline";
import GatedZipCta from "@/components/GatedZipCta";
import { HOME_LAUNCH } from "@/lib/home-launch-copy";

const coreSignals = [
  {
    title: "Two-second spin brake",
    body: "You hit bet. The button is dead for two seconds. A click during that window does not place another bet. Breaks the machine zone autopilot so you see the result before sending the next one.",
  },
  {
    title: "Strategic game filters",
    body: "You name the games that wreck you. Chicken, mines, crash, plinko — those tiles stop clicking. Slots stay playable until you add them. Your browser, not an operator account close.",
  },
  {
    title: "Reality wage HUD",
    body: "Translates session drawdowns into hours of real-world labor torched ($25/hr baseline). A blunt terminal reminder before you blow an entire work shift.",
  },
  {
    title: "DOM deposit barrier",
    body: "Catches the panic reload. Cashier and deposit button clicks are intercepted and blocked during Touch Grass timeouts and active voluntary Cooldown locks.",
  },
];

const notThis = [
  "It does not play for you, cash you out, or hold wallet keys (non-custodial).",
  "It does not need Discord to run the spin brake, game list, or reality HUD.",
  "It is not a casino ban and not GAMSTOP. Turn the extension off and the overlay is gone.",
  "It is distributed as a direct sideload zip on this site (Web Store listing later).",
];

export default function ExtensionPage() {
  return (
    <main className="public-page public-page--tight text-white">
      <JsonLd data={softwareApplicationJsonLd()} />
      <PublicPageHero
        compact
        eyebrow="Browser extension // Core"
        title="It sits on the casino tab and gets in your way. On purpose."
        description={
          <p>
            Install it on Chrome. Open Stake, Roobet, BC.Game, or the other listed casinos. After a spin, the bet button sleeps for two seconds. Games you put on your list stop clicking. We never see your password or keys. For a wallet lock you cannot toggle off in settings, use{' '}
            <Link href="/cooldown" className="text-[#17c3b2] underline-offset-2 hover:underline">
              Cooldown
            </Link>
            .
          </p>
        }
        actions={
          <>
            <GatedZipCta funnelEvent="extension_download_click" funnelSource="web-extension-hero" />
            <Link href="/casinos" className="btn btn-secondary" data-text="IS THIS CASINO SUS?">
              IS THIS CASINO SUS?
            </Link>
          </>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-card public-page-card--accent">
            <p className="public-page-card__eyebrow">On the casino tab</p>
            <h2 className="public-page-card__title">How you use it</h2>
            <ol className="public-page-list">
              <li>Download the zip directly from this page, unpack it, and load via chrome://extensions Developer mode.</li>
              <li>Open Stake, Roobet, BC.Game, Rollbit, Shuffle, Gamdom, or CSGOEmpire.</li>
              <li>Spin. The bet button sleeps two seconds. Wage HUD tracks torched shifts. Deposit barrier blocks cashier re-ups. In Guards, arm the games that wreck you — chicken first if that is the hole.</li>
            </ol>
            <p className="public-page-card__copy">
              This does not lock a wallet. Wallet lock is Cooldown, a different button. This does not need Discord.
            </p>
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader compact eyebrow="On the tab" title="What it actually does." />
          <div className="public-page-grid public-page-grid--2">
            {coreSignals.map(({ title, body }) => (
              <article key={title} className="public-page-card">
                <h2 className="public-page-card__title">{title}</h2>
                <p className="public-page-card__copy">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader compact eyebrow="Honesty" title="What it does not do." />
          <ul className="public-page-list max-w-2xl text-sm text-gray-400 leading-relaxed">
            {notThis.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-sm text-gray-500 leading-relaxed">
            No extra HUD. No cashout button. If you want a lock the casino cannot ignore, that is not this
            extension — that is a real self-exclusion register or GAMSTOP, which we are not.
          </p>
          <p className="mt-8">
            <BrandTagline />
          </p>
        </div>
      </section>
    </main>
  );
}
