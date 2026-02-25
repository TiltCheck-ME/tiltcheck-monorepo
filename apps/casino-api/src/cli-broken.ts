/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
#!/usr/bin/env node
/**
 * TiltCheck Casino Data Collection CLI
 * 
 * Command-line tool for AI agents to submit casino data to TiltCheck.
 * Usage: npx @tiltcheck/casino-collector --casino-id stakeus --name "Stake US"
 */

import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';

const API_BASE = process.env.TILTCHECK_API_URL || 'https://api.tiltcheck.me/casino-api';
const API_KEY = process.env.TILTCHECK_API_KEY || 'tiltcheck-casino-collector-2024';

interface CasinoSubmission {
  id: string;
  name: string;
  baseURL: string;
  basicInfo?: {
    licenseNumber?: string;
    regulator?: string;
    founded?: string;
    headquarters?: string;
    operator?: string;
    status: 'live' | 'suspended' | 'investigating';
  };
  [key: string]: any;
}

interface ApiResponse {
  success?: boolean;
  casinoId?: string;
  timestamp?: string;
  updated?: number;
  errors?: any[];
  count?: number;
  casinos?: any[];
  message?: string;
}

program
  .name('casino-collector')
  .description('TiltCheck Casino Data Collection CLI')
  .version('1.0.0');

