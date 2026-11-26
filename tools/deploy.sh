#!/usr/bin/env bash
# DK 레이더 배포: 저장소가 준비된 뒤 한 번에 실행합니다.
# 사용법: bash tools/deploy.sh [owner/repo]
set -euo pipefail
REPO="${1:-schl410-hub/dk-radar}"
cd "$(dirname "$0")/.."

git add -A
git -c commit.gpgsign=false commit -m "${2:-DK 레이더 업데이트}" || echo "(커밋할 변경 없음)"
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/${REPO}.git"
git push -u origin main

# GitHub Pages 켜기 (이미 켜져 있으면 무시)
gh api -X POST "/repos/${REPO}/pages" \
  -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 || \
gh api -X PUT "/repos/${REPO}/pages" \
  -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 || true

echo "repo: https://github.com/${REPO}"
echo "page: https://${REPO%%/*}.github.io/${REPO##*/}/"
