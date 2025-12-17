FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies (including devDependencies for prisma)
RUN bun install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client for the target platform
RUN bunx prisma generate

# Copy source code
COPY . .

# Set environment
ENV PORT=8000
ENV NODE_ENV=production

# Expose port
EXPOSE 8000

# Re-generate prisma client at runtime to ensure correct platform
CMD bunx prisma generate && bun run src/index.ts
