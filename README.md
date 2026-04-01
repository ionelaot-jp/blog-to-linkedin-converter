# Blog to LinkedIn Converter

Convert blog articles into LinkedIn-ready posts using Claude AI.

## Features

- Paste any blog article text and get a polished LinkedIn post
- Choose from 4 tones: Professional, Conversational, Thought Leadership, Storytelling
- Real-time streaming output
- Shared team history with Vercel KV
- One-click copy to clipboard

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and add your `ANTHROPIC_API_KEY`
3. Run `npm install`
4. Run `npm run dev`

## Deploy to Vercel

1. Import this repo in the Vercel dashboard
2. Add the `ANTHROPIC_API_KEY` environment variable
3. Add a Vercel KV store for shared history
4. Deploy

## Tech Stack

- Vercel Serverless Functions
- Anthropic Claude API (streaming)
- Vercel KV (Redis)
- Vanilla HTML/CSS/JS frontend
