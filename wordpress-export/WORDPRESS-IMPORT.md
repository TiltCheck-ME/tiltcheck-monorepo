# WordPress Import Guide for TiltCheck Website

This folder contains all the HTML pages, assets, and resources needed to recreate the TiltCheck website on WordPress.

## 📁 Folder Structure

```
wordpress-export/
├── index.html                    # Homepage
├── about.html                    # About page
├── site-map.html                 # HTML sitemap
├── contact.html                  # Contact page
├── faq.html                      # FAQ page
├── privacy.html                  # Privacy Policy
├── terms.html                    # Terms of Service
├── cookie-policy.html            # Cookie Policy
├── compliance.html               # Compliance Overview
├── licensing.html                # Licensing Info
├── responsible-gambling.html     # Responsible Gambling Resources
├── casinos.html                  # Casino Directory
├── casino-reviews.html           # Casino Reviews
├── degen-trust.html              # Degen Trust Engine
├── trust.html                    # Trust Dashboard
├── trust-scores.html             # Trust Scores
├── trust-explained.html          # Trust System Explained
├── trust-api.html                # Trust Score API Docs
├── scam-reports.html             # Scam Reports
├── transparency-reports.html     # Transparency Reports
├── stats-dashboard.html          # Stats Dashboard
├── how-it-works.html             # How It Works
├── getting-started.html          # Getting Started
├── glossary.html                 # Glossary
├── tutorials.html                # Tutorials
├── help.html                     # Help Center
├── newsletter.html               # Newsletter
├── press-kit.html                # Press Kit
├── testimonials.html             # Testimonials
├── beta.html                     # Beta page
├── search.html                   # Search page
├── settings.html                 # Settings page
├── component-gallery.html        # Component Gallery
├── admin-analytics.html          # Admin Analytics
├── admin-status.html             # Admin Status
├── control-room.html             # Control Room
├── chrome-extension-subscription.html  # Chrome Extension Subscription
├── 404.html                      # 404 Error Page
├── 410.html                      # 410 Gone Page
├── 451.html                      # 451 Unavailable Page
├── CNAME                         # Domain configuration
├── manifest.json                 # PWA Manifest
├── images-manifest.json          # Image assets manifest
├── breadcrumbs.js                # Breadcrumb navigation
├── trust-dashboard.js            # Trust dashboard script
│
├── assets/                       # Static assets
│   ├── icons/                    # SVG icons
│   └── logo/                     # Logo files
│
├── auth/                         # Authentication pages
│
├── components/                   # Reusable components
│   ├── index.html
│   └── trust-gauges.html
│
├── docs/                         # Documentation pages
│   ├── apis.html
│   ├── architecture.html
│   ├── branch-protection.html
│   ├── brand.html
│   ├── coding-standards.html
│   ├── components-audits.html
│   ├── dashboard-design.html
│   ├── dashboard-enhancements.html
│   ├── data-models.html
│   ├── design-prompts-replies.html
│   ├── design-prompts.html
│   ├── diagrams.html
│   ├── discord-bots.html
│   ├── ecosystem-overview.html
│   ├── founder-voice.html
│   ├── future-roadmap.html
│   ├── index.html
│   ├── intro.html
│   ├── linkguard-integration.html
│   ├── migration-checklist.html
│   ├── poker-module.html
│   ├── render-deployment.html
│   ├── system-prompts.html
│   ├── testing-strategy.html
│   ├── tool-specs-1.html
│   ├── tool-specs-2.html
│   ├── tool-specs-3.html
│   ├── tools-overview.html
│   ├── trust-engines.html
│   └── trust-migration.html
│
├── scripts/                      # JavaScript files
│   └── auth.js
│
├── styles/                       # CSS stylesheets
│   ├── base.css
│   ├── main.css
│   ├── sidebar-nav.css
│   ├── theme.css
│   └── tool-page.css
│
└── tools/                        # Tools pages
    ├── justthetip.html
    ├── suslink.html
    ├── collectclock.html
    ├── freespinscan.html
    ├── tiltcheck-core.html
    ├── poker.html
    ├── triviadrops.html
    ├── qualifyfirst.html
    └── daad.html
```

## 🗺️ Site Map (HTML Pages)

### Core Pages
| Page | URL | Description |
|------|-----|-------------|
| Homepage | `/` | Main landing page |
| About | `/about.html` | About TiltCheck |
| Contact | `/contact.html` | Contact information |
| FAQ | `/faq.html` | Frequently asked questions |
| How It Works | `/how-it-works.html` | How the platform works |
| Getting Started | `/getting-started.html` | Getting started guide |

### Trust & Data Pages
| Page | URL | Description |
|------|-----|-------------|
| Trust Dashboard | `/trust.html` | Trust metrics dashboard |
| Trust Scores | `/trust-scores.html` | Trust score overview |
| Trust Explained | `/trust-explained.html` | Trust system explanation |
| Degen Trust | `/degen-trust.html` | Degen trust engine |
| Trust API | `/trust-api.html` | API documentation |

### Casino Pages
| Page | URL | Description |
|------|-----|-------------|
| Casinos | `/casinos.html` | Casino directory |
| Casino Reviews | `/casino-reviews.html` | Casino reviews |
| Scam Reports | `/scam-reports.html` | Scam report database |

### Legal & Compliance
| Page | URL | Description |
|------|-----|-------------|
| Privacy Policy | `/privacy.html` | Privacy policy |
| Terms of Service | `/terms.html` | Terms and conditions |
| Cookie Policy | `/cookie-policy.html` | Cookie usage policy |
| Compliance | `/compliance.html` | Compliance overview |
| Licensing | `/licensing.html` | Licensing information |
| Responsible Gambling | `/responsible-gambling.html` | Responsible gambling resources |
| Transparency Reports | `/transparency-reports.html` | Transparency reports |

