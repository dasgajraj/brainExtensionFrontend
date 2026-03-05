# Brain Extension — React Native Frontend

A **React Native** mobile application for the Brain Extension Cognitive OS — an AI-powered knowledge management system with real-time queries, vision analysis, neural graph visualization, and dream-story style memory replay.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Screens](#screens)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Running the App](#running-the-app)
- [Building a Release APK](#building-a-release-apk)
- [API Layer](#api-layer)
- [State Management](#state-management)
- [Theming](#theming)
- [Authentication & Security](#authentication--security)
- [Deep Linking](#deep-linking)

---

## Overview

Brain Extension is a mobile interface for a Cognitive OS backend. It lets users:

- Ask questions to an AI brain with multiple reasoning lobes and modes
- Upload files and images for processing and OCR vision analysis
- Replay memory nodes in a **Spotify-Rewind style story** (Dreams)
- Explore a **force-directed interactive knowledge graph** of all memories and files
- Translate results into multiple languages
- Run autonomous AI agents against their knowledge base
- Manage stored memories and uploaded files

---

## Architecture

```
App.tsx
 ├── LoadingScreen          (animated boot + health check)
 ├── OnboardingContainer    (first-launch walkthroughs)
 ├── AuthContainer          (login / signup / password reset)
 └── HomeScreen             (main hub — sidebar nav + feature routing)
      ├── BrainAskScreen
      ├── BrainResultScreen
      ├── TranslateScreen
      ├── VisionScreen
      ├── DreamsScreen
      ├── NeuralGraphScreen
      ├── FilesScreen
      ├── AgentScreen
      ├── MemoryScreen
      └── ProfileScreen
```

Boot sequence: `LoadingScreen` waits for both the animation to finish **and** the backend health check + session restore to complete before transitioning — preventing users from hitting unauthenticated screens on a slow cold start.

---

## Screens

### Auth

| Screen | Purpose |
|---|---|
| `LoginScreen` | Email + password login with biometric unlock option |
| `SignUpScreen` | Account creation with email verification flow |
| `ForgotPasswordScreen` | Send password reset email |
| `ResetPasswordScreen` | Reset via deep-linked token |
| `AuthVerificationScreen` | Email verification code entry |

### Main

| Screen | Purpose |
|---|---|
| `HomeScreen` | Hub with sidebar navigation, dream story preview cards, and recent activity |
| `BrainAskScreen` | Submit queries with mode selection (study/default/creative), workspace picker, and language toggle |
| `BrainResultScreen` | Polled result display with markdown rendering and clipboard support |
| `TranslateScreen` | Real-time translation with history |
| `VisionScreen` | Image/camera OCR and visual analysis |
| `DreamsScreen` | Spotify-Rewind style memory story viewer — scrollable cards, progress timer, audio, share |
| `NeuralGraphScreen` | SVG force-directed knowledge graph with pan/zoom/tap, node/edge detail sheets, filter by type, Mermaid diagrams |
| `FilesScreen` | File manager — upload, browse, and manage knowledge base files |
| `AgentScreen` | Autonomous AI agent runner |
| `MemoryScreen` | Browse and manage stored memory nodes |
| `ProfileScreen` | User profile and settings |

---

## Features

### Neural Graph

- Force-directed layout with 150-iteration simulation, deferred via `setTimeout` so the loading spinner stays live
- Blueprint-style SVG node cards — **memory nodes are enlarged (82 px)** with 2-line label + hairline divider + 3-line content preview; file/answer nodes stay compact (44 px)
- Pan, pinch-to-zoom, and tap gesture detection on the SVG canvas
- Tap a **MEM** node → full-screen `MemoryModal` with all node attributes, connection stats, full content, and live Mermaid diagram rendering
- Tap a **FILE / ANS** node → compact `NodeSheet` bottom sheet with stats and connections
- Tap an **edge** → `EdgeSheet` with source → target info and strength stats
- Type filter (All / Memory / File / Answer) via a clickable legend
- Stats bar (node count, edges, self-loops, total weight)

### Mermaid Diagram Support

Any memory `fullText` containing a ` ```mermaid ``` ` code block is rendered as a live interactive diagram inside `MemoryModal` using `react-native-webview` + mermaid.js v10 (CDN). Dark and light themes are applied automatically.

### Dreams (Memory Story Mode)

- Spotify-Rewind style screen cycling through memory/dream entries with an animated progress bar
- `ScrollView` card body — full text always visible, no line truncation
- Timer pauses on scroll start, resumes from current position on scroll end
- Prev `‹` / Skip `›` navigation in the bottom chrome bar
- Share and mute controls in the top chrome overlay

### Authentication

- JWT access + refresh token pair stored in `AsyncStorage`
- Silent auto-refresh via `httpClient` interceptor — retries original request after token renewal
- Biometric re-authentication (fingerprint / face) via `react-native-biometrics`
- Deep-link password reset via custom URL scheme and HTTPS App Links

---

## Tech Stack

| Layer | Library / Version |
|---|---|
| Framework | React Native 0.83.1 + React 19 |
| Language | TypeScript 5.8 |
| State | Redux Toolkit 2 + Redux Persist |
| API | Axios 1.x + Socket.IO Client 4 |
| SVG / Graph | react-native-svg 15 |
| WebView / Mermaid | react-native-webview 13 |
| Animations | Animated API + react-native-reanimated 4 |
| Biometrics | react-native-biometrics 3 |
| File / Image Picker | react-native-document-picker 9 + react-native-image-picker 8 |
| Local Storage | @react-native-async-storage/async-storage 2 |
| Sharing / Capture | react-native-share 12 + react-native-view-shot 4 |
| Gradient | react-native-linear-gradient 2 |
| Audio | react-native-sound 0.13 |
| Safe Area | react-native-safe-area-context 5 |
| Clipboard | @react-native-clipboard/clipboard 1 |

---

## Project Structure

```
├── api/                    # Typed Axios API wrappers
│   ├── auth.api.ts
│   ├── brain.api.ts        # Ask, polling, graph, dreams, memories
│   ├── files.api.ts
│   ├── health.api.ts
│   ├── memory.api.ts
│   └── httpClient.ts       # Axios instance + Bearer interceptor + auto-refresh
├── app/
│   └── bootstrap.ts        # Cold-start: health check + session restore
├── assets/                 # Images, fonts, static assets
├── components/
│   ├── auth/               # AuthButton, AuthInput, AuthLayout, AuthPasswordField
│   └── ui/                 # BottomNavBar, Sidebar, ScreenHeader, Icons, AnimatedPageTransition
├── navigation/
│   └── deepLinking.ts      # brainextension:// + HTTPS App Link handlers
├── redux/                  # Theme reducer, root reducer, store, action creators
├── screens/
│   ├── Auth/               # Login, SignUp, ForgotPassword, Reset, Verification
│   ├── BRAIN/              # BrainAsk, BrainResult, Translate, Vision,
│   │                       # Dreams, NeuralGraph, Agent
│   ├── Files/
│   ├── Memory/
│   ├── Onboarding/
│   ├── HomeScreen.tsx
│   ├── LoadingScreen.tsx
│   └── ProfileScreen.tsx
├── services/               # Business-logic services (token, auth, history, biometric)
├── store/
│   └── auth/               # Auth slice, thunks, selectors, types
├── theme/
│   └── tokens.ts           # Dark/light design token system
├── types/                  # Shared TypeScript interfaces
└── utils/
    └── markdownRenderer.tsx
```

---

## Environment Setup

### Prerequisites

- Node.js ≥ 18
- JDK 17+
- Android Studio with Android SDK (API 34+)
- Xcode 15+ (iOS builds only)

### Install dependencies

```sh
npm install
```

### Environment variables

Create a `.env` file in the project root:

```env
API_BASE_URL=https://brain-extension-exng.onrender.com
BRAIN_PIN=<your_brain_pin>
```

---

## Running the App

### 1. Start Metro

```sh
npm start
# with cache reset:
npm start -- --reset-cache
```

### 2. Android

```sh
npm run android
```

### 3. iOS

```sh
bundle install            # first time only
bundle exec pod install   # first time or after native dep changes
npm run ios
```

---

## Building a Release APK

```sh
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`

Push to a connected device:

```sh
adb push android/app/build/outputs/apk/release/<filename>.apk /sdcard/Download/
```

---

## API Layer

All requests go through `api/httpClient.ts` which:

- Attaches `Authorization: Bearer <accessToken>` automatically
- Intercepts 401 responses, silently refreshes the token, and retries
- Exposes `BASE_URL` for use in non-intercepted requests (auth flows use raw Axios)

| File | Key Endpoints |
|---|---|
| `auth.api.ts` | `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password` |
| `brain.api.ts` | `POST /brain/ask`, `GET /brain/result/:id`, `GET /brain/graph`, `GET /brain/dreams`, `GET /brain/history` |
| `files.api.ts` | File upload, listing, deletion |
| `memory.api.ts` | Memory listing and management |
| `health.api.ts` | `GET /health` — backend wake-up ping |

---

## State Management

Redux Toolkit with `redux-persist` (AsyncStorage) for hydration on restart.

| Slice | Responsibility |
|---|---|
| `auth` (`store/auth/`) | `isAuthenticated`, `user`, `backendReady`, `flowStep`, `resetToken` |
| `theme` (`redux/ThemeReducer`) | `mode: 'dark' | 'light'` |

Services in `services/` handle local non-redux persistence (dream seen state, query history, translate history, vision history) directly via AsyncStorage.

---

## Theming

`theme/tokens.ts` exports `getTokens(mode)` returning a full set of typed design tokens — colors, typography, spacing, shadows, border radii — for both `'dark'` and `'light'` modes. All screens consume tokens directly; no inline color literals in component logic.

System preference is read on first launch and persists any manual toggle via Redux.

---

## Authentication & Security

- Short-lived JWT access tokens + long-lived refresh tokens stored in AsyncStorage via `token.service.ts`
- `auth.service.ts` orchestrates login, registration, session restore, and refresh
- Biometric re-auth via `react-native-biometrics`
- Reset tokens from deep links are validated against strict regex patterns before dispatch — malformed tokens silently redirect to login

---

## Deep Linking

**Custom scheme:** `brainextension://auth/reset-password/<TOKEN>`

**HTTPS App Links:**
```
https://brain-extension-exng.onrender.com/auth/reset-password-bridge?token=<TOKEN>
https://brain-extension-exng.onrender.com/auth/reset-password-bridge/<TOKEN>
```

Handled in `navigation/deepLinking.ts`. Cold-start URLs are captured via `Linking.getInitialURL()` and foreground events via `Linking.addEventListener`. The parsed token is dispatched to the auth slice which navigates the user directly to `ResetPasswordScreen`.
