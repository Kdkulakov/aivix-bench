# Aivix-Bench

## Links

- [Official Documentation](https://docs.aivix.dev/)
- [Official Website](https://aivix.dev/)

Aivix-Bench is a voice-driven system for building AI agents and automated workflows, using n8n as the backend constructor. Users can assemble workflows using voice commands and a visual interface, without programming.

## Features

- Voice input and command analysis (Whisper/Web Speech API)
- Visual block editor (Next.js, TailwindCSS, shadcn/ui)
- Modal with clarifying questions
- Real-time process visualization
- Telegram integration (Telegram Bot API)
- MVP: No database, all data on frontend

## Requirements

- Node.js >= 18
- Python >= 3.10 (if using Python backend)
- npm or yarn
- n8n (local or cloud)
- Telegram Bot API token (for Telegram integration)
- Whisper API key (or use browser Web Speech API)

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd aivix-bench
```

### 2. Install dependencies

#### Frontend

```bash
cd frontend
npm install
# or
yarn install
```

#### Backend (Python example)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Backend (Node.js example)

```bash
cd backend
npm install
```

### 3. Set up environment variables

Create a `.env` file in both `frontend/` and `backend/` directories as needed. Example:

```
# .env (frontend)
NEXT_PUBLIC_WHISPER_API_KEY=your-whisper-key
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=your-telegram-token
NEXT_PUBLIC_N8N_API_URL=http://localhost:5678
```

```
# .env (backend)
WHISPER_API_KEY=your-whisper-key
TELEGRAM_BOT_TOKEN=your-telegram-token
N8N_API_URL=http://localhost:5678
```

### 4. Run n8n (locally or use cloud)

```bash
n8n start
# or use Docker:
docker run -it --rm -p 5678:5678 n8nio/n8n
```

### 5. Start the backend

#### Python

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

#### Node.js

```bash
cd backend
npm run dev
```

### 6. Start the frontend

```bash
cd frontend
npm run dev
# or
yarn dev
```

### 7. Open the app

Go to [http://localhost:3000](http://localhost:3000) in your browser.

## Development

- Hot reload is enabled for both frontend and backend in dev mode.
- All workflow data is stored in the browser (MVP).
- For speech-to-text, you can use either Whisper API or the browser's Web Speech API.

## Testing

- MVP supports only 3 blocks: Timer, Text Assignment, Telegram Message.
- Test Telegram integration by providing your chat_id and sending a test message.
- Use the visual editor to assemble and test workflows.

## Notes

- For production, set up secure API keys and consider using a database.
- n8n must be running and accessible to the backend.
- For Whisper, you can use OpenAI's API or run a local instance.

## License

MIT
