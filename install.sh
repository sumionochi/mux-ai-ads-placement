#!/bin/bash

echo "🚀 MuxAIAdsPlacement Installation Script"
echo "===================================="

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Detected macOS"
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew not found. Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install FFmpeg
    if ! command -v ffmpeg &> /dev/null; then
        echo "📦 Installing FFmpeg..."
        brew install ffmpeg
    else
        echo "✅ FFmpeg already installed"
    fi
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected Linux"
    
    # Install FFmpeg
    if ! command -v ffmpeg &> /dev/null; then
        echo "📦 Installing FFmpeg..."
        sudo apt-get update
        sudo apt-get install -y ffmpeg
    else
        echo "✅ FFmpeg already installed"
    fi
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "Please install FFmpeg manually from: https://ffmpeg.org/download.html"
    exit 1
fi

# Verify FFmpeg installation
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg installed successfully"
    ffmpeg -version | head -n 1
else
    echo "❌ FFmpeg installation failed"
    exit 1
fi

# Install Node dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy .env.example to .env.local"
echo "2. Add your API keys to .env.local"
echo "3. Run 'npm run ffmpeg' in one terminal"
echo "4. Run 'npm run dev' in another terminal"
echo ""