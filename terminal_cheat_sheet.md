# 🚀 tiltchcek terminal cheat sheet

look, we've all been rugged before. i've seen this movie. keep this doc handy so you don't break prod when you're 3 coffees deep at 4 AM trying to fix a typo.

> [!TIP]
> assume all commands should be run from the root directory (`c:\Users\jmeni\tiltchcek-monorepo`). if you're in the wrong folder, the math won't math.

---

## 🌐 the alpha layer (frontend & web)

| task | command | what it actually does |
| :--- | :--- | :--- |
| **local dev server** | `pnpm --filter @tiltchcek/web dev` or `npx serve apps/web -p 3000` | spins up the local site so you can check how your new UI looks before pushing. |
| **build for prod** | `gcloud builds submit --config cloudbuild-web.yaml .` | builds the docker image on GCP infrastructure. literally pushing the bag to the cloud. |
| **deploy live** | `gcloud run deploy tiltchcek-web --image us-central1-docker.pkg.dev/tiltchcek/tiltchcek-services/web:latest --port 80 --region us-central1 --project tiltchcek --allow-unauthenticated` | the big red button. pushes your docker image to the live URL (`tiltchcek.me`). don't do this with typos. |

## ⚙️ the engine room (api & bots)

| task | command | what it actually does |
| :--- | :--- | :--- |
| **start api** | `pnpm --filter @tiltchcek/api dev` | boots the central nervous system. |
| **start discord bot** | `pnpm --filter @tiltchcek/discord-bot dev` | wakes up the bot so it can yell at people tilting in voice channels. |
| **start everything** | `pnpm dev` | runs the whole monorepo locally. will spike your CPU usage to the moon. |

## 🤖 intel & analysis 

| task | command | what it actually does |
| :--- | :--- | :--- |
| **run the watcher** | `cd tools/channel-watcher && node scheduler.js` | loops the log analyzer so the tickers stay live. |
| **manual log sniffer**| `node tools/channel-watcher/analyze-log.js --from=7` | pulls the last 7 hours of discord logs and runs them through the intelligence agent. |

## 🛠️ devX and housekeeping

| task | command | what it actually does |
| :--- | :--- | :--- |
| **install packages** | `pnpm install` | downloads half the internet into `node_modules`. |
| **format code** | `pnpm format` | runs prettier so your code doesn't look like trash. |

---

## 💡 when things inevitably break
- **"command not found"**: you probably didn't install `pnpm`, or you're using `npm` like a boomer. run `npm install -g pnpm`.
- **"port already in use"**: you left a dev server running somewhere. kill the terminal process with `Ctrl + C` or suffer.
- **"gcloud permissions denied"**: you aren't authenticated with google cloud sdk. run `gcloud auth login` and pray you remember your password.

