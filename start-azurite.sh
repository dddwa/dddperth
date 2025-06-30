#!/bin/bash
# Script to start Azurite storage emulator for local development

echo "Starting Azurite storage emulator..."
echo "This provides local Azure Blob and Table storage for voting functionality"
echo ""
echo "If you don't have Azurite installed, run: npm install -g azurite"
echo ""

# Start Azurite with blob and table storage
azurite --location ./.azurite