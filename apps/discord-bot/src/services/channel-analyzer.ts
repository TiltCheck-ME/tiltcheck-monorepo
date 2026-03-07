/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * ChannelAnalyzer — Passive gambling community intelligence.
 * 
 * Listens to a configured Discord channel, buffers messages throughout the day,
 * and runs scheduled GPT-4o analysis to surface pain points, scam patterns,
 * tilt signals, and community needs. Posts a structured digest to a report channel.
 */

import { Client, Message, TextChannel, EmbedBuilder } from 'discord.js';
import OpenAI from 'openai';

interface BufferedMessage {
    authorTag: string;
    authorId: string;
    content: string;
    timestamp: Date;
    attachments: string[];
}

interface PainPointReport {
    summary: string;
    scamAlerts: string[];
    tiltPatterns: string[];
    communityNeeds: string[];
    positiveSignals: string[];
    actionItems: string[];
    messageCount: number;
    analysedAt: Date;
}

const PAIN_POINT_SYSTEM_PROMPT = `You are a community intelligence analyst for TiltCheck, a responsible gambling platform.
You analyse batches of Discord chat messages from a gambling community server.
Your job is to identify:
1. **Scam alerts** — links, offers, or users that seem predatory or dishonest
2. **Tilt patterns** — messages showing emotional distress, chasing losses, or compulsive behaviour
3. **Community needs** — features, tools, or support resources that members are asking for
4. **Positive signals** — wins, community support, helpful advice being shared
5. **Action items** — specific things TiltCheck mods or the bot should do based on this data

Be direct, analytical, and non-judgmental. Protect user privacy — never quote specific messages verbatim.
Summarise patterns, not individuals. Output valid JSON.`;

const ANALYSIS_PROMPT_TEMPLATE = (messages: BufferedMessage[]) => `
Here are ${messages.length} Discord messages collected from a gambling community channel over the past analysis period.

MESSAGES:
${messages.map(m => `[${m.timestamp.toLocaleTimeString()}] ${m.authorTag}: ${m.content.slice(0, 300)}`).join('\n')}

Analyse these messages and respond with ONLY valid JSON in this exact structure:
{
  "summary": "2-3 sentence overview of the conversation",
  "scamAlerts": ["alert1", "alert2"],
  "tiltPatterns": ["pattern1", "pattern2"],
  "communityNeeds": ["need1", "need2"],
  "positiveSignals": ["signal1", "signal2"],
  "actionItems": ["action1", "action2"]
}`;

export class ChannelAnalyzer {
    private client: Client;
    private openai: OpenAI | null = null;
    private messageBuffer: BufferedMessage[] = [];
    private watchChannelId: string;
    private reportChannelId: string;
    private analysisIntervalMs: number;
    private maxBufferSize: number;
    private analysisTimer: NodeJS.Timeout | null = null;
    private isRunning = false;

    constructor(client: Client, options: {
        watchChannelId: string;
        reportChannelId: string;
        analysisIntervalHours?: number;
        maxBufferSize?: number;
        openaiApiKey?: string;
    }) {
        this.client = client;
        this.watchChannelId = options.watchChannelId;
        this.reportChannelId = options.reportChannelId;
        this.analysisIntervalMs = (options.analysisIntervalHours ?? 6) * 60 * 60 * 1000;
        this.maxBufferSize = options.maxBufferSize ?? 500;

        if (options.openaiApiKey) {
            this.openai = new OpenAI({ apiKey: options.openaiApiKey });
        }
    }

    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;

        // Listen to messages
        this.client.on('messageCreate', this.handleMessage.bind(this));

        // Schedule periodic analysis
        this.analysisTimer = setInterval(
            () => this.runAnalysis(),
            this.analysisIntervalMs
        );

