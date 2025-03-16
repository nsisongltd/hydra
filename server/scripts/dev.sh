#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p logs

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Start development server
npm run dev 