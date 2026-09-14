#!/bin/bash
set -e
echo "Building class app..."
npm run build:class
echo "Copying class app..."
EXE_FILE=$(find dist_class -name "*.exe" | head -n 1)
if [ -n "$EXE_FILE" ]; then
    mkdir -p public/downloads
    cp "$EXE_FILE" "public/downloads/SchoolCallApp_Setup_class.exe"
    echo "Copied $EXE_FILE to public/downloads/SchoolCallApp_Setup_class.exe"
else
    echo "EXE file not found in dist_class"
fi

echo "Building office app..."
npm run build:office
echo "Copying office app..."
EXE_OFFICE=$(find dist_office -name "*.exe" | head -n 1)
if [ -n "$EXE_OFFICE" ]; then
    cp "$EXE_OFFICE" "public/downloads/SchoolCallApp_Setup_office.exe"
    echo "Copied $EXE_OFFICE to public/downloads/SchoolCallApp_Setup_office.exe"
else
    echo "EXE file not found in dist_office"
fi
