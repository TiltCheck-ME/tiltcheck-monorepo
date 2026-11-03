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
    body: "You hit bet. The button is dead for two seconds. A click during that window does not place another bet. Time to see the last result before autopilot sends the next one.",
  },
  {
    title: "Your game list",
    body: "You name the games that wreck you. Chicken, mines, crash — those tiles do not click. Slots stay until you add them. This is your browser, not the casino closing your account.",
  },
  {
    title: "Sus link bounce",
    body: "If you click a critically sus casino URL and our safety API is up, we dump you on a warning page instead of the skem.",
  },
];

const notThis = [
  "It does not play for you, cash you out, or hold wallet keys.",
  "It does not need Discord to run the spin brake or the game list.",
  "It is not a casino ban and not GAMSTOP. Turn the extension off and the overlay is gone.",
  "It is not in the Chrome Web Store. The zip is not a public download on this site yet.",
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
              <li>Load it in Chrome. Until a public zip exists, that means unpacked dist from the repo.</li>
              <li>Open Stake, Roobet, BC.Game, Rollbit, Shuffle, Gamdom, or CSGOEmpire.</li>
              <li>Spin. The bet button sleeps two seconds. In Guards, arm the games that wreck you — chicken first if that is the hole. Slots stay clickable until you add them.</li>
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
          <div className="public-page-grid public-page-grid--3">
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
