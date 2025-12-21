---
title: HuggingfaceProxy：Hugging Face 反向代理加速方案
date: 2025-12-17T10:00:00.000Z
description: 本文介绍了一个基于 Cloudflare Workers 的开源项目 HuggingfaceProxy，通过 100 行代码轻松实现 Hugging Face 国内反向代理加速。文章详细讲解了其 CDN 映射、重定向重写等核心功能，并提供 Cloudflare Pages 部署教程及 Python 环境下的配置方法，有效解决模型下载超时及访问受限问题。
tags:
  - Cloudflare
  - Hugging Face
  - 教程
  - 问题解决
  - 反向代理
  - CDN加速
  - 模型下载
categories:
  - 技术分享
cover: cover.png
---
## 项目简介

国内访问 Hugging Face 速度慢？下载模型超时？这个项目帮你解决。

**HuggingfaceProxy** 是一个基于 Cloudflare Workers 的轻量级反向代理，100 行代码搞定 Hugging Face 访问加速。

项目地址：[https://github.com/AinzRimuru/HuggingfaceProxy](https://github.com/AinzRimuru/HuggingfaceProxy)

## 核心功能

- **主站代理**：`hf.yourdomain.com` → `huggingface.co`
- **CDN 映射**：用 `---` 替换域名中的 `.`  
  例如：`cas-bridge---xethub.yourdomain.com` → `cas-bridge.xethub.hf.co`
- **重定向重写**：自动拦截 302 重定向，确保下载全程走代理
- **零配置**：自动识别域名，无需硬编码

## 工作原理

```
请求 → Cloudflare Workers → 解析子域名 → 转发到 HF → 重写重定向 → 返回
```

核心逻辑（`_worker.js`，约 100 行）：
1. 解析子域名，判断目标（主站/CDN）
2. 重写 URL，转发请求（`redirect: 'manual'`）
3. 拦截重定向响应，修改 `Location` 头

**为什么用 Cloudflare？**免费、快速、全球 CDN、零维护。

## 部署步骤

### 方法一：Cloudflare Pages（推荐）

1. Fork [项目](https://github.com/AinzRimuru/HuggingfaceProxy)
2. Cloudflare Dashboard → Workers & Pages → Pages → Connect to Git
3. 选择仓库，Framework 选 `None`，直接部署
4. 绑定域名，配置 DNS：

```
CNAME  hf   your-project.pages.dev
CNAME  *    your-project.pages.dev  (泛域名，支持 CDN)
```

### 方法二：Wrangler CLI

```bash
git clone https://github.com/AinzRimuru/HuggingfaceProxy.git
cd HuggingfaceProxy
npm install
npm run deploy
```

## 使用方法

**设置环境变量**：
```bash
export HF_ENDPOINT=https://hf.yourdomain.com
```

**Python**：
```python
import os
os.environ["HF_ENDPOINT"] = "https://hf.yourdomain.com"

from huggingface_hub import snapshot_download
snapshot_download(repo_id="gpt2")
```

**Git 克隆**：
```bash
git clone https://hf.yourdomain.com/username/repo.git
```

**浏览器**：直接访问 `https://hf.yourdomain.com`

## 常见问题

**Q: 522 错误？**  
等待 DNS 生效（5-10 分钟），清除缓存。

**Q: 下载失败？**  
检查泛域名解析 `*.yourdomain.com` 是否配置。

**Q: 大文件慢？**  
使用 `aria2c` 多线程下载，或升级 Workers Unbound。

**Q: 环境变量不生效？**  
在导入库**之前**设置 `HF_ENDPOINT`。

## 性能数据

- 免费版：10 万次/天，100MB 单次请求
- 实测速度提升：2-10 倍（取决于文件大小）

## 总结

100 行代码，利用 Cloudflare 免费 CDN，解决 Hugging Face 访问难题。项目完全开源，欢迎 Star。

项目地址：[https://github.com/AinzRimuru/HuggingfaceProxy](https://github.com/AinzRimuru/HuggingfaceProxy)