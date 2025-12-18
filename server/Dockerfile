FROM oven/bun:latest

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy prisma schema (before generate for caching)
COPY prisma ./prisma/

# Generate Prisma client
RUN bunx prisma generate

# Copy source code
COPY . .

# Set environment
ENV PORT=8000
ENV NODE_ENV=production

# Expose port
EXPOSE 8000

# Start the server (prisma client already generated)
CMD ["bun", "run", "src/index.ts"]
