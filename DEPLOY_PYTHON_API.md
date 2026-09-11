# 🚀 How to Host the Python Conversion API (Render, Railway, Fly.io, or VPS)

This guide shows you how to host the Python FastAPI microservice (`converstion_of_files/`) in under 3 minutes so your Next.js application (hosted on Vercel or anywhere) can perform 100% exact high-fidelity document conversions.

---

## ⚡ Option 1: Deploy on Render.com (Easiest & Free)

1. Go to **[render.com](https://render.com)** and create a free account.
2. Click **New +** &rarr; **Web Service**.
3. Connect your GitHub repository (`tsakib-01/snapdoc` or `tsakib-01/FileMint-`).
4. Configure the settings:
   - **Name**: `document-conversion-api`
   - **Root Directory**: `converstion_of_files`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. *(Optional Security)* In **Environment Variables**, add:
   - `CONVERSION_API_KEY`: `your_secret_key_123`
6. Click **Deploy Web Service**.
7. Once deployed, copy your Render URL (e.g., `https://document-conversion-api.onrender.com`).

---

## ⚡ Option 2: Deploy on Railway.app

1. Go to **[railway.app](https://railway.app)** and click **New Project**.
2. Select **Deploy from GitHub repo** and pick this repository.
3. In settings:
   - Set **Root Directory** to `/converstion_of_files`.
   - Set **Start Command** to `uvicorn server:app --host 0.0.0.0 --port $PORT`.
4. Add environment variable `CONVERSION_API_KEY` (optional).
5. Generate a public domain and copy your URL.

---

## ⚡ Option 3: Deploy on Any Linux VPS / Docker

If you have an Ubuntu VPS (DigitalOcean, Hetzner, AWS, etc.):
```bash
cd converstion_of_files
docker build -t conversion-studio .
docker run -d -p 8000:8000 -e CONVERSION_API_KEY="your_secret_key_123" --name converter conversion-studio
```

---

## 🔗 Connect Next.js (Vercel / Local) to Your Hosted Python API

1. In your Next.js project (or in your **Vercel Project Settings &rarr; Environment Variables**), add:
   ```env
   CONVERSION_API_URL=https://your-hosted-python-api.onrender.com
   CONVERSION_API_KEY=your_secret_key_123
   ```

2. That's it! When users convert documents on:
   - `/pdf-to-word`
   - `/pdf-to-excel`
   - `/excel-to-pdf`
   - `/word-to-pdf`
   Next.js forwards the request directly to your Python server and returns the converted document with 100% precision.
