/**
 * Screen Analyzer - Automated Gameplay Detection
 * 
 * Uses OCR and visual pattern recognition to automatically detect:
 * - Spin results (bet amount, win amount, symbols)
 * - Casino UI elements (balance, game state)
 * - Tilt indicators (rapid clicking, increasing bets)
 * 
 * Integrates with Discord screen sharing and browser automation.
 */

import { eventRouter } from '@tiltcheck/event-router';
import { WebSocketServer } from 'ws';

// Optional dependencies - only import if available
let Jimp: any;
let createWorker: any;
let puppeteer: any;

try {
  Jimp = (await import('jimp')).default;
  createWorker = (await import('tesseract.js')).createWorker;
  puppeteer = (await import('puppeteer')).default;
} catch (error) {
  console.warn('[ScreenAnalyzer] OCR dependencies not available. Install jimp, tesseract.js, puppeteer for full functionality.');
}

export interface SpinDetection {
  timestamp: number;
  betAmount: number | null;
  winAmount: number | null;
  symbols?: string[];
  gameState: 'spinning' | 'idle' | 'bonus' | 'unknown';
  confidence: number;
  rawText: string;
}

export interface TiltPatternDetection {
  userId: string;
  timestamp: number;
  pattern: 'rapid_betting' | 'increasing_bets' | 'rage_clicking' | 'extended_session';
  severity: number;
  context: Record<string, any>;
}

export class ScreenAnalyzer {
  private ocrWorker: any;
  private browser: Browser | null = null;
  private wsServer: WebSocketServer;
  private activeAnalysis = new Map<string, AnalysisSession>();

  constructor() {
    this.wsServer = new WebSocketServer({ port: parseInt(process.env.SCREEN_ANALYZER_WS_PORT || '7073') });
    this.setupWebSocketHandlers();
    this.initializeOCR();
  }

  private async initializeOCR() {
    console.log('[ScreenAnalyzer] Initializing OCR worker...');
    this.ocrWorker = await createWorker('eng');
    console.log('[ScreenAnalyzer] OCR worker ready');
  }

