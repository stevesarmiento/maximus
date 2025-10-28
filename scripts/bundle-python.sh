#!/bin/bash

# Bundle Python runtime for Tauri app distribution
# This script creates a portable Python environment that can be bundled with the app

set -e

echo "🐍 Bundling Python runtime for Maximus..."

# Configuration
PYTHON_VERSION="3.10"
BUNDLE_DIR="src-tauri/resources/python"
VENV_DIR="$BUNDLE_DIR/venv"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo -e "${RED}Error: uv is not installed${NC}"
    echo "Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Create bundle directory
echo -e "${BLUE}Creating bundle directory...${NC}"
mkdir -p "$BUNDLE_DIR"

# Create a clean virtual environment
echo -e "${BLUE}Creating virtual environment...${NC}"
if [ -d "$VENV_DIR" ]; then
    rm -rf "$VENV_DIR"
fi

python3 -m venv "$VENV_DIR"

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo -e "${BLUE}Upgrading pip...${NC}"
pip install --upgrade pip setuptools wheel

# Install dependencies using pyproject.toml
echo -e "${BLUE}Installing dependencies...${NC}"
pip install -e .

# Install the maximus package
echo -e "${BLUE}Installing maximus...${NC}"
pip install -e .

# Create a standalone script that sets up paths
echo -e "${BLUE}Creating launcher script...${NC}"
cat > "$BUNDLE_DIR/run_maximus.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/venv/bin/activate"
python -m maximus "$@"
EOF

chmod +x "$BUNDLE_DIR/run_maximus.sh"

# Deactivate virtual environment
deactivate

echo -e "${GREEN}✅ Python runtime bundled successfully!${NC}"
echo -e "${BLUE}Location: $BUNDLE_DIR${NC}"
echo ""
echo "Next steps:"
echo "1. Build the Tauri app: npm run tauri:build"
echo "2. The Python runtime will be included in the app bundle"
echo ""
echo "Note: The bundle includes:"
echo "  - Python $PYTHON_VERSION virtual environment"
echo "  - All dependencies from pyproject.toml"
echo "  - Maximus agent"
echo "  - TA-Lib and other native dependencies"

