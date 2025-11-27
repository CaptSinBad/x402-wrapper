#!/bin/bash
# Workaround script to remove test files from pino/thread-stream before build

echo "Removing test files from pino and thread-stream packages..."

# Remove thread-stream test directory
if [ -d "node_modules/thread-stream/test" ]; then
  echo "Removing node_modules/thread-stream/test"
  rm -rf node_modules/thread-stream/test
fi

# Remove pino test directory  
if [ -d "node_modules/pino/test" ]; then
  echo "Removing node_modules/pino/test"
  rm -rf node_modules/pino/test
fi

# Remove any .test.js files from these packages
find node_modules/thread-stream -name "*.test.js" -type f -delete 2>/dev/null || true
find node_modules/pino -name "*.test.js" -type f -delete 2>/dev/null || true

echo "Test files removed. Running build..."
npm run build