### Tools Pages
| Tool | URL | Description |
|------|-----|-------------|
| JustTheTip | `/tools/justthetip.html` | Non-custodial tipping |
| SusLink | `/tools/suslink.html` | Link scanner |
| CollectClock | `/tools/collectclock.html` | Bonus tracker |
| FreeSpinScan | `/tools/freespinscan.html` | Promo scanner |
| TiltCheck Core | `/tools/tiltcheck-core.html` | Core trust engine |
| Poker | `/tools/poker.html` | Poker game |
| TriviaDrops | `/tools/triviadrops.html` | Trivia game |
| QualifyFirst | `/tools/qualifyfirst.html` | Survey router |
| DA&D | `/tools/daad.html` | Card game |

### Resources
| Page | URL | Description |
|------|-----|-------------|
| Glossary | `/glossary.html` | Terms glossary |
| Tutorials | `/tutorials.html` | Video tutorials |
| Help | `/help.html` | Help center |
| Newsletter | `/newsletter.html` | Newsletter signup |
| Press Kit | `/press-kit.html` | Press resources |
| Testimonials | `/testimonials.html` | User testimonials |
| Stats Dashboard | `/stats-dashboard.html` | Platform statistics |
| Component Gallery | `/component-gallery.html` | UI components |
| Search | `/search.html` | Search page |
| Settings | `/settings.html` | User settings |

### Admin Pages
| Page | URL | Description |
|------|-----|-------------|
| Admin Analytics | `/admin-analytics.html` | Analytics dashboard |
| Admin Status | `/admin-status.html` | System status |
| Control Room | `/control-room.html` | Admin control panel |

### Utility Pages
| Page | URL | Description |
|------|-----|-------------|
| 404 | `/404.html` | Page not found |
| 410 | `/410.html` | Page gone |
| 451 | `/451.html` | Content unavailable |
| Beta | `/beta.html` | Beta information |
| Extension Subscription | `/chrome-extension-subscription.html` | Chrome ext info |

## 🎨 Theme Colors

The website uses a dark theme with the following color palette:

- **Primary**: `#00d4aa` (Teal/Mint)
- **Background Primary**: `#11161b`
- **Background Secondary**: `#151a20`
- **Text Primary**: `#ffffff`
- **Text Secondary**: `#b0b8c1`
- **Text Muted**: `#6b7280`
- **Error**: `#ff5252`
- **Warning**: `#ffc107`

## 📋 WordPress Import Steps

### Option 1: Manual Import (Recommended)
1. Create a new WordPress theme or use an existing one
2. Copy HTML content from each file into corresponding WordPress page templates
3. Copy CSS from `/styles/` to your theme's stylesheet
4. Copy JavaScript from `/scripts/` and inline scripts to your theme
5. Upload assets from `/assets/` to WordPress media library
6. Configure navigation menus based on the sitemap above

### Option 2: Import Plugin
Use a WordPress import plugin like:
- **All-in-One WP Migration** - For full site import
- **WordPress Importer** - For content import
- **Custom Post Type** - For tools section

### Option 3: HTML Import Plugin
1. Install an HTML import plugin
2. Upload the entire folder
3. Follow plugin instructions to convert HTML to WordPress pages

## 🔧 Required WordPress Configuration

### Navigation Menu Structure
```
Main Navigation:
├── Home
├── Casinos
├── Degens
├── Dashboard
├── About
├── Education & Help (Dropdown)
│   ├── Getting Started
│   ├── How It Works
│   ├── FAQ
│   ├── Glossary
│   └── Responsible Gambling
├── Legal & Compliance (Dropdown)
│   ├── Privacy Policy
│   ├── Terms of Service
│   ├── Compliance Overview
│   ├── Licensing Info
│   └── Cookie Policy
├── Contact
├── Newsletter
└── Press Kit

Tools Dropdown (Separate Menu):
├── JustTheTip
├── SusLink
├── CollectClock
├── FreeSpinScan
├── TiltCheck Core
├── Poker
├── TriviaDrops
├── QualifyFirst
└── DA&D
```

### Required Pages
Create these pages in WordPress:
1. Home
2. About
3. Contact
4. FAQ
5. Privacy Policy
6. Terms of Service
7. Casinos
8. Degen Trust
9. Trust Dashboard
10. Tools (with subpages for each tool)

### Plugins Recommended
- **Elementor** or **Divi** - For page building
- **WP Super Cache** or **W3 Total Cache** - For caching
- **Yoast SEO** or **Rank Math** - For SEO
- **Contact Form 7** - For contact forms
- **Wordfence** - For security

## 📱 Responsive Design

The site is fully responsive with mobile navigation. The mobile menu includes:
- Hamburger button toggle
- Dropdown sections for Education, Transparency, Legal
- Collapsible sections for mobile views

## 🔗 External Links

These pages contain links to external services:
- Discord: `https://discord.gg/s6NNfPHxMS`
- GitHub: `https://github.com/jmenichole/tiltcheck-monorepo`
- X (Twitter): `@tilt_check`
- Ko-fi: `https://ko-fi.com/jmenichole0`

## 📝 Notes

1. All pages use `/styles/theme.css` and `/styles/main.css` for styling
2. Navigation links should be updated to WordPress permalinks
3. Some pages may need PHP logic for dynamic content
4. The `manifest.json` is for PWA functionality
5. The `trust-dashboard.js` contains dashboard functionality
6. The `_archive/` folder contains legacy/archived pages (optional)

##IMPORTANT 
Tagline "Made for degens by degens" should be included in the footer of every page. 
---
*Generated from TiltCheck Monorepo*

