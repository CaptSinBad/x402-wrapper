FROM node:20-alpine

WORKDIR /usr/src/app

# Install deps (include devDependencies so the Next build has access to types like vitest)
COPY package.json package-lock.json* ./
# Use npm install to avoid failing when package-lock is out of sync in dev images
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build the Next app
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "run", "start"]
