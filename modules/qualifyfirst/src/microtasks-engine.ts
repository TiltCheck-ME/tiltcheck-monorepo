/**
 * QualifyFirst Microtasks Engine
 * 
 * Connects users with revenue-generating microtasks where we earn referral fees
 * and pass a portion to users. Includes creative tasks, blockchain tasks, and review platforms.
 */

export interface MicrotaskProvider {
  id: string;
  name: string;
  category: 'crypto' | 'reviews' | 'cashback' | 'blockchain' | 'social' | 'testing';
  ourRevenue: {
    type: 'referral_commission' | 'affiliate_fee' | 'revenue_share' | 'platform_fee';
    estimatedAmount: number; // USD per user completion
  };
  userPayout: {
    amount: number; // USD
    type: 'instant' | 'pending' | 'gift_card' | 'crypto';
    processingTime?: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
  requirements: string[];
  instructions: string;
  verificationMethod: 'screenshot' | 'wallet_connect' | 'email' | 'api' | 'manual';
  active: boolean;
}

export interface MicrotaskCompletion {
  userId: string;
  taskId: string;
  completedAt: string;
  verified: boolean;
  proofSubmitted?: {
    type: string;
    data: string;
    submittedAt: string;
  };
  payoutStatus: 'pending' | 'approved' | 'paid' | 'rejected';
  payoutAmount?: number;
  ourRevenue?: number;
}

/**
 * Revenue-Generating Microtasks Catalog
 * These tasks generate income for us through referrals/affiliates
 */
export const MICROTASK_CATALOG: MicrotaskProvider[] = [
  // CRYPTO & BLOCKCHAIN TASKS (High Revenue)
  {
    id: 'solana-rent-refund',
    name: 'Reclaim Solana Wallet Rent',
    category: 'crypto',
    ourRevenue: {
      type: 'platform_fee',
      estimatedAmount: 0.50 // We charge 5% fee on recovered rent
    },
    userPayout: {
      amount: 0, // Variable based on their wallet
      type: 'instant',
      processingTime: 'Immediate'
    },
    difficulty: 'easy',
    estimatedMinutes: 3,
    requirements: ['Solana wallet with closed accounts', 'Basic understanding of SOL'],
    instructions: 'Close unused token accounts and reclaim SOL rent. We take 5% service fee, you keep 95% of recovered rent.',
    verificationMethod: 'wallet_connect',
    active: true
  },
  {
    id: 'mintrax-tasks',
    name: 'MintRax Network Tasks',
    category: 'blockchain',
    ourRevenue: {
      type: 'referral_commission',
      estimatedAmount: 2.50 // Estimated referral bonus
    },
    userPayout: {
      amount: 1.50,
      type: 'crypto',
      processingTime: '24-48 hours'
    },
    difficulty: 'medium',
    estimatedMinutes: 15,
    requirements: ['Crypto wallet', 'Email address'],
    instructions: 'Complete tasks on MintRax Network. Use our referral link: https://app.mintrax.network?ref=ref_a6b23c55',
    verificationMethod: 'api',
    active: true
  },
  {
    id: 'grind-bux-offers',
    name: 'GrindBux Simple Offers',
    category: 'cashback',
    ourRevenue: {
      type: 'affiliate_fee',
      estimatedAmount: 3.00 // Per completed offer
    },
    userPayout: {
      amount: 2.00,
      type: 'instant',
      processingTime: '1-3 days'
    },
    difficulty: 'easy',
    estimatedMinutes: 10,
    requirements: ['Email address', 'US/UK/CA resident'],
    instructions: 'Complete simple cashback offers through GrindBux. We share affiliate earnings with you.',
    verificationMethod: 'api',
    active: true
  },
  {
    id: 'jumptask-signup',
    name: 'JumpTask - Microtask Platform Signup',
    category: 'cashback',
    ourRevenue: {
      type: 'referral_commission',
      estimatedAmount: 5.00 // 10% bonus on user's first task
    },
    userPayout: {
      amount: 3.00,
      type: 'instant',
      processingTime: 'Instant + 10% bonus on 1st task'
    },
    difficulty: 'easy',
    estimatedMinutes: 5,
    requirements: ['Email address', 'Valid ID for verification'],
    instructions: 'Sign up for JumpTask and complete your first microtask to earn bonus rewards. Use referral link: https://www.jumptask.io/r/sopypokofuvi',
    verificationMethod: 'api',
    active: true
  },

  // SOFTWARE REVIEW PLATFORMS (Proven Revenue)
  {
    id: 'capterra-reviews',
    name: 'Capterra Software Reviews (3 Reviews)',
    category: 'reviews',
    ourRevenue: {
      type: 'referral_commission',
      estimatedAmount: 15.00 // They pay us for verified reviews
    },
    userPayout: {
      amount: 10.00,
      type: 'gift_card',
      processingTime: '7-14 days after 3rd review'
    },
    difficulty: 'medium',
    estimatedMinutes: 45,
    requirements: ['Professional experience with software tools', 'Valid work email'],
    instructions: 'Write 3 detailed software reviews on Capterra. Must be 150+ words each. You get $10 gift card, we get $15 referral fee.',
    verificationMethod: 'email',
    active: true
  },
  {
    id: 'g2-crowd-reviews',
    name: 'G2 Software Reviews',
    category: 'reviews',
    ourRevenue: {
      type: 'referral_commission',
      estimatedAmount: 12.00
    },
    userPayout: {
      amount: 8.00,
      type: 'gift_card',
      processingTime: '10-15 days'
    },
    difficulty: 'medium',
    estimatedMinutes: 30,
    requirements: ['Used business software in last 12 months', 'LinkedIn profile'],
    instructions: 'Write verified reviews for software you\'ve used on G2. We split the referral fee with you.',
    verificationMethod: 'api',
    active: true
  },
  {
    id: 'trustpilot-reviews',
    name: 'TrustPilot Service Reviews',
    category: 'reviews',
    ourRevenue: {
      type: 'affiliate_fee',
      estimatedAmount: 5.00
    },
    userPayout: {
      amount: 3.00,
      type: 'instant',
      processingTime: '3-5 days'
    },
    difficulty: 'easy',
    estimatedMinutes: 15,
    requirements: ['Recent purchase or service experience'],
    instructions: 'Write honest reviews for services you\'ve used. Help businesses get feedback.',
    verificationMethod: 'screenshot',
    active: true
  },

  // CASHBACK & REBATE TASKS
  {
    id: 'rakuten-signup-shop',
    name: 'Rakuten Cashback Signup + Shop',
    category: 'cashback',
    ourRevenue: {
      type: 'referral_commission',
      estimatedAmount: 25.00 // Standard referral bonus
    },
    userPayout: {
      amount: 15.00,
      type: 'pending',
      processingTime: 'After first qualifying purchase'
    },
    difficulty: 'easy',
    estimatedMinutes: 20,
    requirements: ['Valid email', 'Make $25+ purchase within 90 days'],
    instructions: 'Sign up through our Rakuten link, make one qualifying purchase. We both earn rewards.',
    verificationMethod: 'api',
    active: true
  },
  {
    id: 'honey-extension-install',
    name: 'Install Honey & Make Purchase',
    category: 'cashback',
    ourRevenue: {
      type: 'affiliate_fee',
      estimatedAmount: 10.00
    },
    userPayout: {
      amount: 6.00,
      type: 'pending',
      processingTime: '30 days after purchase'
    },
    difficulty: 'easy',
    estimatedMinutes: 10,
    requirements: ['Chrome/Firefox browser', 'Online shopping planned'],
    instructions: 'Install Honey browser extension via our link, use it for one purchase to get cashback.',
    verificationMethod: 'api',
    active: true
  },

  // SOCIAL MEDIA & CONTENT TASKS
  {
    id: 'twitter-engagement-verified',
    name: 'Twitter Engagement (Verified)',
    category: 'social',
    ourRevenue: {
      type: 'platform_fee',
      estimatedAmount: 0.50 // Per engagement set
    },
    userPayout: {
      amount: 0.35,
      type: 'instant',
      processingTime: 'Immediate upon verification'
    },
    difficulty: 'easy',
    estimatedMinutes: 5,
    requirements: ['Twitter account', 'Connect Twitter via API'],
    instructions: 'Like, retweet, and comment on sponsored tweets. Auto-verified through Twitter API.',
    verificationMethod: 'api',
    active: true
  },
  {
    id: 'tiktok-video-tasks',
    name: 'TikTok Simple Video Tasks',
    category: 'social',
    ourRevenue: {
      type: 'revenue_share',
      estimatedAmount: 2.00
    },
    userPayout: {
      amount: 1.50,
      type: 'instant',
      processingTime: '24 hours'
    },
    difficulty: 'medium',
    estimatedMinutes: 20,
    requirements: ['TikTok account with 100+ followers', 'Smartphone'],
    instructions: 'Create simple TikTok videos following brand guidelines. Revenue share model.',
    verificationMethod: 'api',
    active: true
  },
  {
    id: 'honeygain-passive-income',
    name: 'Honeygain - Passive Internet Sharing',
    category: 'cashback',
    ourRevenue: {
      type: 'referral_commission',
      estimatedAmount: 5.00 // Honeygain referral bonus
    },
    userPayout: {
      amount: 5.00, // Welcome bonus for new users
      type: 'crypto',
      processingTime: 'Instant on signup + ongoing passive earnings'
    },
    difficulty: 'easy',
    estimatedMinutes: 5,
    requirements: ['Computer/smartphone with internet connection', 'Email address'],
    instructions: 'Sign up via our referral link https://join.honeygain.com/JAMIE864F2 and install the app. Earn passive income by sharing unused internet bandwidth. Get $5 signup bonus + earn $0.10-1.00 daily passively.',
    verificationMethod: 'api',
    active: true
  },

  // TESTING & FEEDBACK TASKS
  {
    id: 'usertesting-sessions',
    name: 'UserTesting.com Sessions',
    category: 'testing',
    ourRevenue: {
      type: 'referral_commission',
      estimatedAmount: 15.00
    },
    userPayout: {
      amount: 10.00,
      type: 'instant',
      processingTime: '7 days'
    },
    difficulty: 'medium',
    estimatedMinutes: 20,
    requirements: ['Computer with microphone', 'English fluency'],
    instructions: 'Complete website/app testing sessions. Speak your thoughts while testing. We get referral fee when you complete tests.',
    verificationMethod: 'api',
    active: true
  },
  {
    id: 'respondent-interviews',
    name: 'Respondent.io Research Studies',
    category: 'testing',
    ourRevenue: {
      type: 'referral_commission',
      estimatedAmount: 50.00 // High value referrals
    },
    userPayout: {
      amount: 100.00, // They pay $100-200, we get separate referral
      type: 'pending',
      processingTime: '5-7 days after study'
    },
    difficulty: 'hard',
    estimatedMinutes: 60,
    requirements: ['Professional experience in specific fields', 'Video call capability'],
    instructions: 'Participate in paid research studies. High-paying but selective. We earn separate referral fee.',
    verificationMethod: 'api',
    active: true
  },

  // CREATIVE BLOCKCHAIN TASKS
  {
    id: 'solana-nft-metadata-verify',
    name: 'Verify NFT Metadata Quality',
    category: 'blockchain',
    ourRevenue: {
      type: 'platform_fee',
      estimatedAmount: 1.00
    },
    userPayout: {
      amount: 0.75,
      type: 'crypto',
      processingTime: 'Instant'
    },
    difficulty: 'easy',
    estimatedMinutes: 5,
    requirements: ['Basic NFT knowledge'],
    instructions: 'Review NFT metadata for accuracy and completeness. Help clean up blockchain data.',
    verificationMethod: 'api',
    active: true
  },
  {
    id: 'crypto-wallet-cleanup',
    name: 'Batch Close Token Accounts',
    category: 'crypto',
    ourRevenue: {
      type: 'platform_fee',
      estimatedAmount: 1.00 // Per batch
    },
    userPayout: {
      amount: 0, // They keep the rent minus our fee
      type: 'instant',
      processingTime: 'Immediate'
    },
    difficulty: 'medium',
    estimatedMinutes: 10,
    requirements: ['Solana wallet with 5+ empty token accounts'],
    instructions: 'Use our tool to batch-close empty token accounts. We charge $1 service fee, you keep recovered rent.',
    verificationMethod: 'wallet_connect',
    active: true
  }
];

/**
 * Microtask Matching Engine
 * Matches users to tasks based on their profile, trust score, and history
 */
export class MicrotaskEngine {
  private completions: Map<string, MicrotaskCompletion[]> = new Map();

