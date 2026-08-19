# ==============================================================================
# BRICS-AETHER: Production Multi-Stage Container Image
# Platform: Google Cloud Run (Serverless Microservice)
# ==============================================================================

# Stage 1: Build React Dashboard
FROM node:20-alpine AS builder
WORKDIR /app/dashboard

COPY dashboard/package*.json ./
RUN npm ci

COPY dashboard/ ./
RUN npm run build

# Stage 2: Production Server Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
COPY tasks/ ./tasks/
COPY data/ ./data/

# Copy built frontend assets
COPY --from=builder /app/dashboard/dist ./public
COPY prototype/ ./prototype/

# Install server dependencies
RUN npm install --omit=dev express compression helmet

# Expose production port
EXPOSE 8080

# Production Entrypoint
COPY <<EOF server.js
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const { scheduleDisputeClock, evaluateClocks, resolveDispute } = require('./tasks/dispute_clock');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json());

// Health Check
app.get('/healthz', (req, res) => res.json({ status: 'HEALTHY', system: 'BRICS-AETHER', timestamp: new Date().toISOString() }));

// Cloud Tasks Dispute Clock Handlers
app.get('/tasks/status', (req, res) => {
  const statusReport = evaluateClocks();
  res.json({ statusReport });
});

app.post('/tasks/schedule', (req, res) => {
  const clock = scheduleDisputeClock(req.body);
  res.status(201).json({ success: true, clock });
});

app.post('/tasks/resolve', (req, res) => {
  const result = resolveDispute(req.body.disputeId, req.body.resolutionMemo);
  res.status(result.success ? 200 : 400).json(result);
});

// Serve React Dashboard
app.use(express.static(path.join(__dirname, 'public')));
app.use('/prototype', express.static(path.join(__dirname, 'prototype')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[BRICS-AETHER] Cloud Run container running on port ${PORT}`);
});
EOF

CMD ["node", "server.js"]
