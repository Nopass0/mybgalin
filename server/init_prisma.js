const fs = require('fs');
const path = require('path');

// Read schema
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const prismaPackagePath = path.join(__dirname, 'node_modules', '@prisma', 'client', 'generator.d.ts');

// Just check if prisma exists, if not, we can try importing anyway
console.log('Prisma schema exists:', fs.existsSync(schemaPath));
console.log('Prisma package exists:', fs.existsSync(prismaPackagePath));

// Try to load prisma with different approach
try {
  const { PrismaClient } = require('@prisma/client');
  console.log('Successfully imported PrismaClient');
  const client = new PrismaClient();
  console.log('Successfully created PrismaClient instance');
} catch (e) {
  console.error('Error:', e.message);
}
