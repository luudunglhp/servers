# ───────────────────── Stage 1: Build ─────────────────────
FROM node:22.12-alpine AS builder
WORKDIR /app

# Install native build tools if needed
RUN apk add --no-cache python3 make g++

# Copy JS/TS manifests and install deps
COPY package.json package-lock.json ./
RUN npm install

# Copy all source files & compile
COPY . .
RUN npm run build

# ───────────────────── Stage 2: Runtime ────────────────────
FROM node:22.12-alpine
WORKDIR /app

# Copy production deps and built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist       ./dist

# Expose and default the HTTP port
EXPOSE 3000
ENV PORT=3000

# Launch the HTTP↔STDIO bridge
CMD ["npm", "start"]
