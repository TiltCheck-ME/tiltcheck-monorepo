/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11 */
"use client";

import React, { useState } from "react";
import Link from "next/link";

const RECOVERY_WALLET = "CCXEVwUyfMLFwEzyusBLZ2VY1PyDe6qYhLHtgRqeBm51";
const APPLICATIONS_OPEN = false; // Set true when fund is seeded

type FormStep = "eligibility" | "application" | "submitted";

export default function MicrograntPage() {
  const [step, setStep] = useState<FormStep>("eligibility");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAll, setCheckedAll] = useState(false);

  const eligibilityItems = [
    {
      id: "e1",
      label: "I have a gambling problem.",
      sublabel: "Not a rough patch. Not bad variance. A problem.",
    },
    {
      id: "e2",
      label: "I am facing genuine financial hardship from gambling.",
      sublabel: "Not just a bad month — real hardship, directly caused by gambling.",
    },
    {
      id: "e3",
      label: "I have told a real person in my life about this.",
      sublabel: "Not online. Not anonymous. Someone who knows your face.",
    },
    {
      id: "e4",
      label: "I agree this money will not be used for gambling.",
      sublabel: "Not as a bankroll. Not as a one-last-shot. Never.",
    },
    {
      id: "e5",
      label: "I understand this is a one-time grant.",
      sublabel: "No second application. Make it count.",
    },
  ];

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allChecked =
    eligibilityItems.length > 0 &&
    eligibilityItems.every((item) => checked[item.id]);

  const handleEligibilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allChecked) return;
    setStep("application");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleApplicationSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "/api"}/recovery/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            discord_username: data.get("discord"),
            hardship: data.get("hardship"),
            steps: data.get("steps"),
            support_contact: data.get("support_contact"),
            wallet_address: data.get("wallet"),
          }),
        }
      );

      if (!res.ok) throw new Error("Submit failed");
      setStep("submitted");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(
        "Something broke on our end. Hit us up in Discord and we will sort it out manually."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">

      {/* Closed state top banner */}
      {!APPLICATIONS_OPEN && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/40 py-3 px-4 text-center">
          <p className="text-sm font-mono font-bold text-yellow-400 uppercase tracking-widest">
            Applications opening soon &nbsp;·&nbsp;{' '}
            <a
              href="https://discord.gg/gdBsEJfCar"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline text-yellow-300"
            >
              Join Discord to get notified &rarr;
            </a>
          </p>
        </div>
      )}

      {/* Hero */}
      <section className="border-b border-[#ef4444]/30 py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#ef4444] border border-[#ef4444]/40 px-3 py-1 mb-6">
            Community Recovery Fund
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6 text-white leading-none">
            You Gambled.
            <br />
            <span className="text-[#ef4444]">It Did Not Go Well.</span>
            <br />
            <span className="text-gray-400 text-2xl md:text-3xl">
              Shocking.
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed mt-8">
            The TiltCheck Community Recovery Microgrant is a real fund, seeded
            by real degens who thought it would be a good idea to build a
            recovery program inside a gambling tools app. The irony is not lost
            on us. We leaned into it.
          </p>
          <p className="text-gray-500 text-sm font-mono mt-4 max-w-2xl">
            Up to 1 SOL. One-time. No loans. No lectures. Just a hand up from
            people who have been in the same hole and somehow climbed out.
          </p>
        </div>
      </section>

      {/* Hotline banner */}
      <section className="py-4 px-4 bg-[#ef4444]/10 border-b border-[#ef4444]/30">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm font-bold text-[#ef4444] uppercase tracking-wide">
            In crisis right now?
          </p>
          <p className="text-sm text-white font-mono">
            National Problem Gambling Helpline:{" "}
            <strong>1-800-522-4700</strong> — free, confidential, 24/7
          </p>
          <a
            href="https://www.ncpgambling.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#ef4444] underline font-mono"
          >
            ncpgambling.org
          </a>
        </div>
      </section>

      <div className="max-w-4xl mx-auto py-20 px-4 flex flex-col gap-20">

        {/* What this is */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-6">
              What This Is
            </h2>
            <div className="flex flex-col gap-4 text-sm text-gray-400 leading-relaxed">
              <p>
                A one-time community grant of up to <strong className="text-white">1 SOL</strong>,
                sent directly to your linked wallet. The money comes from a
                dedicated fund that community members contributed to voluntarily.
                Nobody is getting rich off your misfortune here. This is
                genuinely just help.
              </p>
              <p>
                Applications are reviewed by humans. There is no algorithm
                deciding whether your life qualifies. Real people will read what
                you write. Write accordingly.
              </p>
              <p>
                The fund requires 10 community vouches or admin approval. We are
                not giving money to people who are still mid-spiral. You need to
                actually be trying to get out.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-6">
              What This Is Not
            </h2>
            <div className="flex flex-col gap-3 font-mono text-sm">
              {[
                [
                  "A bankroll refill.",
                  "That money is gone. We are sorry. Truly. But it is gone.",
                ],
                [
                  "A debt repayment fund.",
                  "You borrowed from someone to gamble. That is a different problem and a different conversation.",
                ],
                [
                  "A second chance.",
                  "It is literally a first chance. There are no renewals.",
                ],
                [
                  "Anonymous.",
                  "You will have to tell a real person in your life. That part is non-negotiable and also the most important part.",
                ],
                [
                  "Guaranteed.",
                  "Applications are reviewed. Some will be denied. If yours is, it will come with a reason.",
                ],
              ].map(([title, desc]) => (
                <div
                  key={title}
                  className="p-4 border border-[#283347] bg-black/30"
                >
                  <p className="text-[#ef4444] font-bold text-xs uppercase tracking-wider mb-1">
                    {title}
                  </p>
                  <p className="text-gray-400 text-xs">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
            The Conditions
          </h2>
          <p className="text-gray-500 text-sm font-mono mb-8">
            All five. Not four. Not &quot;most of them.&quot; Five.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                num: "01",
                title: "Tell Someone",
                body: "A spouse, parent, friend, sponsor, therapist — someone who will actually be uncomfortable hearing it. That discomfort is the point. Not a Discord contact. Not an anonymous forum. A real person in your life.",
              },
              {
                num: "02",
                title: "No More Gambling",
                body: "Agree in writing that this money will not be used for gambling. We know you know that. We are saying it anyway. We have seen enough to know it still needs to be said.",
              },
              {
                num: "03",
                title: "Proof of Hardship",
                body: "A past-due bill, an eviction notice, a bank statement doing unspeakable things. Real documentation. Not a description of how bad it feels. Evidence of the actual damage.",
              },
              {
                num: "04",
                title: "Proactive Steps",
                body: "Not what you plan to do when you feel better. What you have already done today, this week. Called a hotline. Attended a meeting. Set a limit. Something real and already started.",
              },
              {
                num: "05",
                title: "Linked Wallet",
                body: "Use /linkwallet in the TiltCheck Discord. If you do not have a Solana wallet, say so in your application and we will help you set one up before the grant is sent.",
              },
            ].map((item) => (
              <div
                key={item.num}
                className="p-6 border border-[#283347] bg-black/20 hover:border-[#ef4444]/40 transition-colors"
              >
                <div className="text-[#ef4444] font-mono text-xs font-bold mb-3 tracking-widest">
                  [{item.num}]
                </div>
                <h3 className="text-white font-black uppercase tracking-tight mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Fund status / Application form */}
        <section>
          <div className="border border-[#283347] bg-black/40 overflow-hidden">
            <div className="p-4 border-b border-[#283347] bg-black/60 flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
                microgrant-application.exe
              </h2>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
            </div>

            {!APPLICATIONS_OPEN ? (
              /* ─── PENDING STATE ─── */
              <div className="p-8 md:p-12 flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 border-2 border-yellow-500/40 flex items-center justify-center">
                  <div className="w-3 h-3 bg-yellow-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-yellow-500 uppercase tracking-[0.3em] mb-3">
                    Status: Pending Funds
                  </p>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-4">
                    Applications Are Currently Closed
                  </h3>
                  <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
                    The fund is still being built. Once there is enough SOL to
                    actually deliver a grant to someone, applications will open.
                    We are not taking applications against a wallet with 0.003
                    SOL in it. That would be cruel.
                  </p>
                </div>
                <div className="w-full max-w-lg p-6 border border-yellow-500/20 bg-yellow-500/5">
                  <p className="text-xs font-mono text-yellow-500 uppercase tracking-widest mb-3">
                    Want to make this happen?
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    Send SOL to the recovery fund wallet. Every lamport goes
                    directly to grants. Zero overhead. Zero admin cut. The whole
                    point is the money goes to the person who needs it.
                  </p>
                  <div className="flex items-center gap-3 p-3 bg-black/60 border border-[#283347] font-mono text-xs break-all">
                    <span className="text-gray-500 shrink-0">FUND:</span>
                    <span className="text-white select-all">{RECOVERY_WALLET}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 font-mono max-w-md">
                  If you are in crisis right now and cannot wait, call{" "}
                  <strong className="text-gray-400">1-800-522-4700</strong> or
                  reach us directly in{" "}
                  <a
                    href="https://discord.gg/gdBsEJfCar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#17c3b2] underline"
                  >
                    Discord
                  </a>
                  . We will figure something out.
                </p>
              </div>
            ) : step === "submitted" ? (
              /* ─── SUCCESS STATE ─── */
              <div className="p-12 flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-3">
                    Application Submitted
                  </h3>
                  <p className="text-gray-400 text-sm max-w-md leading-relaxed">
                    It is in. A human will review it — not an algorithm. That
                    takes a few days. You will be notified in Discord with the
                    result and a reason either way.
                  </p>
                  <p className="text-gray-500 text-xs font-mono mt-4">
                    While you wait: make the call you said you would make. Tell
                    the person you said you would tell. That part does not wait
                    for us.
                  </p>
                </div>
              </div>
            ) : step === "eligibility" ? (
              /* ─── ELIGIBILITY GATE ─── */
              <form onSubmit={handleEligibilitySubmit} className="p-8 flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white mb-1">
                    Before You Apply
                  </h3>
                  <p className="text-gray-500 text-xs font-mono">
                    Check every box honestly. We cannot verify most of this. You
                    can lie. You would only be lying to yourself, which, given
                    the circumstances, you are already pretty good at.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {eligibilityItems.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-start gap-4 p-4 border cursor-pointer transition-all ${
                        checked[item.id]
                          ? "border-[#17c3b2]/60 bg-[#17c3b2]/5"
                          : "border-[#283347] hover:border-[#283347]/80"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!checked[item.id]}
                        onChange={(e) =>
                          setChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))
                        }
                        className="mt-1 accent-[#17c3b2] shrink-0"
                      />
                      <div>
                        <span className="block text-sm font-black text-white uppercase tracking-tight">
                          {item.label}
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5 font-mono">
                          {item.sublabel}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!allChecked}
                  className="py-4 text-xs font-black uppercase tracking-[0.2em] bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {allChecked
                    ? "I Checked Every Box — Continue to Application"
                    : "Check All Five Boxes to Continue"}
                </button>
              </form>
            ) : (
              /* ─── APPLICATION FORM ─── */
              <form
                onSubmit={handleApplicationSubmit}
                className="p-8 flex flex-col gap-6"
              >
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white mb-1">
                    The Application
                  </h3>
                  <p className="text-gray-500 text-xs font-mono">
                    This is reviewed by a human. Write like one is reading it.
                    Because one is.
                  </p>
                </div>

                {[
                  {
                    name: "discord",
                    label: "1. Discord Username",
                    hint: "How we reach you with the decision.",
                    placeholder: "yourname or yourname#1234",
                    type: "input",
                  },
                  {
                    name: "hardship",
                    label: "2. Describe Your Hardship",
                    hint: "Specific and honest. Not 'I lost a lot.' Tell us what the damage looks like — rent, bills, debt, the actual numbers if you can.",
                    placeholder:
                      "What happened and what does the damage actually look like right now...",
                    type: "textarea",
                  },
                  {
                    name: "steps",
                    label: "3. What Are You Already Doing",
                    hint: "Not plans. Actions. Things that happened before you found this page.",
                    placeholder:
                      "Called the helpline on Tuesday. Deleted my accounts. Set up a payment plan with my landlord...",
                    type: "textarea",
                  },
                  {
                    name: "support_contact",
                    label: "4. Your Accountability Person",
                    hint: "A real person outside this screen. Their name and how they know you. If they are on TiltCheck Discord, @mention them.",
                    placeholder:
                      "My wife Sarah. She knows. OR @discorduser — my sponsor.",
                    type: "input",
                  },
                  {
                    name: "wallet",
                    label: "5. Your Solana Wallet Address",
                    hint: "Where the grant goes. Use /linkwallet in Discord first. If you do not have one yet, write 'no wallet' and we will help before sending.",
                    placeholder: "Solana wallet address or 'no wallet'",
                    type: "input",
                  },
                ].map((field) => (
                  <div key={field.name} className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#ef4444]">
                      {field.label}
                    </label>
                    <p className="text-[10px] text-gray-500 italic font-mono">
                      {field.hint}
                    </p>
                    {field.type === "textarea" ? (
                      <textarea
                        name={field.name}
                        required
                        placeholder={field.placeholder}
                        className="w-full bg-black/50 border border-[#283347] p-3 text-white font-mono text-sm focus:outline-none focus:border-[#ef4444]/50 transition-colors resize-none h-28"
                      />
                    ) : (
                      <input
                        name={field.name}
                        required
                        placeholder={field.placeholder}
                        className="w-full bg-black/50 border border-[#283347] p-3 text-white font-mono text-sm focus:outline-none focus:border-[#ef4444]/50 transition-colors"
                      />
                    )}
                  </div>
                ))}

                {error && (
                  <p className="text-red-500 text-xs font-mono text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="py-4 text-xs font-black uppercase tracking-[0.2em] bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
                <p className="text-[9px] text-center text-gray-600 font-mono uppercase tracking-tighter">
                  Submitting does not guarantee approval. This is reviewed by
                  humans with limited patience and unlimited context. Be
                  straight.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Donate */}
        <section className="p-8 border border-[#17c3b2]/20 bg-[#17c3b2]/5">
          <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-black uppercase tracking-tight text-[#17c3b2] mb-3">
                Fund the Fund
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                There is nothing in it for you. No NFT. No whitelist. No
                points. Just the knowledge that some degen who actually hit
                bottom got a hand up because you sent SOL to a wallet one
                Tuesday morning. That is the whole pitch.
              </p>
            </div>
            <div className="flex flex-col gap-3 min-w-0 max-w-sm w-full">
              <div className="flex items-start gap-3 p-4 bg-black/60 border border-[#283347] font-mono text-xs">
                <span className="text-gray-500 shrink-0 mt-0.5">RECOVERY:</span>
                <span className="text-white break-all select-all">
                  {RECOVERY_WALLET}
                </span>
              </div>
              <p className="text-[10px] text-gray-600 font-mono">
                Solana mainnet only. Every lamport goes to grants. We do not
                touch it for operations.
              </p>
            </div>
          </div>
        </section>

        {/* Footer nav */}
        <section className="flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-[#283347] pt-8">
          <Link
            href="/touch-grass"
            className="text-xs font-mono text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            Touch Grass Protocol
          </Link>
          <Link
            href="https://discord.gg/gdBsEJfCar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-[#17c3b2] hover:text-white transition-colors uppercase tracking-widest"
          >
            Join Discord
          </Link>
          <Link
            href="/"
            className="text-xs font-mono text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            Back to TiltCheck
          </Link>
        </section>

        <p className="text-center text-xs text-gray-700 font-mono">
          Made for Degens. By Degens. — The serious kind of help.
        </p>
      </div>
    </main>
  );
}
