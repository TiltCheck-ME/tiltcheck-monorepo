# Daily Degen Comic Demo Script (Under 4 Minutes)

## 0:00 - 0:25 Problem

Explain that Discord gambling communities generate high-volume chat, but meaningful daily context gets lost. Introduce Daily Degen Comic as a multimodal recap layer.

## 0:25 - 1:00 Input Context

Show `tools/channel-watcher/messages.jsonl` and briefly explain:

- scraper collects messages,
- latest day context is selected,
- publish step sends context to cloud generator.

## 1:00 - 1:50 Generation

Run generation flow:

- call `POST /v1/comic/generate`,
- show response with title, mood, three panels, image URLs.

Mention that Gemini handles:

- narrative structuring,
- panel image creation,
- safe output constraints.

## 1:50 - 2:45 User Experience

Open homepage and show:

- current comic section,
- last updated timestamp,
- credit line,
- archive list.

Demonstrate cloud-first loading by showing a generated panel image from storage URL.

## 2:45 - 3:30 Cloud Proof

Show Cloud Run service and Cloud Storage objects:

- `current.json`
- `archive.json`
- panel image objects

## 3:30 - 3:55 Close

Summarize impact:

- transforms noisy chat into daily storytelling,
- keeps a persistent archive,
- fully deployable on Google Cloud with Gemini.
