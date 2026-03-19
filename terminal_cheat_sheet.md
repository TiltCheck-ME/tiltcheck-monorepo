# 🚀 TiltCheck Terminal Cheat Sheet

This guide contains the most common commands you'll need to run, test, and maintain the TiltCheck ecosystem.

> [!TIP]
> Always run these commands from the project root directory (`c:\Users\jmeni\tiltcheck-monorepo`) unless specified otherwise.

---

## 🌐 Web & Frontend
| Task | Command | Description |
| :--- | :--- | :--- |
| **Start Local Site** | `pnpm --filter @tiltcheck/landing-page dev` | Starts the Vite dev server for the website at `localhost:5173`. |
| **Build Site** | `pnpm --filter @tiltcheck/landing-page build` | Creates a production-ready build in the `dist` folder. |

## ⚙️ Backend & API
| Task | Command | Description |
| :--- | :--- | :--- |
| **Start API** | `pnpm --filter @tiltcheck/api dev` | Runs the central API gateway. |
| **Start Discord Bot** | `pnpm --filter @tiltcheck/discord-bot dev` | Starts the bot for community interaction and log collection. |
| **Start Everything** | `pnpm dev` | Starts **all** services simultaneously (use with caution). |

## 🤖 Analysis & Security Tools
| Task | Command | Description |
| :--- | :--- | :--- |
| **Start Automated Watcher** | `cd tools/channel-watcher` then `node scheduler.js` | Runs the log analyzer every 2 minutes for the live ticker. |
| **Manual Log Analysis** | `node tools/channel-watcher/analyze-log.js --from=7` | Analyzes logs from the last 7 hours manually. |
| **Seed Trust Engine** | `pnpm seed:casino-trust` | Refreshes the casino trust database from the latest scrape data. |

## 🛠️ Maintenance & DevX
| Task | Command | Description |
| :--- | :--- | :--- |
| **Install Dependencies** | `pnpm install` | Installs all necessary packages for the monorepo. |
| **Format Code** | `pnpm format` | Automatically fixes code styling (Prettier). |
| **Lint Code** | `pnpm lint` | Checks for code errors or stylistic issues. |
| **Run Tests** | `pnpm test` | Executes the unit test suite across the monorepo. |

---

## 💡 Troubleshooting
- **Command not found?** Ensure you have `pnpm` installed globally (`npm install -g pnpm`).
- **Port 5173 occupied?** Use `Ctrl + C` in the terminal to kill the existing process.
- **API Errors?** Ensure your `.env` files are correctly set up in `apps/api/` and `tools/channel-watcher/`.
