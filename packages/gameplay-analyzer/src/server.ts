/**
 * Gameplay Analyzer WebSocket Server
 * 
 * Receives live gameplay data, runs RTP/fairness analysis,
 * and streams results back to clients.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { GameplayAnalyzer, type SpinEvent } from './index.js';
import type { IncomingMessage } from 'http';

interface Session {
  id: string;
  userId: string;
  casinoId: string;
  gameId: string;
  analyzer: GameplayAnalyzer;
  startTime: number;
  lastActivity: number;
  spinCount: number;
}

interface ClientMessage {
  type: 'spin' | 'request_report' | 'start_session' | 'end_session';
  sessionId?: string;
  data?: any;
}

interface SpinData {
  sessionId: string;
  casinoId: string;
  gameId: string;
  userId: string;
  bet: number;
  payout: number;
  symbols?: string[];
  bonusRound?: boolean;
  freeSpins?: boolean;
  timestamp?: number;
}

export class GameplayAnalyzerServer {
  private wss: WebSocketServer;
  private sessions: Map<string, Session> = new Map();
  private clients: Map<WebSocket, Set<string>> = new Map(); // WebSocket -> subscribed session IDs
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval!: NodeJS.Timeout;
  
  constructor(private port: number = 7071) {
    this.wss = new WebSocketServer({ 
      port: this.port,
      perMessageDeflate: false // Disable compression for lower latency
    });
    
    this.setupServer();
    this.startCleanup();
    
    console.log(`[GameplayAnalyzer] WebSocket server listening on port ${this.port}`);
  }
  
  /**
   * Setup WebSocket server handlers
   */
  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('[GameplayAnalyzer] Client connected from', req.socket.remoteAddress);
      
      // Initialize client tracking
      this.clients.set(ws, new Set());
      
      // Send welcome message
      this.send(ws, {
        type: 'connected',
        message: 'TiltCheck Gameplay Analyzer connected'
      });
      
      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });
      
      ws.on('close', () => {
        console.log('[GameplayAnalyzer] Client disconnected');
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('[GameplayAnalyzer] WebSocket error:', error);
      });
    });
  }
  
  /**
   * Handle incoming client message
   */
  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'start_session':
          this.handleStartSession(ws, message.data);
          break;
        
        case 'spin':
          this.handleSpin(ws, message.data);
          break;
        
        case 'request_report':
          this.handleReportRequest(ws, message.sessionId!);
          break;
        
        case 'end_session':
          this.handleEndSession(ws, message.sessionId!);
          break;
        
        default:
          this.send(ws, {
            type: 'error',
            message: `Unknown message type: ${message.type}`
          });
      }
    } catch (error) {
      console.error('[GameplayAnalyzer] Error handling message:', error);
      this.send(ws, {
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Start a new analysis session
   */
  private handleStartSession(ws: WebSocket, data: {
    sessionId: string;
    userId: string;
    casinoId: string;
    gameId: string;
  }): void {
    const { sessionId, userId, casinoId, gameId } = data;
    
    // Create new session
    const session: Session = {
      id: sessionId,
      userId,
      casinoId,
      gameId,
      analyzer: new GameplayAnalyzer(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      spinCount: 0
    };
    
    this.sessions.set(sessionId, session);
    
    // Subscribe client to session
    this.clients.get(ws)?.add(sessionId);
    
    console.log(`[GameplayAnalyzer] Started session ${sessionId} for user ${userId}`);
    
    this.send(ws, {
      type: 'session_started',
      sessionId,
      message: 'Analysis session started'
    });
  }
  
  /**
   * Handle spin data
   */
  private handleSpin(ws: WebSocket, data: SpinData): void {
    const { sessionId, bet, payout, symbols, bonusRound, freeSpins, timestamp } = data;
    
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.send(ws, {
        type: 'error',
        message: `Session not found: ${sessionId}`
      });
      return;
    }
    
    // Update session activity
    session.lastActivity = Date.now();
    session.spinCount++;
    
    // Record spin in analyzer
    const spinEvent: SpinEvent = {
      gameId: session.gameId,
      casinoId: session.casinoId,
      userId: session.userId,
      sessionId,
      bet,
      payout,
      symbols,
      bonusRound,
      freeSpins,
      timestamp: timestamp || Date.now()
    };
    
    session.analyzer.recordSpin(spinEvent);
    
    // Run analysis every 10 spins or if high-value spin
    const shouldAnalyze = session.spinCount % 10 === 0 || payout > bet * 50;
    
    if (shouldAnalyze) {
      const stats = session.analyzer.calculateSessionStats(sessionId);
      const rtpAnalysis = session.analyzer.analyzeRTP(sessionId);
      const anomalies = session.analyzer.detectAnomalies(sessionId);
      
      // Broadcast to all clients subscribed to this session
      this.broadcast(sessionId, {
        type: 'analysis_update',
        sessionId,
        stats,
        rtpAnalysis,
        anomalies: anomalies.length,
        timestamp: Date.now()
      });
      
      // If anomalies detected, send detailed alert
      if (anomalies.length > 0) {
        this.broadcast(sessionId, {
          type: 'anomaly_detected',
          sessionId,
          anomalies,
          timestamp: Date.now()
        });
      }
    }
    
    // Send acknowledgment
    this.send(ws, {
      type: 'spin_recorded',
      sessionId,
      spinNumber: session.spinCount
    });
  }
  
  /**
   * Handle fairness report request
   */
  private handleReportRequest(ws: WebSocket, sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.send(ws, {
        type: 'error',
        message: `Session not found: ${sessionId}`
      });
      return;
    }
    
    const report = session.analyzer.generateFairnessReport(sessionId);
    
    this.send(ws, {
      type: 'report',
      sessionId,
      data: report,
      timestamp: Date.now()
    });
  }
  
  /**
   * End analysis session
   */
  private handleEndSession(ws: WebSocket, sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.send(ws, {
        type: 'error',
        message: `Session not found: ${sessionId}`
      });
      return;
    }
    
    // Generate final report
    const finalReport = session.analyzer.generateFairnessReport(sessionId);
    
    // Send to all subscribed clients
    this.broadcast(sessionId, {
      type: 'session_ended',
      sessionId,
      finalReport,
      duration: Date.now() - session.startTime,
      totalSpins: session.spinCount,
      timestamp: Date.now()
    });
    
    // Clean up
    this.sessions.delete(sessionId);
    
    console.log(`[GameplayAnalyzer] Ended session ${sessionId} - ${session.spinCount} spins analyzed`);
  }
  
  /**
   * Send message to specific client
   */
  private send(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * Broadcast message to all clients subscribed to a session
   */
  private broadcast(sessionId: string, message: any): void {
    for (const [ws, sessions] of this.clients.entries()) {
      if (sessions.has(sessionId)) {
        this.send(ws, message);
      }
    }
  }
  
  /**
   * Start cleanup timer for stale sessions
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleSessionIds: string[] = [];
      
      for (const [id, session] of this.sessions.entries()) {
        if (now - session.lastActivity > this.sessionTimeout) {
          staleSessionIds.push(id);
        }
      }
      
      if (staleSessionIds.length > 0) {
        console.log(`[GameplayAnalyzer] Cleaning up ${staleSessionIds.length} stale sessions`);
        
        for (const id of staleSessionIds) {
          this.broadcast(id, {
            type: 'session_timeout',
            sessionId: id,
            message: 'Session timed out due to inactivity'
          });
          
          this.sessions.delete(id);
        }
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Get session statistics
   */
  getSessionStats(): {
    activeSessions: number;
    totalSpins: number;
    connectedClients: number;
  } {
    let totalSpins = 0;
    for (const session of this.sessions.values()) {
      totalSpins += session.spinCount;
    }
    
    return {
      activeSessions: this.sessions.size,
      totalSpins,
      connectedClients: this.clients.size
    };
  }
  
  /**
   * Shutdown server
   */
  shutdown(): void {
    console.log('[GameplayAnalyzer] Shutting down...');
    
    clearInterval(this.cleanupInterval);
    
    // End all sessions
    for (const sessionId of this.sessions.keys()) {
      this.broadcast(sessionId, {
        type: 'server_shutdown',
        message: 'Server is shutting down'
      });
    }
    
    // Close all connections
    this.wss.close();
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.ANALYZER_PORT || '7071');
  const server = new GameplayAnalyzerServer(port);
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    server.shutdown();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    server.shutdown();
    process.exit(0);
  });
  
  // Log stats every minute
  setInterval(() => {
    const stats = server.getSessionStats();
    console.log('[GameplayAnalyzer] Stats:', stats);
  }, 60000);
}
