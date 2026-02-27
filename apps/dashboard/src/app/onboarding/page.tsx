'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/**
 * Onboarding Flow for TiltCheck
 * Designed to guide new users through identity connection, wallet setup, and safety preferences.
 * Includes an AI Interview that personalizes tool recommendations.
 * 
 * © 2024–2026 TiltCheck | v1.1.0 | Last Edited: 2026-02-26
 */

type Step = 'WELCOME' | 'IDENTITY' | 'WALLET' | 'INTERVIEW' | 'SAFETY' | 'COMPLETE';

interface Message {
    role: 'assistant' | 'user';
    content: string;
}

interface ToolRecommendation {
    id: string;
    name: string;
    description: string;
    icon: string;
}

const ALL_TOOLS: Record<string, ToolRecommendation> = {
    qualifyfirst: {
        id: 'qualifyfirst',
        name: 'QualifyFirst',
        description: 'Earn instant crypto by completing pre-screened surveys.',
        icon: '🎯'
    },
    tiltguard: {
        id: 'tiltguard',
        name: 'TiltGuard',
        description: 'Behavioral protection that detects tilt patterns in real-time.',
        icon: '🛡️'
    },
    collectclock: {
        id: 'collectclock',
        name: 'CollectClock',
        description: 'Predicts bonus drops and tracks casino term changes.',
        icon: '⏰'
    },
    suslink: {
        id: 'suslink',
        name: 'SusLink',
        description: 'AI-powered scanner that blocks phishing and scam links.',
        icon: '🔗'
    },
    justthetip: {
        id: 'justthetip',
        name: 'JustTheTip',
        description: 'Non-custodial tipping and airdrops directly in Discord.',
        icon: '💸'
    }
};

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState<Step>('WELCOME');
    const [riskLevel, setRiskLevel] = useState<'conservative' | 'moderate' | 'degen'>('moderate');
    const [isConnecting, setIsConnecting] = useState(false);

    // Interview State
    const [chatMessages, setChatMessages] = useState<Message[]>([
        { role: 'assistant', content: "Yo! I'm the TiltCheck AI. I'm here to build your personalized safety net. To start, how do you usually find your bonus codes? (Discord, Twitter, or searching manually?)" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [interviewProgress, setInterviewProgress] = useState(0);
    const [recommendedTools, setRecommendedTools] = useState<string[]>(['suslink']); // SusLink is always recommended
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Animation variants (CSS classes)
    const fadeIn = "animate-in fade-in duration-700 slide-in-from-bottom-4";

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const nextStep = () => {
        const steps: Step[] = ['WELCOME', 'IDENTITY', 'WALLET', 'INTERVIEW', 'SAFETY', 'COMPLETE'];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex < steps.length - 1) {
            setCurrentStep(steps[currentIndex + 1]);
        }
    };

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;

        const userMessage = inputValue.trim();
        const newMessages: Message[] = [...chatMessages, { role: 'user', content: userMessage }];
        setChatMessages(newMessages);
        setInputValue('');

        // Logic-based AI response to simulate "learning" and "teaching"
        setTimeout(() => {
            let assistantResponse = "";
            const lowerMsg = userMessage.toLowerCase();

            if (interviewProgress === 0) {
                // Response to bonus code question
                if (lowerMsg.includes('discord') || lowerMsg.includes('twitter')) {
                    assistantResponse = "Makes sense! Since you're active on socials, you're a prime target for phishing. I'm adding **SusLink** to your core tools—it'll scan every link before you click. Next: Do you ever find yourself chasing losses after a bad run?";
                    setRecommendedTools(prev => [...prev, 'suslink']);
                } else {
                    assistantResponse = "Manual hunting, respect. That can be tedious though. I recommend check out **CollectClock**—it predicts drops so you don't have to hunt. Do you ever feel 'tilted' or lose track of time during a session?";
                    setRecommendedTools(prev => [...prev, 'collectclock']);
                }
                setInterviewProgress(1);
            } else if (interviewProgress === 1) {
                // Response to tilt question
                if (lowerMsg.includes('yes') || lowerMsg.includes('yeah') || lowerMsg.includes('tilted') || lowerMsg.includes('track')) {
                    assistantResponse = "I feel you. Most of us have been there. I'm recommending **TiltGuard**. It'll give you a nudge when it detects your betting speed spiking. One more: Are you interested in earning extra bankroll by doing tasks, or just here for the tools?";
                    setRecommendedTools(prev => [...prev, 'tiltguard']);
                } else {
                    assistantResponse = "Steady hands. Rare in this game. You might still like **JustTheTip** for sharing wins with the community via Discord airdrops. Last question: Are you interested in earning extra bankroll through pre-screened tasks?";
                    setRecommendedTools(prev => [...prev, 'justthetip']);
                }
                setInterviewProgress(2);
            } else if (interviewProgress === 2) {
                // Response to earning question
                if (lowerMsg.includes('yes') || lowerMsg.includes('earning') || lowerMsg.includes('earn') || lowerMsg.includes('tasks')) {
                    assistantResponse = "Perfect. **QualifyFirst** is your best friend. It pre-qualifies you for surveys so you never waste time. We're done! I've built your tool profile. Ready to see the results?";
                    setRecommendedTools(prev => [...prev, 'qualifyfirst']);
                } else {
                    assistantResponse = "Got it, strictly utility. I've finalized your safety net profile. Click below to see your recommended tools!";
                }
                setInterviewProgress(3);
            }

            setChatMessages([...newMessages, { role: 'assistant', content: assistantResponse }]);
        }, 800);
    };

    const handleConnect = (type: 'discord' | 'wallet') => {
        setIsConnecting(true);
        // Simulate connection delay
        setTimeout(() => {
            setIsConnecting(false);
            nextStep();
        }, 1500);
    };

    return (
        <main className="min-h-screen bg-[#0E0E0F] flex flex-col items-center justify-center p-6 overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(0,255,198,0.05),transparent_70%)] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#00FFC6]/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#00C2FF]/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-2xl relative z-10">
                {/* Progress Tracker */}
                {currentStep !== 'WELCOME' && currentStep !== 'COMPLETE' && (
                    <div className="mb-12 flex justify-between items-center px-4">
                        <ProgressStep active={currentStep === 'IDENTITY'} completed={(['WALLET', 'INTERVIEW', 'SAFETY', 'COMPLETE'] as Step[]).includes(currentStep)} label="IDENTITY" />
                        <div className={`h-[2px] flex-1 mx-2 ${(['WALLET', 'INTERVIEW', 'SAFETY', 'COMPLETE'] as Step[]).includes(currentStep) ? 'bg-[#00FFC6]' : 'bg-[#1A1F24]'}`} />
                        <ProgressStep active={currentStep === 'WALLET'} completed={(['INTERVIEW', 'SAFETY', 'COMPLETE'] as Step[]).includes(currentStep)} label="WALLET" />
                        <div className={`h-[2px] flex-1 mx-2 ${(['INTERVIEW', 'SAFETY', 'COMPLETE'] as Step[]).includes(currentStep) ? 'bg-[#00FFC6]' : 'bg-[#1A1F24]'}`} />
                        <ProgressStep active={currentStep === 'INTERVIEW'} completed={(['SAFETY', 'COMPLETE'] as Step[]).includes(currentStep)} label="INTERVIEW" />
                        <div className={`h-[2px] flex-1 mx-2 ${(['SAFETY', 'COMPLETE'] as Step[]).includes(currentStep) ? 'bg-[#00FFC6]' : 'bg-[#1A1F24]'}`} />
                        <ProgressStep active={currentStep === 'SAFETY'} completed={(currentStep as string) === 'COMPLETE'} label="SAFETY" />
                    </div>
                )}

                {/* Content Area */}
                <div className={`bg-[#111316]/80 backdrop-blur-xl border border-[#00FFC6]/10 rounded-2xl p-8 md:p-12 shadow-2xl ${fadeIn}`}>
                    {currentStep === 'WELCOME' && (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-[#00FFC6] to-[#00C2FF] rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,198,0.2)]">
                                <svg className="w-10 h-10 text-[#0E0E0F]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45zM11 16v2h2v-2h-2zm0-7v5h2V9h-2z" />
                                </svg>
                            </div>
                            <h1 className="text-4xl font-black font-space text-white mb-4 tracking-tight">WELCOME TO TILTCHECK</h1>
                            <p className="text-[#6B7280] text-lg mb-10 leading-relaxed">
                                The degen safety net. We build tools that help you stay in control,
                                verify every bet, and grind smarter.
                            </p>
                            <button
                                onClick={nextStep}
                                className="w-full py-4 bg-[#00FFC6] text-[#0E0E0F] rounded-lg font-bold text-lg hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,255,198,0.2)] flex items-center justify-center gap-2"
                            >
                                GET STARTED <span className="text-xl">→</span>
                            </button>
                        </div>
                    )}

                    {currentStep === 'IDENTITY' && (
                        <div className="text-center">
                            <h2 className="text-3xl font-black font-space text-white mb-2 tracking-tight uppercase">Connect Identity</h2>
                            <p className="text-[#6B7280] mb-10">We use Discord to secure your data and verify fairness seeds without holding your private info.</p>

                            <div className="p-8 bg-[#1A1F24] border border-[#00FFC6]/5 rounded-xl mb-8 flex flex-col items-center">
                                <div className="w-16 h-16 bg-[#5865F2]/10 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027C.533 9.048-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.003 14.003 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.23 10.23 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                    </svg>
                                </div>
                                <div className="text-white font-bold mb-1">Verify Discord</div>
                                <div className="text-xs text-[#6B7280]">Connect to access Trust Identity features</div>
                            </div>

                            <button
                                onClick={() => handleConnect('discord')}
                                disabled={isConnecting}
                                className="w-full py-4 bg-[#5865F2] text-white rounded-lg font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                            >
                                {isConnecting ? (
                                    <span className="flex items-center gap-3">
                                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        CONNECTING...
                                    </span>
                                ) : (
                                    <>CONNECT WITH DISCORD</>
                                )}
                            </button>
                        </div>
                    )}

                    {currentStep === 'WALLET' && (
                        <div className="text-center">
                            <h2 className="text-3xl font-black font-space text-white mb-2 tracking-tight uppercase">Link Wallet</h2>
                            <p className="text-[#6B7280] mb-10">Connect your Solana wallet to enable non-custodial tipping, vaults, and verify on-chain randomness.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <WalletOption name="Phantom" icon="👻" onClick={() => handleConnect('wallet')} />
                                <WalletOption name="Solflare" icon="☀️" onClick={() => handleConnect('wallet')} />
                                <WalletOption name="Backpack" icon="🎒" onClick={() => handleConnect('wallet')} />
                                <button
                                    onClick={nextStep}
                                    className="p-4 bg-transparent border border-[#1A1F24] rounded-xl text-[#6B7280] text-sm hover:border-[#00FFC6]/20 transition-all"
                                >
                                    Skip for now
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === 'INTERVIEW' && (
                        <div>
                            <h2 className="text-3xl font-black font-space text-white mb-2 tracking-tight uppercase text-center">Personalization</h2>
                            <p className="text-[#6B7280] mb-8 text-center px-4">Let's fine-tune your ecosystem. Respond to the AI to discover your best tools.</p>

                            <div className="bg-[#0E0E0F] border border-[#1A1F24] rounded-xl overflow-hidden mb-6 h-[220px] md:h-[280px] flex flex-col shadow-inner">
                                <div className="flex-1 p-4 overflow-y-auto space-y-4 scroll-smooth">
                                    {chatMessages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                            <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${msg.role === 'assistant'
                                                ? 'bg-[#1A1F24] text-[#00FFC6] rounded-tl-none border border-[#00FFC6]/10 shadow-lg'
                                                : 'bg-gradient-to-r from-[#00FFC6] to-[#00C2FF] text-[#0E0E0F] font-bold rounded-tr-none shadow-md'
                                                }`}>
                                                {msg.role === 'assistant' ? (
                                                    <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                                                ) : msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="p-3 bg-[#111316] border-t border-[#1A1F24] flex gap-2">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        autoFocus
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Type your response..."
                                        className="flex-1 bg-[#1A1F24] border-none rounded-lg px-4 text-sm text-white focus:ring-1 focus:ring-[#00FFC6] placeholder-[#6B7280]"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        className="p-3 bg-[#00FFC6] rounded-lg text-[#0E0E0F] hover:bg-[#00FFC6]/90 transition-colors shadow-lg"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {interviewProgress >= 3 ? (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="mb-6 grid grid-cols-2 gap-3">
                                        {Array.from(new Set(recommendedTools)).map(toolId => (
                                            <ToolBanner key={toolId} tool={ALL_TOOLS[toolId]} />
                                        ))}
                                    </div>
                                    <button
                                        onClick={nextStep}
                                        className="w-full py-4 bg-[#00FFC6] text-[#0E0E0F] rounded-lg font-bold text-lg hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,255,198,0.2)]"
                                    >
                                        CONTINUE TO SAFETY PROFILE
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={nextStep}
                                    className="w-full py-3 border border-[#1A1F24] text-[#6B7280] rounded-lg font-bold hover:bg-[#1A1F24]/50 transition-all text-sm"
                                >
                                    SKIP INTERVIEW
                                </button>
                            )}
                        </div>
                    )}

                    {currentStep === 'SAFETY' && (
                        <div>
                            <h2 className="text-3xl font-black font-space text-white mb-2 tracking-tight uppercase text-center">Safety Profile</h2>
                            <p className="text-[#6B7280] mb-10 text-center">Customize how TiltGuard monitors your activity to help prevent chasing losses.</p>

                            <div className="space-y-4 mb-10">
                                <RiskCard
                                    level="conservative"
                                    selected={riskLevel === 'conservative'}
                                    onClick={() => setRiskLevel('conservative')}
                                    title="CONSERVATIVE"
                                    description="High protection. Shorter cooldowns, aggressive tilt detection, and daily budget limits."
                                    icon="🐢"
                                />
                                <RiskCard
                                    level="moderate"
                                    selected={riskLevel === 'moderate'}
                                    onClick={() => setRiskLevel('moderate')}
                                    title="MODERATE"
                                    description="Balanced protection. Smart nudges and notifications when patterns change."
                                    icon="⚖️"
                                />
                                <RiskCard
                                    level="degen"
                                    selected={riskLevel === 'degen'}
                                    onClick={() => setRiskLevel('degen')}
                                    title="FULL DEGEN"
                                    description="Low protection. Minimal nudges, only alerts for severe scam links or drainage attempts."
                                    icon="🔥"
                                />
                            </div>

                            <button
                                onClick={nextStep}
                                className="w-full py-4 bg-[#00FFC6] text-[#0E0E0F] rounded-lg font-bold text-lg hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,255,198,0.2)]"
                            >
                                FINISH SETUP
                            </button>
                        </div>
                    )}

                    {currentStep === 'COMPLETE' && (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-[#4CAF50]/10 rounded-full mx-auto mb-8 flex items-center justify-center border-2 border-[#4CAF50]/30">
                                <svg className="w-10 h-10 text-[#4CAF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-4xl font-black font-space text-white mb-4 tracking-tight uppercase">YOU'RE ALL SET</h1>
                            <p className="text-[#6B7280] text-lg mb-10 leading-relaxed">
                                Your Trust Identity is active. TiltGuard is now watching your back.
                                Welcome to the ecosystem.
                            </p>
                            <Link
                                href="/dashboard"
                                className="w-full py-4 bg-gradient-to-r from-[#00FFC6] to-[#00C2FF] text-[#0E0E0F] rounded-lg font-bold text-lg hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,194,255,0.2)] inline-block"
                            >
                                ENTER DASHBOARD
                            </Link>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-[#6B7280] text-xs font-bold tracking-[0.2em] uppercase">
                    © 2024–2026 TILTCHECK ECOSYSTEM • v1.1.0
                </p>
            </div>
        </main>
    );
}

function ProgressStep({ active, completed, label }: { active: boolean; completed: boolean; label: string }) {
    return (
        <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all duration-500 border-2 ${completed ? 'bg-[#00FFC6] border-[#00FFC6] text-[#0E0E0F]' :
                active ? 'bg-[#111316] border-[#00FFC6] text-[#00FFC6] shadow-[0_0_15px_rgba(0,255,198,0.3)]' :
                    'bg-[#111316] border-[#1A1F24] text-[#6B7280]'
                }`}>
                {completed ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <span>{label.charAt(0)}</span>
                )}
            </div>
            <span className={`text-[10px] font-black tracking-widest ${active || completed ? 'text-white' : 'text-[#6B7280]'}`}>{label}</span>
        </div>
    );
}

function WalletOption({ name, icon, onClick }: { name: string; icon: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="p-6 bg-[#1A1F24] border border-[#00FFC6]/5 rounded-xl hover:border-[#00FFC6]/30 group transition-all"
        >
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>
            <div className="text-white font-bold group-hover:text-[#00FFC6] transition-colors">{name}</div>
        </button>
    );
}

function ToolBanner({ tool }: { tool: ToolRecommendation }) {
    if (!tool) return null;
    return (
        <div className="p-3 bg-[#1A1F24] border border-[#00FFC6]/10 rounded-xl flex items-center gap-3">
            <div className="text-xl">{tool.icon}</div>
            <div className="text-left overflow-hidden">
                <div className="text-white font-bold text-xs truncate">{tool.name}</div>
                <div className="text-[10px] text-[#6B7280] truncate">{tool.description}</div>
            </div>
        </div>
    );
}

function RiskCard({ level, selected, onClick, title, description, icon }: {
    level: string;
    selected: boolean;
    onClick: () => void;
    title: string;
    description: string;
    icon: string;
}) {
    const borderClass = selected ? 'border-[#00FFC6] bg-[#00FFC6]/5' : 'border-[#00FFC6]/10 bg-[#1A1F24]/50';
    const glowClass = selected ? 'shadow-[0_0_20px_rgba(0,255,198,0.1)]' : '';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-6 rounded-xl border transition-all flex gap-6 group hover:border-[#00FFC6]/30 ${borderClass} ${glowClass}`}
        >
            <div className="text-4xl flex-shrink-0">{icon}</div>
            <div>
                <h3 className={`font-black font-space tracking-wider mb-1 ${selected ? 'text-[#00FFC6]' : 'text-white'}`}>{title}</h3>
                <p className="text-[#6B7280] text-sm leading-relaxed">{description}</p>
            </div>
        </button>
    );
}
