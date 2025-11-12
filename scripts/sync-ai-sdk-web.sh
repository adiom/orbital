#!/usr/bin/env bash

set -e

DEST="docs/ai-sdk-web"

# Создать папку если её нет
mkdir -p $DEST

# Список страниц которые хотим подтягивать
PAGES=(
  "https://ai-sdk.dev"
  "https://ai-sdk.dev/docs"
  "https://ai-sdk.dev/docs/introduction"
  "https://ai-sdk.dev/docs/getting-started"
  "https://ai-sdk.dev/docs/ai/clients"
  "https://ai-sdk.dev/docs/ai/streaming"
  "https://ai-sdk.dev/docs/ai/chat-completions"
  "https://ai-sdk.dev/docs/examples"
)

for URL in "${PAGES[@]}"; do
  FILENAME=$(echo $URL | sed 's@https://ai-sdk.dev@@; s@^/@@; s@/@-@g')
  [ -z "$FILENAME" ] && FILENAME="index"
  curl -s "$URL" -o "$DEST/$FILENAME.html"
done

