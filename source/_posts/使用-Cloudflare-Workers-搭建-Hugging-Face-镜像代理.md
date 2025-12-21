---
title: 使用 Cloudflare Workers 搭建 Hugging Face 镜像代理
date: 2025-12-14T21:04:21.000Z
description: 本文详细介绍了如何使用 Cloudflare Workers/Pages 搭建 HuggingfaceProxy 镜像代理。通过该开源项目，开发者可以利用 Cloudflare 全球边缘网络解决 Hugging Face 访问缓慢及模型下载失败的问题。文章涵盖了核心特性、智能 CDN 映射原理、详细的部署步骤以及如何通过环境变量配置加速，是优化 AI 开发环境的实用技术教程。
tags:
  - Cloudflare
  - Hugging Face
  - 博客教程
  - 教程
  - 问题解决
  - 反向代理
  - Serverless
  - AI工具
categories:
  - 技术分享
cover: cover.png
---
# 使用 Cloudflare Workers 搭建 Hugging Face 镜像代理

在进行 AI 模型开发和下载时，Hugging Face 是我们绕不开的宝库。然而，由于网络环境的复杂性，直接访问 `huggingface.co` 及其 CDN 资源（如模型权重文件的下载）有时会遇到速度缓慢甚至连接失败的问题。

为了解决这个问题，我开发了一个基于 Cloudflare Workers (或 Cloudflare Pages Functions) 的轻量级反向代理项目 —— **HuggingfaceProxy**。

## 🌟 项目介绍

**HuggingfaceProxy** 是一个开源项目，旨在利用 Cloudflare 强大的全球边缘网络，为 Hugging Face 提供快速、稳定的访问代理。

项目地址：[https://github.com/AinzRimuru/HuggingfaceProxy](https://github.com/AinzRimuru/HuggingfaceProxy)

### 核心特性

1.  **主站无缝代理**：
    通过配置的主子域名（默认为 `hf`），可以直接访问 `huggingface.co` 的完整功能。
    
2.  **智能 CDN 资源映射**：
    Hugging Face 的模型文件通常存储在 `*.hf.co` 等 CDN 域名上。本项目通过特殊的子域名映射机制（例如将 `cas-bridge.xethub.hf.co` 映射为 `cas-bridge---xethub.yourdomain.com`），实现了对这些动态 CDN 资源的完美代理。

3.  **重定向自动重写**：
    下载模型时经常会遇到 301/302 重定向。本代理会自动拦截这些重定向响应，修改其中的 `Location` 头，确保后续请求依然走你的代理域名，而不是跳回原始的 Hugging Face 域名。

4.  **零配置动态域名**：
    代码能够自动识别当前部署的根域名，无需在代码中硬编码域名，部署即用，非常方便。

## 🛠️ 原理简析

这个项目的核心逻辑非常简单，主要在 `_worker.js` 中实现。

当请求到达 Cloudflare Worker 时，脚本会解析请求的子域名：

*   如果是主子域名（如 `hf`），则将请求转发给 `huggingface.co`。
*   如果是其他子域名，脚本会将子域名中的 `---` 替换回 `.`，并补全 `.hf.co` 后缀，从而构造出原始的 CDN 域名进行请求转发。

这种设计巧妙地解决了多级域名代理的问题，同时利用了 Cloudflare 免费且高速的线路。

## 🚀 如何部署

最推荐的方式是使用 **Cloudflare Pages** 进行部署，因为配置最简单且免费额度充裕。

### 方法一：Fork & Deploy (推荐)

1.  **Fork 项目**：
    首先访问 [GitHub 仓库](https://github.com/AinzRimuru/HuggingfaceProxy)，点击右上角的 `Fork` 按钮，将其复制到你自己的账号下。

2.  **创建 Cloudflare Pages**：
    登录 Cloudflare Dashboard，进入 `Workers & Pages` -> `Create Application` -> `Pages` -> `Connect to Git`。

3.  **选择仓库**：
    选择你刚刚 Fork 的仓库，点击 `Begin setup`。

4.  **构建设置**：
    *   **Framework preset**: 选择 `None`。
    *   **Build command**: 留空。
    *   **Build output directory**: 留空。
    *   点击 `Save and Deploy`。

5.  **绑定域名 (关键)**：
    部署完成后，进入项目的 `Custom Domains` 设置，绑定你的自定义域名（例如 `yourdomain.com`）。
    *   **注意**：为了支持 CDN 代理，建议添加一个 **泛域名解析 (Wildcard DNS)**。即在 DNS 记录中添加一条 `*.yourdomain.com` CNAME 指向你的 Pages 项目地址。

### 方法二：使用 Wrangler CLI

如果你习惯本地开发，也可以使用 Wrangler 命令行工具直接部署到 Cloudflare Workers。

```bash
# 安装依赖
npm install

# 部署
npx wrangler deploy
```

## 📖 如何使用

假设你绑定的域名是 `example.com`，并且你保留了默认的 `hf` 前缀。

1.  **访问主站**：
    在浏览器中访问 `https://hf.example.com`，你应该能看到 Hugging Face 的首页。

2.  **下载模型**：
    在使用 `huggingface-cli` 或 Python 代码下载模型时，可以通过设置环境变量来使用你的代理：

    ```bash
    export HF_ENDPOINT=https://hf.example.com
    ```

    或者在 Python 代码中：

    ```python
    import os
    os.environ["HF_ENDPOINT"] = "https://hf.example.com"

    from huggingface_hub import snapshot_download
    snapshot_download(repo_id="gpt2")
    ```

## 结语

通过这个简单的 Cloudflare Worker 脚本，我们可以轻松搭建一个属于自己的 Hugging Face 加速通道。既解决了访问难题，又利用了 Serverless 架构的低成本优势。

如果你觉得这个项目对你有帮助，欢迎在 GitHub 上点个 Star！🌟