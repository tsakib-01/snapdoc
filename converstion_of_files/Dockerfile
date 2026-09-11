FROM python:3.11-slim-bullseye

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies & LibreOffice
RUN apt-get update && \
    apt-get install -y -o Acquire::Retries=3 --no-install-recommends \
    build-essential \
    libreoffice \
    fonts-dejavu-core \
    fonts-liberation && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
