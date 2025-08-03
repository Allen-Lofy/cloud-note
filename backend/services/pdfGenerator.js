import puppeteer from 'puppeteer'
import { marked } from 'marked'
import katex from 'katex'
import fs from 'fs-extra'
import path from 'path'

class PDFGenerator {
  constructor() {
    this.browser = null
  }

  async initialize() {
    if (!this.browser) {
      // 检测是否在容器或云端环境中
      const isProduction = process.env.NODE_ENV === 'production'
      const isContainer = process.env.CONTAINER === 'true' || 
                         process.env.DOCKER === 'true' || 
                         process.env.CI === 'true'
      
      const launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      }
      
      // 在生产环境或容器中，尝试使用系统安装的Chrome
      if (isProduction || isContainer) {
        // 尝试常见的Chrome安装路径
        const chromePaths = [
          '/usr/bin/google-chrome-stable',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          '/snap/bin/chromium'
        ]
        
        let executablePath = null
        for (const path of chromePaths) {
          try {
            const fs = await import('fs')
            await fs.promises.access(path)
            executablePath = path
            break
          } catch (error) {
            // 继续尝试下一个路径
          }
        }
        
        if (executablePath) {
          launchOptions.executablePath = executablePath
          console.log(`Using Chrome at: ${executablePath}`)
        } else {
          console.warn('No Chrome installation found, using bundled Chromium')
        }
      }
      
      this.browser = await puppeteer.launch(launchOptions)
    }
    return this.browser
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  // 生成中文友好的标题ID  
  generateHeaderId(text) {
    // 移除markdown语法和特殊字符，保留中文、英文、数字
    let cleanText = text
      .replace(/[#*_`~\[\]()]/g, '') // 移除markdown语法字符
      .replace(/[^\u4e00-\u9fa5\w\s.-]/g, '') // 只保留中文、英文、数字、空格、点、连字符
      .trim()
    
    // 对于包含数字编号的标题（如 "1. 基础概念"），保持数字和点
    let id = cleanText.replace(/\s+/g, '-').toLowerCase()
    
    // 如果全是中文和数字，使用原文本的URLEncode形式
    if (/^[\u4e00-\u9fa5\d.-]+$/.test(id)) {
      return encodeURIComponent(cleanText)
    }
    
    return id || 'header'
  }

  // 生成TOC HTML
  generateTOC(headings) {
    if (headings.length === 0) return ''
    
    let toc = '<div class="table-of-contents">\n<h3 class="toc-title">目录</h3>\n<ul class="toc-list">\n'
    
    let currentLevel = 0
    
    headings.forEach((heading, index) => {
      const { level, text, id } = heading
      
      if (level > currentLevel) {
        // 开始新的嵌套级别
        for (let i = currentLevel; i < level - 1; i++) {
          toc += '<ul>\n'
        }
      } else if (level < currentLevel) {
        // 结束嵌套级别
        for (let i = level; i < currentLevel; i++) {
          toc += '</ul>\n'
        }
      }
      
      toc += `<li><a href="#${id}" class="toc-link">${text}</a></li>\n`
      currentLevel = level
    })
    
    // 闭合剩余的ul标签
    for (let i = 1; i < currentLevel; i++) {
      toc += '</ul>\n'
    }
    
    toc += '</ul>\n</div>'
    return toc
  }

  // 清理标题文本用于匹配
  cleanTextForMatching(text) {
    return text
      .replace(/^\d+[.\-\s]*/, '') // 移除开头的数字编号
      .replace(/[.\-_\s%]+/g, '') // 移除所有标点符号
      .toLowerCase()
  }

  // 查找匹配的标题ID
  findMatchingHeaderId(targetHref, headings) {
    if (!targetHref || !targetHref.startsWith('#')) {
      return targetHref
    }
    
    const targetId = targetHref.substring(1)
    
    // 直接匹配
    const directMatch = headings.find(h => h.id === targetId)
    if (directMatch) {
      return targetHref
    }
    
    // 清理目标文本
    let targetText = targetId
    try {
      targetText = decodeURIComponent(targetId)
    } catch (e) {
      // 如果解码失败，使用原始文本
    }
    
    const cleanTarget = this.cleanTextForMatching(targetText)
    
    // 在标题中查找匹配
    for (const heading of headings) {
      // 解码标题文本
      let decodedText = heading.text
      try {
        decodedText = decodeURIComponent(heading.text)
      } catch (e) {
        // 如果解码失败，使用原始文本
      }
      
      const cleanHeading = this.cleanTextForMatching(decodedText)
      
      // 检查匹配
      if (cleanHeading === cleanTarget || 
          cleanHeading.includes(cleanTarget) || 
          cleanTarget.includes(cleanHeading)) {
        console.log(`PDF Link mapping: ${targetHref} -> #${heading.id}`, {
          targetText: targetText,
          cleanTarget: cleanTarget,
          headingText: heading.text,
          cleanHeading: cleanHeading
        })
        return `#${heading.id}`
      }
    }
    
    // 如果找不到匹配，返回原始链接
    console.warn(`PDF Link not found: ${targetHref}`, {
      availableHeadings: headings.map(h => ({ text: h.text, id: h.id }))
    })
    return targetHref
  }

  processMarkdownWithLatex(content) {
    if (!content) return ''
    
    // Step 1: Protect LaTeX blocks before Markdown processing
    let text = content
    let latexBlocks = []
    let latexCounter = 0
    
    // Extract and protect block math ($$...$$)
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
      const placeholder = `<!--LATEX_BLOCK_${latexCounter}-->`
      latexBlocks[latexCounter] = content
      latexCounter++
      return placeholder
    })
    
    // Step 2: Process TOC if present
    let hasTOC = false
    if (text.includes('[[TOC]]') || text.includes('[TOC]') || /^\s*\[toc\]\s*$/mi.test(text)) {
      hasTOC = true
      // 临时替换TOC标记
      text = text.replace(/\[\[TOC\]\]|\[TOC\]|^\s*\[toc\]\s*$/gmi, '<!--TOC_PLACEHOLDER-->')
    }
    
    // Step 3: Configure marked with custom renderer
    const renderer = new marked.Renderer()
    const headings = []
    
    // 自定义标题渲染器
    renderer.heading = (text, level) => {
      const id = this.generateHeaderId(text)
      headings.push({ level, text, id })
      return `<h${level} id="${id}" class="markdown-heading">${text}</h${level}>`
    }
    
    // 首先解析所有标题获取headings数组
    marked.setOptions({
      renderer: renderer,
      breaks: true,
      gfm: true
    })
    
    // 第一次解析，只为了获取headings
    marked.parse(text)
    
    // 重新创建 renderer，这次包含链接处理
    const finalRenderer = new marked.Renderer()
    const finalHeadings = []
    
    // 重新定义标题渲染器
    finalRenderer.heading = (text, level) => {
      const id = this.generateHeaderId(text)
      finalHeadings.push({ level, text, id })
      return `<h${level} id="${id}" class="markdown-heading">${text}</h${level}>`
    }
    
    // 自定义链接渲染器，处理内部链接
    finalRenderer.link = (href, title, text) => {
      // 处理内部链接（以#开头）
      if (href && href.startsWith('#')) {
        // 找到匹配的标题ID
        const matchedHref = this.findMatchingHeaderId(href, headings)
        const titleAttr = title ? ` title="${title}"` : ''
        return `<a href="${matchedHref}" class="internal-link"${titleAttr}>${text}</a>`
      }
      // 处理外部链接
      const titleAttr = title ? ` title="${title}"` : ''
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`
    }
    
    // 使用最终的renderer进行解析
    marked.setOptions({
      renderer: finalRenderer,
      breaks: true,
      gfm: true
    })
    
    let html = marked.parse(text)
    
    // Step 4: Generate and insert TOC if needed
    if (hasTOC && finalHeadings.length > 0) {
      const tocHtml = this.generateTOC(finalHeadings)
      html = html.replace(/<!--TOC_PLACEHOLDER-->/g, tocHtml)
    }
    
    // Step 5: Restore LaTeX blocks and process them
    html = html.replace(/<!--LATEX_BLOCK_(\d+)-->/g, (match, index) => {
      const mathContent = latexBlocks[parseInt(index)]
      try {
        return `<div class="katex-display">${katex.renderToString(mathContent, { 
          displayMode: true,
          throwOnError: false,
          strict: false,
          trust: true
        })}</div>`
      } catch (e) {
        return `<div class="latex-error">LaTeX Error: ${e.message}</div>`
      }
    })
    
    // Step 6: Handle inline math ($...$)
    html = html.replace(/\$([^$]+?)\$/g, (match, math) => {
      try {
        let mathContent = math.trim()
        mathContent = mathContent.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        
        return katex.renderToString(mathContent, { 
          displayMode: false,
          throwOnError: false,
          strict: false,
          trust: true
        })
      } catch (e) {
        return `<span class="latex-error">LaTeX Error: ${e.message}</span>`
      }
    })
    
    return html
  }

  generateHTML(content, title = 'Document') {
    const processedContent = this.processMarkdownWithLatex(content)
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: white;
        }
        
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: bold;
            color: #1f2937;
        }
        
        h1 {
            font-size: 2em;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 0.3em;
        }
        
        h2 {
            font-size: 1.5em;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 0.3em;
        }
        
        h3 { font-size: 1.25em; }
        h4 { font-size: 1.125em; }
        h5 { font-size: 1em; }
        h6 { font-size: 0.875em; }
        
        p {
            margin-bottom: 1.2em;
            line-height: 1.8;
        }
        
        pre {
            background-color: #f8f9fa;
            padding: 1rem;
            border-radius: 0.375rem;
            overflow-x: auto;
            margin: 1em 0;
        }
        
        code {
            background-color: #f8f9fa;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-size: 0.875em;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        }
        
        blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1rem;
            margin: 1rem 0;
            font-style: italic;
            color: #6b7280;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        
        th, td {
            border: 1px solid #e5e7eb;
            padding: 0.5rem;
            text-align: left;
        }
        
        th {
            background-color: #f9fafb;
            font-weight: 600;
        }
        
        ul, ol {
            margin: 1em 0;
            padding-left: 2em;
        }
        
        li {
            margin: 0.25em 0;
        }
        
        /* LaTeX math styling */
        .katex-display {
            margin: 1.5em 0;
            text-align: center;
            overflow: visible !important;
            padding: 0.5em 0;
        }
        
        .katex {
            font-size: 1.1em;
            margin: 0.3em 0.1em;
        }
        
        .katex .base {
            white-space: nowrap;
        }
        
        .katex .mtable {
            display: inline-table;
            vertical-align: middle;
        }
        
        .katex .mtable .col-align-c > .vlist-t {
            text-align: center;
        }
        
        .katex .mtable .col-align-l > .vlist-t {
            text-align: left;
        }
        
        .katex .mtable .col-align-r > .vlist-t {
            text-align: right;
        }
        
        .latex-error {
            color: #ef4444;
            background-color: #fef2f2;
            padding: 0.5rem;
            border: 1px solid #fecaca;
            border-radius: 0.25rem;
            margin: 0.5rem 0;
        }
        
        /* Table of Contents styling */
        .table-of-contents {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 2rem 0;
            page-break-inside: avoid;
        }
        
        .toc-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #374151;
            margin: 0 0 1rem 0;
            border: none;
            padding: 0;
        }
        
        .toc-list {
            list-style: none;
            margin: 0;
            padding: 0;
        }
        
        .toc-list li {
            margin: 0.5rem 0;
            padding: 0;
            display: block;
        }
        
        .toc-list ul {
            list-style: none;
            margin: 0.5rem 0 0 1.5rem;
            padding: 0;
        }
        
        .toc-link {
            color: #3b82f6;
            text-decoration: none;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            display: inline-block;
        }
        
        .toc-link:hover {
            background-color: #dbeafe;
            color: #1d4ed8;
            text-decoration: none;
        }
        
        /* Internal link styling */
        .internal-link {
            color: #3b82f6;
            text-decoration: underline;
            border: none;
            padding: 0;
        }
        
        .internal-link:hover {
            color: #1d4ed8;
            text-decoration: underline;
        }
        
        /* Markdown heading styling for better anchor targets */
        .markdown-heading {
            page-break-after: avoid;
        }
        
        /* External link styling */
        a[target="_blank"] {
            color: #3b82f6;
            text-decoration: none;
        }
        
        a[target="_blank"]:hover {
            text-decoration: underline;
        }
        
        a[target="_blank"]::after {
            content: ' ↗';
            font-size: 0.8em;
            opacity: 0.7;
        }
        
        /* 打印优化 */
        @media print {
            body {
                margin: 0;
                padding: 20px;
            }
            
            .table-of-contents {
                background: white;
                border: 1px solid #ccc;
            }
            
            .internal-link, .toc-link {
                color: #3b82f6;
                text-decoration: underline;
                background: none;
                border: none;
                padding: 0;
            }
            
            /* 隐藏链接地址，保持简洁 */
            .internal-link::after {
                display: none;
            }
        }
        
        @page {
            margin: 2cm;
            size: A4;
        }
    </style>
</head>
<body>
    <div class="content">
        ${processedContent}
    </div>
</body>
</html>`
  }

  async generatePDF(content, options = {}) {
    const {
      title = 'Document',
      format = 'A4',
      margin = { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
      displayHeaderFooter = false,
      printBackground = true,
      preferCSSPageSize = true
    } = options

    try {
      const browser = await this.initialize()
      const page = await browser.newPage()
      
      try {
        // 设置页面大小
        await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 })
        
        // 生成HTML内容
        const html = this.generateHTML(content, title)
        
        // 设置页面内容
        await page.setContent(html, { 
          waitUntil: ['networkidle0', 'domcontentloaded'],
          timeout: 30000 
        })
        
        // 等待所有KaTeX渲染完成
        await page.evaluate(() => {
          return new Promise((resolve) => {
            // 等待KaTeX渲染
            const checkKatex = () => {
              const katexElements = document.querySelectorAll('.katex')
              const allRendered = Array.from(katexElements).every(el => 
                el.querySelector('.base') !== null
              )
              
              if (allRendered || document.readyState === 'complete') {
                resolve()
              } else {
                setTimeout(checkKatex, 100)
              }
            }
            
            if (document.readyState === 'complete') {
              setTimeout(checkKatex, 500) // 额外等待500ms确保渲染完成
            } else {
              document.addEventListener('DOMContentLoaded', () => {
                setTimeout(checkKatex, 500)
              })
            }
          })
        })
        
        // 生成PDF
        const pdfBuffer = await page.pdf({
          format,
          margin,
          displayHeaderFooter,
          printBackground,
          preferCSSPageSize,
          timeout: 60000
        })
        
        return pdfBuffer
        
      } finally {
        await page.close()
      }
    } catch (error) {
      console.error('PDF generation failed:', error)
      
      // 如果Puppeteer失败，抛出更具体的错误信息
      if (error.message.includes('Could not find expected browser')) {
        throw new Error('PDF服务不可用：缺少Chrome浏览器。请联系管理员安装Chrome/Chromium。')
      } else if (error.message.includes('Navigation timeout')) {
        throw new Error('PDF生成超时，请稍后重试。')
      } else if (error.message.includes('Protocol error')) {
        throw new Error('PDF生成失败：浏览器协议错误。')
      } else {
        throw new Error(`PDF生成失败: ${error.message}`)
      }
    }
  }
}

// 创建单例实例
const pdfGenerator = new PDFGenerator()

// 优雅关闭
process.on('SIGINT', async () => {
  await pdfGenerator.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await pdfGenerator.close()
  process.exit(0)
})

export default pdfGenerator