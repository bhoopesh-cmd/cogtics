# Environment Variables Configuration

## Required Variables

### Database
```
DATABASE_URL=postgresql://cogtics:cogtics@localhost:5432/cogtics
```

### Redis (for BullMQ job queues)
```
REDIS_URL=redis://localhost:6379
```

## LLM Configuration (OpenAI)

Required for Contract Intelligence features:
- Structured term extraction from PDFs
- OCR for scanned documents (uses GPT-4 Vision)
- Conflict resolution
- Explanation generation

```
# Your OpenAI API key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Model selection (optional, defaults to gpt-4o-mini)
# gpt-4o-mini: Fast and cheap, good for most extractions
# gpt-4o: More accurate for complex documents
OPENAI_MODEL=gpt-4o-mini
```

## S3/MinIO (for file storage)
```
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=cogtics
S3_REGION=us-east-1
```

## Application Settings
```
API_PORT=3000
LOG_LEVEL=info
FRONTEND_URL=http://localhost:5173
```

## How to Configure

1. Copy `env.example` to `.env`
2. Add your OpenAI API key
3. Restart the API and worker services

Minimal `.env` for Contract Intelligence:
```
DATABASE_URL=postgresql://cogtics:cogtics@localhost:5432/cogtics
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-your-key-here
```
