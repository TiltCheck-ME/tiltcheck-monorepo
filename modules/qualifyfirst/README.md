# QualifyFirst Module

**AI-powered survey routing and screen-out avoidance for TiltCheck.**

## Purpose

QualifyFirst solves the frustrating problem of survey screen-outs by using AI to match users only to surveys they're likely to complete. This saves time, reduces frustration, and improves completion rates.

## Features

- **User Profile Modeling**: Build profiles based on behavior, demographics, and preferences
- **Smart Survey Matching**: AI-powered algorithm predicts qualification likelihood
- **Screen-Out Tracking**: Learn from failures to avoid similar surveys
- **Quick Popup Questions**: Targeted questions to improve matching accuracy
- **Survey Platform Integration**: Event-driven architecture for easy integration

## API

### Creating User Profiles

```typescript
import { qualifyFirst } from '@tiltcheck/qualifyfirst';

// Create a new profile with initial traits
const profile = await qualifyFirst.createProfile('user123', {
  hasPets: true,
  ownsCar: false,
  ageRange: '25-34',
  hasChildren: true,
  medicalComfort: true,
});

// Update existing profile traits
await qualifyFirst.updateUserTraits('user123', {
  ownsCar: true, // User bought a car
  employmentStatus: 'full-time',
});

// Get user profile
const profile = qualifyFirst.getProfile('user123');
```

### Managing Surveys

```typescript
// Add a survey to the pool
const survey = await qualifyFirst.addSurvey({
  title: 'Pet Owners Survey',
  description: 'Survey about pet ownership and care',
  estimatedMinutes: 10,
  payoutUSD: 5.00,
  requiredTraits: { 
    hasPets: true,
    ageRange: '25-34' 
  },
  excludedTraits: { 
    hasChildren: true // No parents for this survey
  },
  source: 'partner',
});
```

### Matching Surveys

```typescript
// Get survey matches for a user
const matches = await qualifyFirst.matchSurveys('user123');

// Matches are sorted by probability (highest first)
for (const match of matches) {
  console.log(`${match.survey.title}`);
  console.log(`Match: ${match.matchLevel} (${match.matchProbability}%)`);
  console.log(`Payout: $${match.survey.payoutUSD}`);
  console.log(`Reasoning: ${match.reasoning.join(', ')}`);
  console.log('---');
}
```

### Recording Results

```typescript
// Record a completed survey
await qualifyFirst.recordSurveyResult({
  surveyId: 'survey-123',
  userId: 'user123',
  status: 'completed',
  completedAt: Date.now(),
  payout: 5.00,
});

// Record a screen-out
await qualifyFirst.recordSurveyResult({
  surveyId: 'survey-456',
  userId: 'user123',
  status: 'screened-out',
  completedAt: Date.now(),
  screenOutReason: 'Age not in target range',
});

// Get user statistics
const stats = qualifyFirst.getUserStats('user123');
console.log(`Completed: ${stats.totalCompleted}`);
console.log(`Screened Out: ${stats.totalScreenedOut}`);
console.log(`Total Earnings: $${stats.totalEarnings}`);
console.log(`Completion Rate: ${stats.completionRate}%`);
```

### Improving Profiles

```typescript
// Get recommended questions to ask user
const questions = qualifyFirst.getRecommendedQuestions('user123');

// Example questions:
// - "Do you have pets?"
// - "Do you own a car?"
// - "Are you comfortable with medical surveys?"
// - "What is your age range?"
// - "Do you have children?"
```

## Events

QualifyFirst publishes the following events to the Event Router:

### `survey.profile.created`
Emitted when a new user profile is created.

```typescript
{
  userId: string;
  traits: Record<string, any>;
}
```

### `survey.profile.updated`
Emitted when user traits are updated.

```typescript
{
  userId: string;
  traits: Record<string, any>;
}
```

### `survey.added`
Emitted when a new survey is added.

```typescript
{
  surveyId: string;
  title: string;
  payout: number;
}
```

### `survey.matched`
Emitted when surveys are matched to a user.

```typescript
{
  userId: string;
  matchCount: number;
  highMatches: number;
}
```

### `survey.result.recorded`
Emitted when a survey result is recorded.

```typescript
{
  userId: string;
  surveyId: string;
  status: 'completed' | 'screened-out' | 'abandoned';
  payout?: number;
}
```

## Discord Integration

QualifyFirst can be integrated with Discord bot commands:

- `/qualify` - Get matched surveys
- `/surveys` - View available surveys
- `/survey profile` - View your survey profile
- `/survey improve` - Get questions to improve matching

## Match Algorithm

The matching algorithm:

1. **Required Traits**: Checks if user has all required traits
2. **Excluded Traits**: Disqualifies if user has excluded traits
3. **Historical Data**: Reduces probability for previously failed surveys
4. **Scoring**: Calculates match probability (0-100)
5. **Classification**: Categorizes as high (75+), medium (40-74), or low (<40)

## Best Practices

1. **Start Simple**: Ask basic questions first (age, location, interests)
2. **Learn from Failures**: Track screen-outs to avoid similar surveys
3. **Keep Profiles Updated**: Update traits as user circumstances change
4. **Respect Privacy**: Only collect necessary information
5. **Transparency**: Always explain why a survey is recommended

## Security & Privacy

- **Opt-In Only**: Users must consent to profile creation
- **Minimal Data**: Only store necessary traits for matching
- **No Selling**: User data is never sold to third parties
- **Data Deletion**: Users can request profile deletion at any time
- **Transparent**: Users can view all data stored about them

## Future Enhancements

- ML-based match prediction
- Survey recommendation engine
- A/B testing for questions
- Integration with external survey platforms
- Mobile app support

---

**Part of the TiltCheck Ecosystem**  
Built for degens, by degens. 🎰
