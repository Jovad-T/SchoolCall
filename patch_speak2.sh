sed -i 's/const selectedVoice = availableVoices.find/const voicesList = window.speechSynthesis.getVoices();\n        const selectedVoice = voicesList.find/' src/App.tsx
