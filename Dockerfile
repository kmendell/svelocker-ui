# Stage 1: Build the application
FROM node:22-alpine AS builder
RUN apk add curl bash
RUN curl -fsSL https://bun.sh/install | bash
RUN bash
WORKDIR /app
COPY package*.json ./
RUN ~/.bun/bin/bun install
COPY . .
RUN ~/.bun/bin/bun install
RUN ~/.bun/bin/bun run build

# Stage 2: Production image
FROM node:22-alpine
RUN apk add curl bash
RUN curl -fsSL https://bun.sh/install | bash
RUN bash
WORKDIR /app
COPY --from=builder /app/build ./build
COPY package*.json ./
RUN ~/.bun/bin/bun install --omit=dev
COPY --from=builder /app/static ./static

EXPOSE 3000
LABEL org.opencontainers.image.authors="kmendell"
CMD ["node", "build"]