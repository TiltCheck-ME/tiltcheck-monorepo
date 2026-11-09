/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-09 */
import Link from "next/link";
import "@/styles/stepper.css";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";
import JsonLd from "@/components/JsonLd";
import { softwareApplicationJsonLd } from "@/lib/structured-data";
import BrandTagline from "@/components/BrandTagline";
import GatedZipCta from "@/components/GatedZipCta";
import StaffOnly from "@/components/StaffOnly";

const coreSignals = [
  {
    title: "2-second spin pause",
    body: "You hit bet. The button naps for two seconds. Clicking during the nap does nothing. You actually see the result before you fire the next one.",
  },
  {
    title: "Game filters",
    body: "You name the games that wreck you. Chicken, Mines, Crash, Plinko: those tiles stop clicking. Slots stay playable until you add them. Your browser, not a casino account ban.",
  },
  {
    title: "Reality wage clock",
    body: "Turns your session losses into hours of real work torched ($25/hr default). A blunt reminder before you blow a whole shift.",
  },
  {
    title: "Deposit speed bump",
    body: "Catches the panic reload. Cashier and deposit buttons go dead while your Touch Grass lock is running.",
  },
  {
    title: "Cancel-withdrawal blocker",
    body: "Hides the cancel button while a withdrawal is pending, so 3am-you has to work harder to throw the win back.",
  },
  {
    title: "Profit floor & real goals",
    body: "Up big? It marks a floor. Slide toward it and you get a warning, then a 60-second pause, plus what the money is really for: power bill, groceries, gas.",
  },
  {
    title: "Bonus rollover & max-bet alarm",
    body: "Shows how much rollover is left and yells before one oversized bet (like over a $5 limit) gets your bonus voided.",
  },
  {
    title: "Loss speed meter",
    body: "How fast you are losing, in dollars per minute, with bands from Steady to Cliff-Dive. Right there in the popup.",
  },
  {
    title: "One-click cashout links",
    body: "Jumps straight to the cashier on 21+ crypto and sweeps casinos, with progress bars toward the bills you actually have.",
  },
  {
    title: "Mid-session auto-vault",
    body: "Hit your goal and it moves a cut into the casino's own vault (like Stake Vault). Your account, your money. We never touch it.",
  },
  {
    title: "Streak & \"I'm due\" spotter",
    body: "Counts dead spins and heater streaks. Start raising bets because you're \"due\" and it calls you out and points at the cashier.",
  },
];

const notThis = [
  "It does not play for you, cash you out, or hold wallet keys.",
  "It does not need an account or our servers. It runs in your browser tab.",
  "It is not a casino ban and not GAMSTOP. Turn the extension off and it is gone. The rest is on you.",
];

export default function ExtensionPage() {
  return (
    <main className="public-page public-page--tight text-white">
      <JsonLd data={softwareApplicationJsonLd()} />
      <PublicPageHero
        compact
        eyebrow="Browser extension"
        title="It sits on the casino tab and gets in your way. On purpose."
        description={
          <p>
            Chrome on Stake, Roobet, BC.Game, and the other listed casinos. After a spin, the bet button naps for two seconds. Games on your list stop clicking. We never see your password or keys. Want a lock you can&apos;t just toggle off? Sign a{' '}
            <Link href="/cooldown" className="text-[#17c3b2] underline-offset-2 hover:underline">
              Touch Grass
            </Link>{' '}
            lock.
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
          <PublicPageSectionHeader compact eyebrow="Why install" title="You already know the spiral." />
          <p className="public-page-card__copy max-w-2xl">
            Three losses. Bet size climbs. &ldquo;I&apos;m due.&rdquo; Another deposit. The extension&apos;s job is to notice that
            pacing while the tab is still open and push the exit you set when you were still thinking straight.
          </p>
          <p className="public-page-card__copy max-w-2xl mt-4">
            It does not place bets for you. It does not &ldquo;beat the house.&rdquo; It just gets in the way at 2am, when
            the session feels immortal. Stopping is still your move.
          </p>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-card public-page-card--accent">
            <p className="public-page-card__eyebrow">Getting it</p>
            <h2 className="public-page-card__title">Not public yet.</h2>
            <p className="public-page-card__copy">
              No download link right now. Hop in the{' '}
              <a
                href="https://discord.gg/gdBsEJfCar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#17c3b2] underline-offset-2 hover:underline"
              >
                Discord
              </a>{' '}
              and you&apos;ll hear first. Touch Grass locks, the RTP scanner, the bet verifier, and casino lookups work on
              this site right now.
            </p>
          </div>
          <StaffOnly label="Staff only: sideload test install">
            <ol className="public-page-list">
              <li>Download the extension zip and extract the folder.</li>
              <li>In Chrome, Brave, or Edge, open chrome://extensions and switch on Developer mode.</li>
              <li>Click &ldquo;Load unpacked&rdquo;, pick the extracted folder, then open a casino tab.</li>
            </ol>
          </StaffOnly>
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
            Want a lock the casino can&apos;t ignore? That&apos;s a real self-exclusion register or GAMSTOP, not us. We
            just make the bad idea take a few more clicks.
          </p>
          <p className="mt-8">
            <BrandTagline />
          </p>
        </div>
      </section>
    </main>
  );
}
