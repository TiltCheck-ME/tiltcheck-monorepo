# Technology Stack

This document outlines the technology stack for the TiltCheck ecosystem.

## Core Technologies
- **Language:** TypeScript is the primary language for all applications and packages, ensuring type safety and modern language features.
- **Runtime:** Node.js is the runtime environment for all backend services and scripting.
- **Package Manager:** pnpm is used for managing dependencies in the monorepo, enabling efficient disk space usage and fast installations.

## Backend
- **Framework:** Express.js is used for building robust and scalable REST APIs for services like `api` and `user-dashboard`.
- **Database:** Supabase (PostgreSQL) is the primary database for storing user data, game history, and trust scores.
- **Deployment:** Services are containerized using Docker and deployed to Google Cloud Run for scalable, serverless execution.

## Frontend
- **Primary Interface:** Discord.js is the core library for all Discord bot interactions, serving as the main user interface for the ecosystem.
- **Web Framework:** Vite is used for the modern, fast, and efficient frontend development of web applications like the `user-dashboard`.
- **Component Framework**: React is used for building user interfaces.

## Testing
- **Test Runner:** Vitest is the primary framework for unit and integration testing across the monorepo, chosen for its speed and compatibility with Vite.