        console.log(`[ChannelAnalyzer] 👁️ Watching channel ${this.watchChannelId}`);
        console.log(`[ChannelAnalyzer] 📊 Analysis every ${this.analysisIntervalMs / 3600000}h → reporting to ${this.reportChannelId}`);
    }

    stop(): void {
        if (!this.isRunning) return;
        this.isRunning = false;
        this.client.off('messageCreate', this.handleMessage.bind(this));
        if (this.analysisTimer) {
            clearInterval(this.analysisTimer);
            this.analysisTimer = null;
        }
        console.log('[ChannelAnalyzer] Stopped.');
    }

    private handleMessage(message: Message): void {
        // Only watch the configured channel, ignore bots
        if (message.channelId !== this.watchChannelId) return;
        if (message.author.bot) return;

        const buffered: BufferedMessage = {
            authorTag: message.author.username,
            authorId: message.author.id,
            content: message.content,
            timestamp: message.createdAt,
            attachments: message.attachments.map(a => a.url),
        };

        this.messageBuffer.push(buffered);

        // Rolling window — drop oldest when at capacity
        if (this.messageBuffer.length > this.maxBufferSize) {
            this.messageBuffer.shift();
        }
    }

    async runAnalysis(force = false): Promise<void> {
        if (this.messageBuffer.length < 5 && !force) {
            console.log('[ChannelAnalyzer] Buffer too small to analyse, skipping.');
            return;
        }

        const snapshot = [...this.messageBuffer];
        this.messageBuffer = []; // Clear buffer after snapshot

        console.log(`[ChannelAnalyzer] Analysing ${snapshot.length} messages...`);

        let report: PainPointReport;

        if (this.openai) {
            try {
                report = await this.analyseWithGPT(snapshot);
            } catch (err) {
                console.error('[ChannelAnalyzer] OpenAI analysis failed:', err);
                report = this.generateFallbackReport(snapshot);
            }
        } else {
            // Pattern-based fallback if no OpenAI key
            report = this.generateFallbackReport(snapshot);
        }

        await this.postReport(report);
    }

    private async analyseWithGPT(messages: BufferedMessage[]): Promise<PainPointReport> {
        const prompt = ANALYSIS_PROMPT_TEMPLATE(messages);

        const completion = await this.openai!.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: PAIN_POINT_SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 1500,
            response_format: { type: 'json_object' },
        });

        const raw = completion.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw);

        return {
            summary: parsed.summary ?? 'No summary generated.',
            scamAlerts: parsed.scamAlerts ?? [],
            tiltPatterns: parsed.tiltPatterns ?? [],
            communityNeeds: parsed.communityNeeds ?? [],
            positiveSignals: parsed.positiveSignals ?? [],
            actionItems: parsed.actionItems ?? [],
            messageCount: messages.length,
            analysedAt: new Date(),
        };
    }

    private generateFallbackReport(messages: BufferedMessage[]): PainPointReport {
        // Basic keyword-based pattern matching as fallback
        const scamKeywords = ['free money', 'dm me', 'guaranteed', 'send sol', 'send usdc', 'click here', 'not a scam'];
        const tiltKeywords = ['lost everything', 'chase', 'one more', 'all in', 'can\'t stop', 'need to win', 'broke', 'ruined'];

        const allText = messages.map(m => m.content.toLowerCase()).join(' ');

        const foundScam = scamKeywords.filter(k => allText.includes(k));
        const foundTilt = tiltKeywords.filter(k => allText.includes(k));

        return {
            summary: `Pattern-based analysis of ${messages.length} messages. OpenAI key not configured — using keyword detection.`,
            scamAlerts: foundScam.length > 0 ? [`Detected potential scam keywords: ${foundScam.join(', ')}`] : [],
            tiltPatterns: foundTilt.length > 0 ? [`Tilt-related language detected: ${foundTilt.join(', ')}`] : [],
            communityNeeds: [],
            positiveSignals: [],
            actionItems: foundScam.length > 0 ? ['Review recent messages for potential scam activity'] : [],
            messageCount: messages.length,
            analysedAt: new Date(),
        };
    }

    private async postReport(report: PainPointReport): Promise<void> {
        try {
            const channel = await this.client.channels.fetch(this.reportChannelId) as TextChannel;
            if (!channel?.isTextBased()) {
                console.error('[ChannelAnalyzer] Report channel not found or not a text channel.');
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Community Intelligence Report')
                .setColor(0x00FFC6)
                .setDescription(report.summary)
                .addFields(
                    {
                        name: '🚩 Scam Alerts',
                        value: report.scamAlerts.length > 0
                            ? report.scamAlerts.map(a => `• ${a}`).join('\n')
                            : '✅ None detected',
                        inline: false,
                    },
                    {
                        name: '🎰 Tilt Patterns',
                        value: report.tiltPatterns.length > 0
                            ? report.tiltPatterns.map(t => `• ${t}`).join('\n')
                            : '✅ None detected',
                        inline: false,
                    },
                    {
                        name: '💬 Community Needs',
                        value: report.communityNeeds.length > 0
                            ? report.communityNeeds.map(n => `• ${n}`).join('\n')
                            : '— Nothing notable',
                        inline: true,
                    },
                    {
                        name: '✨ Positive Signals',
                        value: report.positiveSignals.length > 0
                            ? report.positiveSignals.map(p => `• ${p}`).join('\n')
                            : '— Nothing notable',
                        inline: true,
                    },
                    {
                        name: '⚡ Action Items',
                        value: report.actionItems.length > 0
                            ? report.actionItems.map(a => `• ${a}`).join('\n')
                            : '✅ No urgent actions needed',
                        inline: false,
                    }
                )
                .setFooter({ text: `Analysed ${report.messageCount} messages` })
                .setTimestamp(report.analysedAt);

            await channel.send({ embeds: [embed] });
            console.log(`[ChannelAnalyzer] Report posted to ${this.reportChannelId}`);
        } catch (err) {
            console.error('[ChannelAnalyzer] Failed to post report:', err);
        }
    }
}
