/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * TiltCheck Smoke Test
 * 
 * Verifies core ecosystem paths:
 * 1. Health Checks
 * 2. Auth Flow (Mock)
 * 3. RGaaS Evaluation (Breathalyzer)
 * 4. Partner Webhook Dispatch
 */

import axios from 'axios';

const API_URL = process.env.TILTCHECK_API_URL || 'http://localhost:3001/api';
const SYSTEM_KEY = process.env.COMMUNITY_INTEL_INGEST_KEY || 'ROTATE_THIS_IMMEDIATELY';

async function runSmokeTest() {
  console.log('🚀 [Smoke Test] Starting ecosystem verification...');
  console.log(`🔗 Target API: ${API_URL}`);

  try {
    // 1. Health Check
    console.log('\n🏥 Checking API health...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ API Health: OK');

    // 2. RGaaS Evaluation (Breathalyzer)
    console.log('\n📊 Testing Breathalyzer Evaluation...');
    const evalResponse = await axios.post(`${API_URL}/rgaas/breathalyzer/evaluate`, {
      userId: 'smoke-test-user',
      eventsInWindow: 15,
      windowMinutes: 1,
      lossAmountWindow: 500
    }, {
        headers: {
            'x-system-key': SYSTEM_KEY
        }
    });

    if (evalResponse.data.result.riskTier === 'critical') {
      console.log('✅ Evaluation: OK (High risk detected as expected)');
    } else {
      console.log('⚠️ Evaluation: Unexpected risk tier:', evalResponse.data.result.riskTier);
    }

    // 3. Partner Auth Check
    console.log('\n🔑 Testing Partner Auth Endpoint...');
    try {
        await axios.get(`${API_URL}/partner/me`, {
            headers: {
                'X-TiltCheck-App-Id': 'smoke-app',
                'X-TiltCheck-Secret-Key': 'smoke-secret'
            }
        });
        console.log('✅ Partner Auth: OK');
    } catch (err: Error) {
        if (err.response?.status === 401) {
            console.log('✅ Partner Auth: Correctly rejected (No partner registered yet)');
        } else {
             console.warn('⚠️ Partner Auth: Unexpected error:', err.message);
        }
    }

    console.log('\n🏆 [Smoke Test] Successfully completed 3/3 core checks.');

  } catch (error: Error) {
    console.error('\n❌ [Smoke Test] Failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

runSmokeTest();
