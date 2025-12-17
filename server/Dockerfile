FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies (including devDependencies for prisma)
RUN bun install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN bunx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "src/index.ts"]
