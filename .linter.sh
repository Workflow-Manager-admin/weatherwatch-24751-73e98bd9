#!/bin/bash
cd /home/kavia/workspace/code-generation/weatherwatch-24751-73e98bd9/weatherwatch_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

