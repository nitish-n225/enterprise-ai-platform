# ==============================================================================
# Enterprise AI Business Operations Platform - Backend Dockerfile
# Multi-stage production build for FastAPI + LangGraph + ReportLab
# ==============================================================================

FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies for C-extensions (psycopg2, bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final Runtime Image
FROM python:3.12-slim AS runner

WORKDIR /app

# Install runtime dependencies (libpq for postgres, curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

# Create unprivileged runtime user
RUN useradd -m -u 1001 appuser && \
    mkdir -p /app/data/uploads /app/data/reports && \
    chown -R appuser:appuser /app

# Copy application source code
COPY --chown=appuser:appuser . /app/backend

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
