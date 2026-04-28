#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT_DIR/EduPlatform.API"
DLL_PATH="$API_DIR/bin/Debug/net7.0/EduPlatform.API.dll"
PRIMARY_PORT="5067"
FALLBACK_PORT="5080"
API_PORT="$PRIMARY_PORT"

echo "Stopping stuck EduPlatform API processes..."
PORT_PIDS="$(lsof -tiTCP:${PRIMARY_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$PORT_PIDS" ]]; then
  echo "Killing processes listening on port ${PRIMARY_PORT}: $PORT_PIDS"
  kill -9 $PORT_PIDS || true
fi

pkill -9 -f "EduPlatform.API/bin/Debug/net7.0/EduPlatform.API" 2>/dev/null || true
pkill -9 -f "EduPlatform.API.dll" 2>/dev/null || true
pkill -9 -f "dotnet run" 2>/dev/null || true

if lsof -tiTCP:${PRIMARY_PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  API_PORT="$FALLBACK_PORT"
  echo "Port ${PRIMARY_PORT} is still busy. Falling back to port ${FALLBACK_PORT}."
fi

echo "Cleaning backend build output..."
rm -rf "$API_DIR/bin" "$API_DIR/obj"

cd "$API_DIR"

echo "Rebuilding EduPlatform.API..."
dotnet build /p:DebugSymbols=false /p:DebugType=None

echo "Starting EduPlatform.API on http://localhost:${API_PORT} ..."
dotnet "$DLL_PATH" --urls "http://localhost:${API_PORT}"
