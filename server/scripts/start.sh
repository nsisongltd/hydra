#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p logs

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Build TypeScript
npm run build

# Start the server
npm start 