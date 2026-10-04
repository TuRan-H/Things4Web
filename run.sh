#!/usr/bin/env bash
cd "$(dirname "$0")"

# 退出时终止所有子进程
trap 'kill $(jobs -p) 2>/dev/null' EXIT

(cd backend && cargo run) &
(cd frontend && npm run dev) &

wait
