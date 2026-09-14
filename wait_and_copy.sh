#!/bin/bash
echo "Waiting for build:class to finish..."
while pgrep -f "electron-builder --win nsis -c.extraMetadata.main=class.cjs" > /dev/null; do
    sleep 2
done
echo "build:class finished."

# Find the exe file in dist_class
EXE_FILE=$(find dist_class -name "*.exe" | head -n 1)
if [ -n "$EXE_FILE" ]; then
    cp "$EXE_FILE" "public/downloads/SchoolCallApp_Setup_class.exe"
    echo "Copied $EXE_FILE to public/downloads/SchoolCallApp_Setup_class.exe"
else
    echo "EXE file not found in dist_class"
fi

echo "Starting build:office..."
npm run build:office > build_office.log 2>&1

# Find the exe file in dist_office
EXE_OFFICE=$(find dist_office -name "*.exe" | head -n 1)
if [ -n "$EXE_OFFICE" ]; then
    cp "$EXE_OFFICE" "public/downloads/SchoolCallApp_Setup_office.exe"
    echo "Copied $EXE_OFFICE to public/downloads/SchoolCallApp_Setup_office.exe"
else
    echo "EXE file not found in dist_office"
fi

