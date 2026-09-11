FROM python:3.11-slim

WORKDIR /app

# Install system dependencies & LibreOffice for exact Word/Excel/PDF rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-nogui \
    fonts-noto-core \
    fonts-noto-cjk \
    fonts-freefont-ttf \
    fonts-dejavu-core \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
