#!/usr/bin/env bash

set -e

TARGET_DIR="docs/ai-sdk"
REPO_URL="https://github.com/vercel/ai.git"

# Если директория существует - обновляем
if [ -d "$TARGET_DIR/.git" ]; then
  cd $TARGET_DIR
  git pull --rebase
  cd ../..
else
  git clone --depth=1 $REPO_URL $TARGET_DIR
fi

# Берём только docs и examples
find $TARGET_DIR -mindepth 1 -maxdepth 1 ! -name "docs" ! -name "examples" -exec rm -rf {} +

