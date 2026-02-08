import { collectclock, StaticBonusData, StaticDropData } from '@tiltcheck/collectclock';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Correct path to data directory relative to apps/discord-bot/dist/handlers
const DATA_DIR = path.resolve(__dirname, '../../../../data');

/**
 * Initialize CollectClock service with static data
 */
export function initializeCollectClock() {
  try {
    console.log('🕒 [CollectClock] Initializing with static data...');
    
    const bonusDataPath = path.join(DATA_DIR, 'bonus-data.json');
    const dropDataPath = path.join(DATA_DIR, 'bonus-drops-data.json');

    let bonusData: StaticBonusData[] = [];
    let dropData: StaticDropData | undefined;

    if (fs.existsSync(bonusDataPath)) {
      bonusData = JSON.parse(fs.readFileSync(bonusDataPath, 'utf8'));
      console.log(`  ├─ Loaded ${bonusData.length} brands from bonus-data.json`);
    } else {
      console.warn(`  ├─ ⚠️ bonus-data.json not found at ${bonusDataPath}`);
    }

    if (fs.existsSync(dropDataPath)) {
      dropData = JSON.parse(fs.readFileSync(dropDataPath, 'utf8'));
      console.log(`  ├─ Loaded drops history from bonus-drops-data.json`);
    }

    collectclock.initializeFromStaticData(bonusData, dropData);
    console.log('✅ [CollectClock] Service ready\n');
  } catch (error) {
    console.error('❌ [CollectClock] Initialization failed:', error);
  }
}