program
  .command('submit')
  .description('Submit casino data from JSON file or command line')
  .requiredOption('--casino-id <id>', 'Casino identifier')
  .requiredOption('--name <name>', 'Casino name')
  .requiredOption('--url <url>', 'Casino base URL')
  .option('--file <path>', 'JSON file with casino data')
  .option('--regulator <regulator>', 'Regulatory body (MGA, UKGC, etc.)')
  .option('--license <number>', 'License number')
  .option('--status <status>', 'Casino status (live|suspended|investigating)', 'live')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication')
  .action(async (options) => {
    try {
      let casinoData: CasinoSubmission;
      
      if (options.file) {
        // Load from file
        const filePath = path.resolve(options.file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        casinoData = JSON.parse(fileContent);
        
        // Override with command line options
        casinoData.id = options.casinoId;
        casinoData.name = options.name;
        casinoData.baseURL = options.url;
        
      } else {
        // Build from command line options
        casinoData = {
          id: options.casinoId,
          name: options.name,
          baseURL: options.url,
          basicInfo: {
            status: options.status,
            regulator: options.regulator,
            licenseNumber: options.license
          }
        };
      }
      
      const apiUrl = options.apiUrl || API_BASE;
      const apiKey = options.apiKey || API_KEY;
      
      console.log(`📤 Submitting casino data for: ${casinoData.name}`);
      console.log(`🎯 API endpoint: ${apiUrl}/api/casinos/${casinoData.id}`);
      
      const response = await fetch(`${apiUrl}/api/casinos/${casinoData.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(casinoData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\\n${error}`);
      }
      
      const result = await response.json() as ApiResponse;
      console.log('✅ Casino data submitted successfully!');
      console.log(`📊 Casino ID: ${result.casinoId || 'N/A'}`);
      console.log(`⏰ Timestamp: ${result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}`);
      
    } catch (error) {
      console.error('❌ Failed to submit casino data:');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('bulk')
  .description('Submit multiple casinos from JSON file')
  .requiredOption('--file <path>', 'JSON file with array of casino data')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication')
  .action(async (options) => {
    try {
      const filePath = path.resolve(options.file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const casinos = JSON.parse(fileContent);
      
      if (!Array.isArray(casinos)) {
        throw new Error('File must contain an array of casino objects');
      }
      
      const apiUrl = options.apiUrl || API_BASE;
      const apiKey = options.apiKey || API_KEY;
      
      console.log(`📤 Submitting ${casinos.length} casinos in bulk...`);
      
      const response = await fetch(`${apiUrl}/api/casinos/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ casinos })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\\n${error}`);
      }
      
      const result = await response.json() as ApiResponse;
      console.log('✅ Bulk submission completed!');
      console.log(`📊 Updated: ${result.updated || 0} casinos`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.errors.length}`);
        result.errors.forEach((error: any) => {
          console.log(`   - ${error.casino}: ${error.error}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to submit bulk casino data:');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all casinos in the system')
  .option('--status <status>', 'Filter by status (live|suspended|investigating)')
  .option('--format <format>', 'Output format (full|summary)', 'summary')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication')
  .action(async (options) => {
    try {
      const apiUrl = options.apiUrl || API_BASE;
      const apiKey = options.apiKey || API_KEY;
      
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.format) params.append('format', options.format);
      
      const response = await fetch(`${apiUrl}/api/casinos?${params}`, {
        headers: {
          'X-API-Key': apiKey
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\\n${error}`);
      }
      
      const result = await response.json();
      
      console.log(`📋 Found ${result.count} casinos`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (result.casinos && result.casinos.length > 0) {
        result.casinos.forEach((casino: any, index: number) => {
          console.log(`${index + 1}. ${casino.name} (${casino.id})`);
          console.log(`   Status: ${casino.status}`);
          if (casino.regulator) console.log(`   Regulator: ${casino.regulator}`);
          if (casino.collectionTimestamp) {
            console.log(`   Last Updated: ${new Date(casino.collectionTimestamp).toLocaleString()}`);
          }
          console.log('');
        });
      } else {
        console.log('No casinos found.');
      }
    } catch (error) {
      console.error('❌ Failed to list casinos:');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('get')
  .description('Get detailed information about a specific casino')
  .requiredOption('--casino-id <id>', 'Casino identifier')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication')
  .action(async (options) => {
    try {
      const apiUrl = options.apiUrl || API_BASE;
      const apiKey = options.apiKey || API_KEY;
      
      const response = await fetch(`${apiUrl}/api/casinos/${options.casinoId}`, {
        headers: {
          'X-API-Key': apiKey
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.error(`❌ Casino '${options.casinoId}' not found`);
          process.exit(1);
        }
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\\n${error}`);
      }
      
      const casino = await response.json();
      
      console.log(`🎰 ${casino.name} (${casino.id})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`URL: ${casino.baseURL}`);
      console.log(`Status: ${casino.basicInfo.status}`);
      
      if (casino.basicInfo.regulator) {
        console.log(`Regulator: ${casino.basicInfo.regulator}`);
      }
      
      if (casino.basicInfo.founded) {
        console.log(`Founded: ${casino.basicInfo.founded}`);
      }
      
      if (casino.regulatory?.licenses?.length) {
        console.log('\\nLicenses:');
        casino.regulatory.licenses.forEach((license: any) => {
          console.log(`  - ${license.jurisdiction}: ${license.number} (${license.status})`);
        });
      }
      
      if (casino.security) {
        console.log('\\nSecurity:');
        console.log(`  SSL: ${casino.security.ssl ? '✅' : '❌'}`);
        if (casino.security.auditedBy?.length) {
          console.log(`  Audited by: ${casino.security.auditedBy.join(', ')}`);
        }
      }
      
      if (casino.reputation) {
        console.log('\\nReputation:');
        if (casino.reputation.trustpilot) {
          console.log(`  Trustpilot: ${casino.reputation.trustpilot}/5`);
        }
        if (casino.reputation.complaints) {
          const c = casino.reputation.complaints;
          console.log(`  Complaints: ${c.resolved}/${c.total} resolved`);
        }
      }
      
      console.log(`\\nLast Updated: ${new Date(casino.collectionTimestamp).toLocaleString()}`);
      
    } catch (error) {
      console.error('❌ Failed to get casino data:');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('template')
  .description('Generate a template JSON file for casino data collection')
  .option('--output <file>', 'Output file path', 'casino-template.json')
  .action(async (options) => {
    try {
      const template = {
        id: 'casino-identifier',
        name: 'Casino Name',
        baseURL: 'https://casino.com',
        basicInfo: {
          licenseNumber: 'License number if available',
          regulator: 'MGA, UKGC, Curacao, etc.',
          founded: 'Year founded',
          headquarters: 'Location',
          operator: 'Operating company',
          status: 'live'
        },
        rtpData: {
          advertised: [95.0, 96.5, 98.0],
          games: [
            {
              name: 'Game name',
              provider: 'Provider name',
              rtp: 96.5,
              variance: 'medium'
            }
          ]
        },
        regulatory: {
          licenses: [
            {
              jurisdiction: 'Malta Gaming Authority',
              number: 'MGA/B2C/123/2019',
              status: 'active',
              expires: '2025-12-31'
            }
          ],
          compliance: {
            kyc: true,
            aml: true,
            responsibleGaming: true,
            fairPlay: true
          }
        },
        security: {
          ssl: true,
          twoFactor: false,
          encryption: 'TLS 1.3',
          dataProtection: 'GDPR compliant',
          auditedBy: ['eCOGRA', 'iTech Labs'],
          lastAudit: '2024-01-15'
        },
        financial: {
          currencies: ['USD', 'EUR', 'BTC'],
          paymentMethods: ['Visa', 'Mastercard', 'Skrill'],
          withdrawalLimits: {
            min: 10,
            max: 5000,
            currency: 'USD'
          },
          withdrawalTimes: {
            processing: '24 hours',
            typical: '1-3 business days'
          }
        },
        reputation: {
          trustpilot: 4.2,
          askgamblers: 8.1,
          complaints: {
            total: 45,
            resolved: 40,
            unresolved: 5
          },
          blacklists: []
        }
      };
      
      await fs.writeFile(options.output, JSON.stringify(template, null, 2));
      console.log(`📝 Template created: ${options.output}`);
      console.log('💡 Edit the template and submit with: casino-collector submit --file ' + options.output);
      
    } catch (error) {
      console.error('❌ Failed to create template:');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Get collection status and statistics')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication')
  .action(async (options) => {
    try {
      const apiUrl = options.apiUrl || API_BASE;
      const apiKey = options.apiKey || API_KEY;
      
      const response = await fetch(`${apiUrl}/api/collection/status`, {
        headers: {
          'X-API-Key': apiKey
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\\n${error}`);
      }
      
      const stats = await response.json();
      
      console.log('📊 Collection Status');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Total Casinos: ${stats.totalCasinos}`);
      console.log('');
      console.log('By Status:');
      console.log(`  Live: ${stats.byStatus.live}`);
      console.log(`  Suspended: ${stats.byStatus.suspended}`);
      console.log(`  Investigating: ${stats.byStatus.investigating}`);
      console.log('');
      console.log('Data Completeness:');
      console.log(`  Has RTP Data: ${stats.dataCompleteness.hasRTP}`);
      console.log(`  Has Regulatory Data: ${stats.dataCompleteness.hasRegulatory}`);
      console.log(`  Has Security Data: ${stats.dataCompleteness.hasSecurity}`);
      console.log(`  Has Reputation Data: ${stats.dataCompleteness.hasReputation}`);
      
      if (stats.lastUpdated) {
        console.log('');
        console.log(`Last Updated: ${new Date(stats.lastUpdated).toLocaleString()}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to get status:');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();