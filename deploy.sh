#!/bin/bash

echo "Pulling latest code..."
git pull

echo "Installing packages..."
npm install

echo "Restarting server..."
pm2 restart all || pm2 start server.js
