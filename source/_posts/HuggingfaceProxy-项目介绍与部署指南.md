---
title: HuggingfaceProxy：Hugging Face 反向代理加速方案
date: 2025-12-22T21:00:00.000Z
description: 一个基于 Cloudflare Workers 的轻量级 Hugging Face 反向代理项目，帮助国内用户快速访问和下载 Hugging Face 模型。零配置使用，自动处理 CDN 重定向，并提供专用 Python 下载器支持并行下载和断点续传。
tags:
  - Cloudflare
  - Hugging Face
  - 教程
  - 反向代理
  - 模型下载
categories:
  - 技术分享
cover: cover.png
---

## 项目简介

国内访问 Hugging Face 速度慢？下载模型超时？这个项目帮你解决。

**HuggingfaceProxy** 是一个基于 Cloudflare Workers 的轻量级反向代理，帮你快速搭建 Hugging Face 访问加速服务。

项目地址：[https://github.com/AinzRimuru/HuggingfaceProxy](https://github.com/AinzRimuru/HuggingfaceProxy)

## 特性

- **零配置使用** - 直接访问即可，所有请求自动转发到 Hugging Face
- **智能重定向** - 自动处理 CDN 重定向，无需多域名配置
- **下载器脚本** - 提供 Python 下载器，支持并行下载、断点续传
- **模块化架构** - 代码结构清晰，易于维护和扩展

## 快速开始

### 部署到 Cloudflare Pages

1. Fork [本仓库](https://github.com/AinzRimuru/HuggingfaceProxy)
2. 在 Cloudflare Dashboard 创建 Pages 项目，连接 GitHub 仓库
3. 推送代码到 `main` 分支，GitHub Actions 会自动构建
4. Cloudflare Pages 自动拉取最新代码并部署

部署完成后，Cloudflare 会自动分配一个 `*.pages.dev` 域名，也可以绑定自定义域名。

### 本地开发

```bash
# 安装依赖
npm install

# 构建并启动开发服务器
npm run dev

# 部署
npm run deploy
```

## 使用方法

### 直接访问

```bash
# 访问模型页面
https://your-proxy.com/bert-base-uncased

# 下载模型文件
https://your-proxy.com/bert-base-uncased/resolve/main/config.json

# API 调用
https://your-proxy.com/api/models/bert-base-uncased
```

### 使用下载器脚本

```bash
# 下载脚本
curl -O https://your-proxy.com/hf_downloader.py

# 安装依赖
pip install requests tqdm

# 下载模型
python hf_downloader.py bert-base-uncased
python hf_downloader.py openai/whisper-large-v3 --type model
python hf_downloader.py bigcode/starcoder --revision main --workers 8
```

> ⚠️ **注意**: 不推荐使用 `huggingface-cli` 或 `snapshot_download` 搭配本代理。由于 Cloudflare 的缓存机制会覆盖或丢失 `Content-Length` 等关键头信息，会导致这些客户端下载失败。请使用本项目自带的下载脚本。

## 工作原理

当 Hugging Face 返回重定向到 CDN 节点时，Worker 会自动改写 Location：

```
原始: Location: https://cdn-lfs.hf.co/path/to/file
改写: Location: https://your-proxy.com/redirect_to_cdn-lfs.hf.co/path/to/file
```

这样所有请求都只需经过单一代理域名。

## 配置说明

编辑 `src/config.js` 可修改配置：

```javascript
// 允许的上游域名列表
export const ALLOWED_UPSTREAM_DOMAINS = ['huggingface.co'];

// 默认上游域名
export const DEFAULT_UPSTREAM = 'huggingface.co';

// 重定向前缀
export const REDIRECT_PREFIX = 'redirect_to_';
```

## License

MIT License

---

项目地址：[https://github.com/AinzRimuru/HuggingfaceProxy](https://github.com/AinzRimuru/HuggingfaceProxy)