  private setupWebSocketHandlers() {
    this.wsServer.on('connection', (ws, req) => {
      const url = new URL(req.url!, 'ws://localhost');
      const sessionId = url.searchParams.get('session');
      const userId = url.searchParams.get('userId');

      if (!sessionId || !userId) {
        ws.close(1008, 'Missing session or userId');
        return;
      }

      console.log(`[ScreenAnalyzer] Client connected: ${userId}/${sessionId}`);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(userId, sessionId, message, ws);
        } catch (error) {
          console.error('[ScreenAnalyzer] WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        this.stopAnalysis(sessionId);
        console.log(`[ScreenAnalyzer] Client disconnected: ${userId}/${sessionId}`);
      });
    });
  }

  /**
   * Start automated analysis for a user session
   */
  async startAnalysis(userId: string, sessionId: string, casinoId: string, options: AnalysisOptions = {}) {
    if (this.activeAnalysis.has(sessionId)) {
      throw new Error('Analysis already active for this session');
    }

    const session: AnalysisSession = {
      userId,
      sessionId,
      casinoId,
      startTime: Date.now(),
      lastSpin: null,
      spinCount: 0,
      totalBet: 0,
      totalWin: 0,
      detectedPatterns: [],
      options: {
        enableOCR: options.enableOCR ?? true,
        enablePatternDetection: options.enablePatternDetection ?? true,
        screenshotInterval: options.screenshotInterval ?? 2000,
        ...options
      }
    };

    this.activeAnalysis.set(sessionId, session);

    // Initialize browser for automated screenshot capture if needed
    if (session.options.autoCapture) {
      await this.initializeBrowser(session);
    }

    console.log(`[ScreenAnalyzer] Analysis started: ${userId}/${sessionId} (${casinoId})`);
    
    await eventRouter.publish('gameplay.analysis.started', 'screen-analyzer', {
      userId,
      sessionId,
      casinoId,
      timestamp: Date.now()
    });

    return session;
  }

  /**
   * Process screenshot for gameplay detection
   */
  async processScreenshot(sessionId: string, imageData: Buffer | string): Promise<SpinDetection[]> {
    const session = this.activeAnalysis.get(sessionId);
    if (!session) {
      throw new Error('No active analysis session');
    }

    try {
      // Load image with Jimp
      const image = typeof imageData === 'string' 
        ? await Jimp.read(Buffer.from(imageData, 'base64'))
        : await Jimp.read(imageData);

      const detections: SpinDetection[] = [];

      // Extract game area regions for analysis
      const gameRegions = await this.extractGameRegions(image, session.casinoId);

      for (const region of gameRegions) {
        const detection = await this.analyzeGameRegion(region, session);
        if (detection) {
          detections.push(detection);
        }
      }

      // Update session with new detections
      for (const detection of detections) {
        if (detection.betAmount && detection.winAmount !== null) {
          await this.recordSpin(session, detection);
        }
      }

      // Check for tilt patterns
      if (session.options.enablePatternDetection) {
        const tiltPatterns = this.detectTiltPatterns(session, detections);
        for (const pattern of tiltPatterns) {
          await this.handleTiltPattern(pattern);
        }
      }

      return detections;
    } catch (error) {
      console.error('[ScreenAnalyzer] Screenshot processing error:', error);
      throw error;
    }
  }

  private async extractGameRegions(image: Jimp, casinoId: string): Promise<GameRegion[]> {
    // Casino-specific region extraction
    const regions: GameRegion[] = [];

    switch (casinoId) {
      case 'crown-coins':
      case 'crowncoins':
        const regionDefs = [
          { name: 'bet-area', x: 0.1, y: 0.85, width: 0.2, height: 0.1 },
          { name: 'win-area', x: 0.7, y: 0.85, width: 0.2, height: 0.1 },
          { name: 'balance-area', x: 0.8, y: 0.05, width: 0.15, height: 0.08 },
          { name: 'reels', x: 0.2, y: 0.2, width: 0.6, height: 0.5 }
        ];
        regions.push(...regionDefs.map(r => ({ ...r, image: null as any })));
        break;
      case 'stake-us':
        regions.push(
          { name: 'bet-area', x: 0.05, y: 0.9, width: 0.2, height: 0.08 },
          { name: 'win-area', x: 0.75, y: 0.9, width: 0.2, height: 0.08 },
          { name: 'balance-area', x: 0.85, y: 0.02, width: 0.12, height: 0.06 }
        );
        break;
      default:
        // Generic regions for unknown casinos
        regions.push(
          { name: 'bottom-left', x: 0.0, y: 0.8, width: 0.3, height: 0.2 },
          { name: 'bottom-right', x: 0.7, y: 0.8, width: 0.3, height: 0.2 },
          { name: 'top-right', x: 0.7, y: 0.0, width: 0.3, height: 0.2 }
        );
    }

    return regions.map(region => ({
      ...region,
      image: image.clone().crop(
        Math.floor(image.getWidth() * region.x),
        Math.floor(image.getHeight() * region.y),
        Math.floor(image.getWidth() * region.width),
        Math.floor(image.getHeight() * region.height)
      )
    }));
  }

  private async analyzeGameRegion(region: GameRegion, session: AnalysisSession): Promise<SpinDetection | null> {
    if (!session.options.enableOCR) return null;

    try {
      // Convert to buffer for OCR
      const buffer = await region.image.getBufferAsync(Jimp.MIME_PNG);
      
      // OCR text extraction
      const { data: { text } } = await this.ocrWorker.recognize(buffer);
      const cleanText = text.replace(/\s+/g, ' ').trim();

      if (!cleanText) return null;

      // Parse numbers from text
      const numbers = this.extractNumbers(cleanText);
      const gameState = this.detectGameState(cleanText, region.name);

      // Determine bet and win amounts based on region and patterns
      let betAmount: number | null = null;
      let winAmount: number | null = null;

      if (region.name.includes('bet') && numbers.length > 0) {
        betAmount = numbers[0];
      } else if (region.name.includes('win') && numbers.length > 0) {
        winAmount = numbers[0];
      } else if (numbers.length >= 2) {
        // Try to infer bet/win from context
        betAmount = Math.min(...numbers);
        winAmount = Math.max(...numbers);
      }

      const detection: SpinDetection = {
        timestamp: Date.now(),
        betAmount,
        winAmount,
        gameState,
        confidence: this.calculateConfidence(cleanText, numbers, region.name),
        rawText: cleanText
      };

      return detection;
    } catch (error) {
      console.error(`[ScreenAnalyzer] Region analysis error (${region.name}):`, error);
      return null;
    }
  }

  private extractNumbers(text: string): number[] {
    // Match currency amounts: $1.00, 1.50, etc.
    const patterns = [
      /\$?([\d,]+\.?\d*)/g,
      /([\d,]+\.?\d*)\s*(?:USD|SC|GC|COINS?)/gi,
      /(?:BET|WIN|BALANCE)[\s:]*\$?([\d,]+\.?\d*)/gi
    ];

    const numbers: number[] = [];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const numStr = match[1].replace(/,/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num) && num >= 0) {
          numbers.push(num);
        }
      }
    }

    return [...new Set(numbers)].sort((a, b) => b - a); // Remove duplicates, sort desc
  }

  private detectGameState(text: string, regionName: string): SpinDetection['gameState'] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('spinning') || lowerText.includes('spin')) {
      return 'spinning';
    } else if (lowerText.includes('bonus') || lowerText.includes('free')) {
      return 'bonus';
    } else if (lowerText.includes('win') || lowerText.includes('you won')) {
      return 'idle';
    } else if (regionName.includes('reel') && text.length > 10) {
      return 'idle'; // Probably showing symbols
    }
    
    return 'unknown';
  }

  private calculateConfidence(text: string, numbers: number[], regionName: string): number {
    let confidence = 0.3; // Base confidence
    
    if (numbers.length > 0) confidence += 0.3;
    if (text.match(/\$|USD|SC|GC|COINS?|BET|WIN|BALANCE/i)) confidence += 0.2;
    if (regionName.includes('bet') || regionName.includes('win')) confidence += 0.1;
    if (text.length > 5 && text.length < 50) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private detectTiltPatterns(session: AnalysisSession, detections: SpinDetection[]): TiltPatternDetection[] {
    const patterns: TiltPatternDetection[] = [];
    const now = Date.now();

    // Rapid betting detection (multiple spins in quick succession)
    if (session.spinCount > 0) {
      const timeSinceLastSpin = now - (session.lastSpin || 0);
      if (timeSinceLastSpin < 1000) { // Less than 1 second between spins
        patterns.push({
          userId: session.userId,
          timestamp: now,
          pattern: 'rapid_betting',
          severity: 3,
          context: { timeBetweenSpins: timeSinceLastSpin, spinCount: session.spinCount }
        });
      }
    }

    // Increasing bet pattern detection
    const recentSpins = session.detectedPatterns.filter(p => p.pattern === 'increasing_bets').slice(-5);
    if (recentSpins.length >= 3) {
      patterns.push({
        userId: session.userId,
        timestamp: now,
        pattern: 'increasing_bets',
        severity: 2,
        context: { recentIncreases: recentSpins.length }
      });
    }

    // Extended session detection (playing for too long)
    const sessionDuration = now - session.startTime;
    if (sessionDuration > 2 * 60 * 60 * 1000) { // 2 hours
      patterns.push({
        userId: session.userId,
        timestamp: now,
        pattern: 'extended_session',
        severity: 2,
        context: { sessionDuration, spinCount: session.spinCount }
      });
    }

    return patterns;
  }

  private async recordSpin(session: AnalysisSession, detection: SpinDetection) {
    if (detection.betAmount) {
      session.totalBet += detection.betAmount;
      session.spinCount++;
    }
    if (detection.winAmount !== null) {
      session.totalWin += detection.winAmount;
    }
    session.lastSpin = detection.timestamp;

    // Publish spin event to the ecosystem
    await eventRouter.publish('spin.detected', 'screen-analyzer', {
      userId: session.userId,
      sessionId: session.sessionId,
      casinoId: session.casinoId,
      betAmount: detection.betAmount,
      winAmount: detection.winAmount,
      timestamp: detection.timestamp,
      confidence: detection.confidence,
      source: 'ocr'
    });
  }

  private async handleTiltPattern(pattern: TiltPatternDetection) {
    console.log(`[ScreenAnalyzer] Tilt pattern detected: ${pattern.pattern} (severity: ${pattern.severity})`);
    
    await eventRouter.publish('tilt.pattern.detected', 'screen-analyzer', pattern);
  }

  private async handleWebSocketMessage(userId: string, sessionId: string, message: any, ws: any) {
    switch (message.type) {
      case 'screenshot':
        try {
          const detections = await this.processScreenshot(sessionId, message.data);
          ws.send(JSON.stringify({
            type: 'detections',
            data: detections
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
        break;

      case 'start-auto-capture':
        const session = this.activeAnalysis.get(sessionId);
        if (session) {
          session.options.autoCapture = true;
          await this.initializeBrowser(session);
        }
        break;

      case 'stop-auto-capture':
        await this.stopAutoCapture(sessionId);
        break;
    }
  }

  private async initializeBrowser(session: AnalysisSession) {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    // Browser automation for auto-capture would go here
    // This is a placeholder for future implementation
  }

  async stopAnalysis(sessionId: string) {
    const session = this.activeAnalysis.get(sessionId);
    if (!session) return;

    await this.stopAutoCapture(sessionId);
    
    const duration = Date.now() - session.startTime;
    const rtp = session.totalBet > 0 ? session.totalWin / session.totalBet : 0;

    await eventRouter.publish('analysis.completed', 'screen-analyzer', {
      userId: session.userId,
      sessionId: session.sessionId,
      casinoId: session.casinoId,
      duration,
      spinCount: session.spinCount,
      totalBet: session.totalBet,
      totalWin: session.totalWin,
      rtp,
      patternsDetected: session.detectedPatterns.length
    });

    this.activeAnalysis.delete(sessionId);
    console.log(`[ScreenAnalyzer] Analysis stopped: ${session.userId}/${sessionId}`);
  }

  private async stopAutoCapture(sessionId: string) {
    const session = this.activeAnalysis.get(sessionId);
    if (session) {
      session.options.autoCapture = false;
    }
  }

  async cleanup() {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
    }
    if (this.browser) {
      await this.browser.close();
    }
    this.wsServer.close();
  }
}

// Supporting interfaces
interface AnalysisSession {
  userId: string;
  sessionId: string;
  casinoId: string;
  startTime: number;
  lastSpin: number | null;
  spinCount: number;
  totalBet: number;
  totalWin: number;
  detectedPatterns: TiltPatternDetection[];
  options: AnalysisOptions;
}

interface AnalysisOptions {
  enableOCR?: boolean;
  enablePatternDetection?: boolean;
  autoCapture?: boolean;
  screenshotInterval?: number;
}

interface GameRegion {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image: Jimp;
}

// Export main service
export const screenAnalyzer = new ScreenAnalyzer();