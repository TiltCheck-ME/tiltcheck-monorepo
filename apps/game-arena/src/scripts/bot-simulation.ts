/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { GameManager } from '../game-manager.js';

async function runBotTest() {
  console.log('🚀 [BOT TEST] Starting automated game simulation...');
  
  const gm = new GameManager({ stateFilePath: 'data/test-arena-state.json' });
  await gm.initialize();

  const hostId = 'degen-host-99';
  const hostName = 'AlphaDegen';

  console.log('--- 1. CREATING GAME ---');
  const lobby = await gm.createGame(hostId, hostName, 'dad', { maxPlayers: 5 });
  const gameId = lobby.id;
  console.log(`✅ Game created: ${gameId}`);

  console.log('--- 2. BOTS JOINING ---');
  await gm.joinGame(gameId, 'bot-01', 'NeuralBot_Alpha');
  await gm.joinGame(gameId, 'bot-02', 'NeuralBot_Beta');
  console.log('✅ 2 Bots joined the arena.');

  console.log('--- 3. STARTING GAME ---');
  await gm.startGame(gameId);
  console.log('✅ Match started.');

  // Round 1
  let state = gm.getGameState(gameId, hostId);
  console.log(`📍 Round ${state.currentRound} | Question: "${state.currentQuestion.text}"`);
  console.log(`📍 Phase: ${state.phase} | Judge: ${state.cardCzar.username}`);

  // Bots submit cards
  console.log('--- 4. BOTS SUBMITTING ---');
  const bot1Hand = state.playerHands['bot-01'];
  const bot2Hand = state.playerHands['bot-02'];
  
  if (!bot1Hand || !bot2Hand) {
      throw new Error('Bot hands not found in state');
  }

  console.log(`Bot 1 plays: "${bot1Hand[0].text}"`);
  await gm.processAction(gameId, 'bot-01', { type: 'submit-card', cardId: bot1Hand[0].id });
  
  console.log(`Bot 2 plays: "${bot2Hand[0].text}"`);
  await gm.processAction(gameId, 'bot-02', { type: 'submit-card', cardId: bot2Hand[0].id });

  state = gm.getGameState(gameId, hostId);
  console.log(`✅ Submissions received: ${state.submissions.length}`);
  console.log(`📍 Phase shifted to: ${state.phase}`);

  // Judge (host) picks winner
  console.log('--- 5. JUDGE DECISION ---');
  const winnerId = 'bot-01';
  console.log(`Judge picks ${winnerId} as the winner!`);
  await gm.processAction(gameId, hostId, { type: 'judge-submission', playerId: winnerId });

  state = gm.getGameState(gameId, hostId);
  console.log(`✅ Round done. Current Scores:`, state.scores);
  console.log(`✅ Next Judge: ${state.cardCzar.username}`);

  console.log('\n✨ [BOT TEST] Simulation completed successfully!');
  process.exit(0);
}

runBotTest().catch((err) => {
  console.error('❌ [BOT TEST] Simulation failed:', err);
  process.exit(1);
});
