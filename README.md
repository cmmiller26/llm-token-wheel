# LLM Token Wheel

An interactive web application for exploring how large language models generate text, one token at a time. Visualize token probabilities on a spinning wheel and choose your own path through the generation process.

## Features

- **Token Probability Visualization**: See the probability distribution of possible next tokens displayed on an interactive wheel
- **Interactive Token Selection**: Click on any token to select it - follow the AI's choice or pick an alternative
- **Speculative Regeneration**: When hovering over divergent tokens, the app pre-fetches new generations for instant transitions
- **Undo Support**: Step backwards through your token selections
- **Customizable Settings**: Adjust temperature and system instructions to influence generation behavior
- **Dark/Light Mode**: Toggle between themes for comfortable viewing

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 16 with App Router
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com) v4
- **AI Model**: Google Gemini API (via `@google/generative-ai`)
- **Theming**: next-themes

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Gemini API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cmmiller26/llm-token-wheel.git
   cd llm-token-wheel
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter a text prompt on the home page
2. Optionally adjust temperature and system instructions in the settings panel
3. Click "Start" to begin generation
4. Watch the wheel spin and see token probabilities
5. Click on a token wedge to select it and continue
6. Use the undo button to step back, or reset to start over

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
