# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency files and install ALL dependencies (including devDependencies)
COPY package.json ./
RUN npm install

# Copy configuration and source files
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
COPY assets/ ./assets/
COPY server.ts ./server.ts

# Build frontend assets and bundle backend server
RUN npm run build

# Stage 2: Production environment
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Default port to run inside the container is 3031
ENV PORT=3036

# Copy package files to install ONLY production dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy compiled build output from builder stage
COPY --from=builder /app/dist ./dist

# Expose the requested port
EXPOSE 3036

# Start the built server
CMD ["npm", "run", "start"]
