#!/bin/bash

echo "Starting server..."
# لو عندك متغيرات، احفظها داخل .env
# Render يترك .env ثابت وما يمسحه

# شغّل المشروع
npm install --force
npm run start

# لو بدك يسجّل لوقات
# node server.js >> logs.txt 2>&1