  /**
   * Get personalized microtask recommendations
   */
  getRecommendedTasks(
    userId: string,
    userProfile: {
      trustScore: number;
      location?: string;
      hasWallet?: boolean;
      completedTasks?: string[];
      skills?: string[];
    }
  ): MicrotaskProvider[] {
    const available = MICROTASK_CATALOG.filter(task => {
      // Filter by user qualifications
      if (task.category === 'crypto' && !userProfile.hasWallet) return false;
      if (userProfile.completedTasks?.includes(task.id)) return false;
      
      // Trust score requirements
      if (task.difficulty === 'hard' && userProfile.trustScore < 70) return false;
      if (task.difficulty === 'medium' && userProfile.trustScore < 50) return false;
      
      return task.active;
    });

    // Sort by revenue potential and user fit
    return available.sort((a, b) => {
      // Prioritize tasks with higher our revenue
      const revenueDiff = b.ourRevenue.estimatedAmount - a.ourRevenue.estimatedAmount;
      if (Math.abs(revenueDiff) > 5) return revenueDiff;
      
      // Then by user payout
      return b.userPayout.amount - a.userPayout.amount;
    });
  }

  /**
   * Track task completion and calculate payouts
   */
  async recordCompletion(completion: MicrotaskCompletion): Promise<{
    success: boolean;
    userPayout: number;
    ourRevenue: number;
    verificationRequired: boolean;
  }> {
    const task = MICROTASK_CATALOG.find(t => t.id === completion.taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Store completion
    const userCompletions = this.completions.get(completion.userId) || [];
    userCompletions.push(completion);
    this.completions.set(completion.userId, userCompletions);

    return {
      success: true,
      userPayout: task.userPayout.amount,
      ourRevenue: task.ourRevenue.estimatedAmount,
      verificationRequired: task.verificationMethod !== 'api'
    };
  }

  /**
   * Get user's earnings summary
   */
  getUserEarnings(userId: string): {
    totalEarned: number;
    pendingPayout: number;
    tasksCompleted: number;
    ourRevenue: number;
  } {
    const completions = this.completions.get(userId) || [];
    
    let totalEarned = 0;
    let pendingPayout = 0;
    let ourRevenue = 0;

    completions.forEach(completion => {
      const task = MICROTASK_CATALOG.find(t => t.id === completion.taskId);
      if (!task) return;

      if (completion.payoutStatus === 'paid') {
        totalEarned += task.userPayout.amount;
      } else if (completion.payoutStatus === 'approved' || completion.payoutStatus === 'pending') {
        pendingPayout += task.userPayout.amount;
      }

      ourRevenue += task.ourRevenue.estimatedAmount;
    });

    return {
      totalEarned,
      pendingPayout,
      tasksCompleted: completions.length,
      ourRevenue
    };
  }

  /**
   * Get platform revenue analytics
   */
  getPlatformMetrics(): {
    totalRevenue: number;
    totalPaidToUsers: number;
    netProfit: number;
    activeUsers: number;
    popularTasks: { taskId: string; completions: number; revenue: number }[];
  } {
    let totalRevenue = 0;
    let totalPaidToUsers = 0;
    const activeUsers = new Set<string>();
    const taskStats = new Map<string, { completions: number; revenue: number }>();

    this.completions.forEach((completions, userId) => {
      activeUsers.add(userId);
      
      completions.forEach(completion => {
        const task = MICROTASK_CATALOG.find(t => t.id === completion.taskId);
        if (!task) return;

        totalRevenue += task.ourRevenue.estimatedAmount;
        if (completion.payoutStatus === 'paid') {
          totalPaidToUsers += task.userPayout.amount;
        }

        const stats = taskStats.get(completion.taskId) || { completions: 0, revenue: 0 };
        stats.completions += 1;
        stats.revenue += task.ourRevenue.estimatedAmount;
        taskStats.set(completion.taskId, stats);
      });
    });

    const popularTasks = Array.from(taskStats.entries())
      .map(([taskId, stats]) => ({ taskId, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalRevenue,
      totalPaidToUsers,
      netProfit: totalRevenue - totalPaidToUsers,
      activeUsers: activeUsers.size,
      popularTasks
    };
  }
}

// Singleton instance
export const microtaskEngine = new MicrotaskEngine();
