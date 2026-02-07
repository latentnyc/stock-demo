# 🦆 Vibes Stock Demo

> **⚠️ DISCLOSURE: VIBE CODED PRODUCT ⚠️**
> 
> This is a **first attempt**. This entire project was built on pure vibes, late-night coding sessions, and a lot of "let's see if this works". 
> 
> **Expect:**
> - Spaghetti code 🍝
> - "It works on my machine" guarantees
> - A distinct lack of unit tests (we test in production like real heroes)
> - Occasional brilliance mixed with "why did I do that?"
>
> **Do NOT Expect:**
> - Enterprise-grade scalability
> - Rigorous error handling
> - A refund

## What is this?

This is a simple stock tracking application. It allows you to:
- **Track your portfolio**: Add stocks, remove them, and watch your wealth fluctuate.
- **View Real-time(ish) Data**: We scrape Yahoo Finance using Python because official APIs are expensive.
- **Read News**: Get the latest market news.
- **Login with Google**: Because writing your own auth is a nightmare.
- **View System Logs**: See exactly what's breaking in real-time!

## The Tech Stack (The "Vibes")

We threw together some cool tech to make this happen:

- **Frontend**: 
  - [React](https://react.dev/)
  - [Vite](https://vitejs.dev/) (Fast!)
  - [TailwindCSS](https://tailwindcss.com/) (CSS for people who hate CSS)
  - [Recharts](https://recharts.org/) (Charts!)
  - [Lucide React](https://lucide.dev/) (Icons!)

- **Backend**:
  - [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
  - [SQLite](https://www.sqlite.org/index.html) (Simple, local database)
  - [Python](https://www.python.org/) & [yfinance](https://pypi.org/project/yfinance/) (For fetching stock data)

## Getting Started

If you are brave enough to run this locally:

### 1. Prerequisites

- Node.js (Latest LTS recommended)
- Python 3.x (with `pip` installed)
- A Google Cloud Console project (for Auth)
- A hunger for adventure

### 2. Installation

Clone the repo and install the dependencies.

```bash
git clone https://github.com/latentnyc/stock-demo.git
cd stock-demo
npm install
```

Install Python dependencies:
```bash
cd server
pip install -r requirements.txt
cd ..
```

### 3. Environment Variables

You'll need a `.env` file in the root directory.

```env
PORT=3002
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
# JWT Secret for session tokens
JWT_SECRET=super_secret_vibe_key
```

### 4. Running the App

We use `concurrently` to run both the frontend and backend with one command, because efficiency.

```bash
npm run start:dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend**: [http://localhost:3002](http://localhost:3002)

## Contributing

If you want to fix my messy code, feel free to open a PR. Just remember to keep the vibes good.

## License

MIT. Do whatever you want with this.
