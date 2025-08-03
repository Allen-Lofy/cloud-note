#!/bin/bash

# Chrome/Chromium 安装脚本 - 用于云端部署环境
# 这个脚本会自动安装 Chrome 和 Puppeteer 所需的依赖

echo "🚀 开始安装 Chrome 和 PDF 导出依赖..."

# 检测操作系统
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo "❌ 无法检测操作系统版本"
    exit 1
fi

echo "📋 检测到操作系统: $OS $VER"

# 更新包列表
echo "📦 更新包列表..."
sudo apt-get update

# 安装基础依赖
echo "🔧 安装基础依赖..."
sudo apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https \
    software-properties-common

# 安装 Google Chrome
echo "🌐 安装 Google Chrome..."

# 添加 Google Chrome 仓库
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list

# 更新包列表
sudo apt-get update

# 安装 Chrome
if sudo apt-get install -y google-chrome-stable; then
    echo "✅ Google Chrome 安装成功"
    CHROME_PATH="/usr/bin/google-chrome-stable"
else
    echo "⚠️  Google Chrome 安装失败，尝试安装 Chromium..."
    
    # 尝试安装 Chromium 作为替代
    if sudo apt-get install -y chromium-browser; then
        echo "✅ Chromium 安装成功"
        CHROME_PATH="/usr/bin/chromium-browser"
    elif sudo snap install chromium; then
        echo "✅ Chromium (Snap) 安装成功"
        CHROME_PATH="/snap/bin/chromium"
    else
        echo "❌ Chrome/Chromium 安装失败"
        exit 1
    fi
fi

# 安装 Puppeteer 依赖
echo "🎭 安装 Puppeteer 所需的系统依赖..."
sudo apt-get install -y \
    libnss3-dev \
    libatk-bridge2.0-dev \
    libdrm-dev \
    libxcomposite-dev \
    libxdamage-dev \
    libxrandr-dev \
    libgbm-dev \
    libxss-dev \
    libasound2-dev \
    libatspi2.0-0 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libxfixes3 \
    libxinerama1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0

# 安装字体
echo "🔤 安装中文字体和常用字体..."
sudo apt-get install -y \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fonts-wqy-zenhei \
    fonts-wqy-microhei \
    ttf-wqy-zenhei \
    ttf-wqy-microhei

# 验证安装
echo "🔍 验证 Chrome 安装..."
if command -v google-chrome-stable &> /dev/null; then
    CHROME_VERSION=$(google-chrome-stable --version)
    echo "✅ $CHROME_VERSION"
    echo "📍 Chrome 路径: /usr/bin/google-chrome-stable"
elif command -v chromium-browser &> /dev/null; then
    CHROMIUM_VERSION=$(chromium-browser --version)
    echo "✅ $CHROMIUM_VERSION"
    echo "📍 Chromium 路径: /usr/bin/chromium-browser"
elif command -v chromium &> /dev/null; then
    CHROMIUM_VERSION=$(chromium --version)
    echo "✅ $CHROMIUM_VERSION"
    echo "📍 Chromium 路径: /snap/bin/chromium"
else
    echo "❌ Chrome/Chromium 验证失败"
    exit 1
fi

# 创建环境配置
echo "⚙️ 配置环境变量..."
cat >> ~/.bashrc << EOF

# Chrome/Puppeteer 配置
export CHROME_PATH="$CHROME_PATH"
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH="$CHROME_PATH"
EOF

# 创建 systemd 环境配置
sudo mkdir -p /etc/systemd/system/cloud-note-backend.service.d
sudo tee /etc/systemd/system/cloud-note-backend.service.d/chrome.conf > /dev/null << EOF
[Service]
Environment="CHROME_PATH=$CHROME_PATH"
Environment="PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true"
Environment="PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH"
EOF

echo "🎉 安装完成！"
echo ""
echo "📋 安装摘要:"
echo "   - Chrome/Chromium: ✅ 已安装"
echo "   - 系统依赖: ✅ 已安装"
echo "   - 中文字体: ✅ 已安装"
echo "   - 环境配置: ✅ 已配置"
echo ""
echo "🔄 请重启应用服务以使配置生效:"
echo "   pm2 restart cloud-note-backend"
echo ""
echo "💡 如果仍有问题，请检查服务器内存是否足够（推荐 1GB+ RAM）"