# Use Debian-based Bun image
FROM oven/bun:1-debian

# Labels for GitHub Container Registry
LABEL org.opencontainers.image.source=https://github.com/Nopass0/mybgalin
LABEL org.opencontainers.image.description="BGalin Backend API"

WORKDIR /app

# Install curl for healthcheck and openssl for Prisma
RUN apt-get update && apt-get install -y curl openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client with optimized settings
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
RUN bun run prisma:generate

# Copy source code
COPY . .

# Set environment
ENV PORT=8000
ENV NODE_ENV=production

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Start the server
CMD ["bun", "run", "src/index.ts"]
