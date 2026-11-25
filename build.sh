#!/usr/bin/env bash
# 把 src 的源码同步到 www，再同步进 iOS / Android 原生工程
set -e
cd "$(dirname "$0")"
npm run sync
echo "✔ 已同步 src → www → ios / android"
