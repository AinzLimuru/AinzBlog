---
title: 基于Cloudflare的内网穿透解决方案（含安全认证及动态IP白名单）
date: 2026-01-11T21:29:43.000Z
updated: 2026-01-13T22:54:27.000Z
tags:
  - Cloudflare
  - 内网穿透
  - 网络安全
cover: cover.png
toc: true
description: 本文详细介绍了基于Cloudflare Zero Trust和Tunnel实现的内网穿透方案。通过配置Cloudflared隧道、Access安全认证以及利用Cloudflare Worker构建动态IP白名单，有效解决了传统穿透工具在安全性与易用性上的痛点，为内网资源提供企业级的防火墙保护与灵活的访问控制。
---

## 引言

目前，内网穿透的解决方案有很多，比如 frp、ngrok 等，但这些方案在安全性和易用性方面仍有提升空间。

本文将介绍一种基于 Cloudflare 的内网穿透解决方案，结合安全认证和动态 IP 白名单机制，提升内网穿透服务的安全性和可靠性。

## 方案概述

本方案利用 Cloudflare 的 **Zero Trust**（原 Cloudflare Access）和 **Cloudflare Tunnel**（原 Argo Tunnel）功能，实现内网服务的安全访问。

通过配置安全认证和基于 Cloudflare Worker 的动态 IP 白名单，确保只有授权用户能够访问内网资源，同时适配不支持认证的客户端。

## 前期准备

- Cloudflare 账号及域名
- Docker 环境（可选）
- npm 环境（用于部署 Worker 脚本）

---

## 一、配置 Cloudflare Tunnel

### 1. 创建隧道

1. 登录 Cloudflare 控制台，选择 **Zero Trust**
2. 导航到 **网络** > **连接器**
3. 选择 **创建隧道** > **选择 Cloudflared** > 填入名称 > **保存隧道**

### 2. 启动隧道

网页会提供一段启动命令，复制并在内网服务器上执行。默认显示 Windows，可切换至 Mac、Debian、Red Hat、Docker 等系统。

**Docker Compose 方式：**

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token <YOUR_TUNNEL_TOKEN>
```

### 3. 配置路由

选择 **路由隧道**/**已发布应用程序路由** 添加路由，填写子域名和内网服务地址（如 `http://localhost:8080`）。

> **注意：** 直接填写内网服务地址，不要经过 nginx 等代理。

---

## 二、配置 Cloudflare Access 安全认证

### 1. 创建应用程序

1. 导航到 **Zero Trust** > **访问控制** > **应用程序** > **添加应用程序**
2. 输入应用名称
3. 添加公共主机名（即上一步配置的子域名）

### 2. 创建访问策略

1. 选择 **创建新策略**，输入策略名称
2. 操作选择 **允许**
3. 选择器类型选择 **电子邮件**
4. 输入允许访问的用户邮箱（可根据需要选择其他认证方式）
5. 保存策略

> **提示：** 不支持认证的客户端应用的处理办法将在后续章节介绍。

### 3. 关联策略

回到应用程序页面，选择现有策略，关联刚创建的策略。

完成配置后，访问该子域名时会被重定向到 Cloudflare 的认证页面，只有通过认证的用户才能访问内网服务。

---

## 三、配置动态 IP 白名单（可选）

### 3.1 适用场景

如果应用程序不支持 Cloudflare Access 认证，或者频繁认证不便，可以通过 Cloudflare Worker 实现动态 IP 白名单功能。

### 3.2 部署项目

使用项目 [cloudflare_dynamic_ip_list](https://github.com/AinzRimuru/cloudflare_dynamic_ip_list) 来实现动态 IP 白名单功能。

#### 3.2.1 克隆项目

```bash
git clone https://github.com/AinzRimuru/cloudflare_dynamic_ip_list.git
```

#### 3.2.2 创建 KV Namespace

运行以下命令创建 KV 命名空间，用于维护 IP 的过期状态：

```bash
wrangler kv namespace create IP_WHITELIST
```

记下返回的 ID，填入 `wrangler.toml` 中 `[[kv_namespaces]]` 部分的 `id` 字段。

#### 3.2.3 创建 IP 列表

1. 打开 **Zero Trust** > **可重用组件** > **列表** > **创建列表**
2. 创建后记下列表 ID（点开 List 页面，在 URL 中可以看到 ID，形如 `********-****-****-****-************`）
3. 将该 ID 填入 `wrangler.toml` 中 `[vars]` 部分的 `LIST_ID` 字段

#### 3.2.4 获取 Account ID

1. 打开 **计算和 AI** > **Workers 和 Pages**
2. 在右边可以看到 **Account Details**
3. 记下 **Account ID**，填入 `wrangler.toml` 中的 `ACCOUNT_ID` 字段

#### 3.2.5 配置允许的域名（可选）

如果配置了新域名，且希望仅允许该域名访问，可以在 `wrangler.toml` 中 `[vars]` 部分的 `ALLOWED_HOSTS` 字段添加域名，多个域名用逗号分隔。

如果不配置该字段，则允许所有域名访问。

#### 3.2.6 部署 Worker 脚本

```bash
npx wrangler login
npx wrangler deploy --config config/wrangler.toml
```

### 3.3 配置白名单的 Bypass 策略

1. 在 Cloudflare 控制台，导航到 **Zero Trust** > **访问控制** > **策略**
2. 创建新策略，名称自定义
3. 操作选择 **BYPASS**
4. 选择器类型选择 **IP List**，值为刚创建的 List 名称
5. 保存策略

**关联策略：** 将策略添加到刚刚创建的应用程序中，排名第 1 位。这样，IP 在白名单中的请求将绕过认证直接访问内网服务。

### 3.4 IP 白名单的注册鉴权（Token 方式）

#### 3.4.1 创建服务凭据

1. 选择 **Zero Trust** > **访问控制** > **服务凭据** > **创建凭据**
2. 输入名称，创建后记下 **Client ID** 和 **Client Secret**

#### 3.4.2 创建 Worker 应用程序

1. 新建应用程序，名称自定义
2. 公共主机名填写 Worker 脚本的域名（如 `your-worker.your-domain.com`）

#### 3.4.3 创建 SERVICE AUTH 策略

1. 创建新策略，名称自定义
2. 操作选择 **SERVICE AUTH**
3. 选择器类型选择 **Service Token**，值为刚创建的服务凭据名称
4. 保存策略

#### 3.4.4 关联策略

回到 Worker 的应用程序页面，选择现有策略，关联刚创建的策略。

### 3.5 IP 白名单的注册鉴权（Email 方式）

1. 创建新策略，名称自定义
2. 操作选择 **Allow**
3. 选择器类型选择 **Emails**，值为允许注册的邮箱地址（可添加多个）
4. 保存策略后，回到 Worker 的应用程序页面，关联刚创建的策略

### 3.6 使用说明

- 浏览器访问 Worker 脚本的域名，完成认证后，IP 将被添加到白名单中，且在指定时间内有效。

- 对于不支持认证的客户端应用，可使用自动化任务（如 iOS 的快捷指令等）配置 `CF-Access-Client-Id` 和 `CF-Access-Client-Secret` 请求头，实现自动认证。

  > **注意：** 自动化任务可能无法指定请求时的 IPv4/IPv6 地址，因此可以尝试重复请求多次以确保 IPv4 和 IPv6 地址均被添加到白名单中。
