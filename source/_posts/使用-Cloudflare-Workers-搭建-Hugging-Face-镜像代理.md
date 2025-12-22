---
title: 使用 Cloudflare Workers 搭建 Hugging Face 镜像代理
date: 2025-12-14T21:04:21.000Z
updated: 2025-12-22T21:00:00.000Z
description: 本文详细介绍如何使用 Cloudflare Workers/Pages 搭建 HuggingfaceProxy 镜像代理。通过该开源项目，利用 Cloudflare 全球边缘网络解决 Hugging Face 访问缓慢及模型下载失败的问题，包含完整的部署步骤和使用指南。
tags:
  - Cloudflare
  - Hugging Face
  - 教程
  - 反向代理
  - Serverless
  - AI工具
categories:
  - 技术分享
cover: cover.png
---

# 使用 Cloudflare Workers 搭建 Hugging Face 镜像代理

在进行 AI 模型开发时，Hugging Face 是绕不开的资源库。然而，直接访问 `huggingface.co` 及其 CDN 资源有时会遇到速度缓慢甚至连接失败的问题。

为了解决这个问题，我开发了一个基于 Cloudflare Workers 的轻量级反向代理项目 —— **HuggingfaceProxy**。

## 🌟 项目介绍

**HuggingfaceProxy** 是一个开源项目，利用 Cloudflare 全球边缘网络，为 Hugging Face 提供快速、稳定的访问代理。

项目地址：[https://github.com/AinzRimuru/HuggingfaceProxy](https://github.com/AinzRimuru/HuggingfaceProxy)

### 核心特性

- **零配置使用**：直接访问即可，所有请求自动转发到 Hugging Face
- **智能重定向**：自动处理 CDN 重定向，无需多域名配置
- **下载器脚本**：提供 Python 下载器，支持并行下载、断点续传
- **模块化架构**：代码结构清晰，易于维护和扩展

## 🛠️ 原理简析

核心逻辑在 `_worker.js` 中实现。当请求到达 Cloudflare Worker 时：

1. 解析请求路径，判断目标资源
2. 将请求转发到 `huggingface.co`
3. 拦截重定向响应，自动改写 `Location` 头

当 Hugging Face 返回重定向到 CDN 时，Worker 会自动改写：

```
原始: Location: https://cdn-lfs.hf.co/path/to/file
改写: Location: https://your-proxy.com/redirect_to_cdn-lfs.hf.co/path/to/file
```

这样所有请求都只需经过单一代理域名，无需配置泛域名。

## 🚀 如何部署

推荐使用 **Cloudflare Pages** 进行部署，配置简单且免费额度充裕。

### 方法一：Fork & Deploy（推荐）

1. **Fork 项目**
   访问 [GitHub 仓库](https://github.com/AinzRimuru/HuggingfaceProxy)，点击 `Fork`

2. **创建 Cloudflare Pages**
   登录 Cloudflare Dashboard → `Workers & Pages` → `Create` → `Pages` → `Connect to Git`

3. **选择仓库**
   选择你 Fork 的仓库，Framework preset 选择 `None`，直接部署

4. **绑定域名**（可选）
   部署完成后，可在 `Custom Domains` 设置中绑定自定义域名

### 方法二：使用 Wrangler CLI

```bash
# 克隆项目
git clone https://github.com/AinzRimuru/HuggingfaceProxy.git
cd HuggingfaceProxy

# 安装依赖
npm install

# 部署
npm run deploy
```

## 📖 如何使用

假设你的代理域名是 `your-proxy.pages.dev`。

### 直接访问

```bash
# 访问模型页面
https://your-proxy.pages.dev/bert-base-uncased

# 下载模型文件
https://your-proxy.pages.dev/bert-base-uncased/resolve/main/config.json

# API 调用
https://your-proxy.pages.dev/api/models/bert-base-uncased
```

### 使用下载器脚本

```bash
# 下载脚本
curl -O https://your-proxy.pages.dev/hf_downloader.py

# 安装依赖
pip install requests tqdm

# 下载模型
python hf_downloader.py bert-base-uncased
python hf_downloader.py openai/whisper-large-v3 --type model
python hf_downloader.py bigcode/starcoder --workers 8
```

> ⚠️ **注意**: 不推荐使用 `huggingface-cli` 或 `snapshot_download` 搭配本代理。由于 Cloudflare 的缓存机制会丢失 `Content-Length` 等关键头信息，会导致这些客户端下载失败。请使用本项目自带的下载脚本。

## 结语

通过这个 Cloudflare Worker 脚本，可以轻松搭建属于自己的 Hugging Face 加速通道。既解决了访问难题，又利用了 Serverless 架构的低成本优势。

如果你觉得这个项目有帮助，欢迎在 GitHub 上点个 Star！🌟