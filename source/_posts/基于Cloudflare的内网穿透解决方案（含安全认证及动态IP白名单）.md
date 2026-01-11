---
title: 基于Cloudflare的内网穿透解决方案（含安全认证及动态IP白名单）
date: 2026-01-11T21:29:43.000Z
updated: 2026-01-11T23:58:34.000Z
tags:
  - Cloudflare
  - 内网穿透
  - 网络安全
cover: cover.png
toc: true
description: 本文详细介绍了基于Cloudflare Zero Trust和Tunnel实现的内网穿透方案。通过配置Cloudflared隧道、Access安全认证以及利用Cloudflare Worker构建动态IP白名单，有效解决了传统穿透工具在安全性与易用性上的痛点，为内网资源提供企业级的防火墙保护与灵活的访问控制。
---
## 引言
目前，内网穿透的解决方案有很多，比如frp、ngrok等，但这些方案在安全性和易用性方面仍有提升空间。本文将介绍一种基于Cloudflare的内网穿透解决方案，结合安全认证和动态IP白名单机制，提升内网穿透服务的安全性和可靠性。
## 方案概述
本方案利用Cloudflare的Zero Trust（原Cloudflare Access）和Cloudflare Tunnel（原Argo Tunnel）功能，实现内网服务的安全访问。通过配置安全认证和基于Cloudfare Worker的动态IP白名单，确保只有授权用户能够访问内网资源，同时适配不支持认证的客户端。
## 前期准备
1. Cloudflare账号及域名
2. Docker环境（可选）
3. npm环境（用于部署Worker脚本）
## 详细步骤
### 1. 配置Cloudflare Tunnel
- 登录Cloudflare控制台，选择“Zero Trust”。

- 导航到“网络” > “连接器”

- 选择“创建隧道” > “选择Cloudflared” > 填入名称 > “保存隧道”。

- 启动隧道。网页会提供一段命令，复制并在内网服务器上执行以启动Cloudflared隧道。默认显示Windows，可以切换"Mac","Debian,"Red Hat","Docker"等系统。

- 特别提供docker compose方式启动隧道：
```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token <YOUR_TUNNEL_TOKEN>
```

- 选择“路由隧道”/“已发布应用程序路由”添加路由，填写子域名和内网服务地址（如`http://localhost:8080`）。注意不要经过nginx等代理，直接填写内网服务地址。
### 2. 配置Cloudflare Access安全认证
- 在Cloudflare控制台，导航到“Zero Trust” > “访问控制” > “应用程序” > “添加应用程序”。输入应用名称，添加公共主机名（即上一步配置的子域名）。

- 选择“创建新新策略”输入策略名称，操作选择“允许”，选择器类型选择“电子邮件”，输入允许访问的用户邮箱（可根据需要选择其他认证方式，不支持认证的客户端应用等后面介绍处理办法）。保存策略。

- 回到应用程序页面，选择现有策略，关联刚创建的策略。

- 现在，访问该子域名时会被重定向到Cloudflare的认证页面，只有通过认证的用户才能访问内网服务。

### 3. 配置动态IP白名单（可选）
#### 3.1 适用场景
- 如果应用程序不支持Cloudflare Access认证，或者频繁的认证不便，可以通过Cloudflare Worker实现动态IP白名单功能。

#### 3.2 部署项目
- 使用项目[cloudflare_dynamic_ip_list](https://github.com/AinzRimuru/cloudflare_dynamic_ip_list)来实现动态IP白名单功能。

- 克隆项目到本地
```bash
git clone https://github.com/AinzRimuru/cloudflare_dynamic_ip_list.git
```

- 创建KV Namespace用于维护IP的过期状态，运行以下命令创建KV命名空间，并记下返回的ID，填入`wrangler.toml`中的`[[kv_namespaces]]`部分的`id`字段：
```bash
wrangler kv namespace create IP_WHITELIST
```

- 创建List用于存储允许访问的IP地址: 打开`ZeroTrust` > `可重用组件` > `列表` > `创建列表`，名称无要求，创建后记下列表ID（点开List页面，在URL中可以看到ID，形如`********-****-****-****-************`）。将该ID填入`wrangler.toml`中的`[vars]`部分的`LIST_ID`字段。

- 获取ACCOUNT_ID: 打开`计算和AI` > `Workers和Pages`，在右边可以看到`Account Details`，记下`Account ID`，填入`wrangler.toml`中的`ACCOUNT_ID`字段。

- 配置允许的域名（可选）：如果配置了新域名，且希望仅允许该域名访问，可以在`wrangler.toml`中的`[vars]`部分的`ALLOWED_HOSTS`字段添加域名，多个域名用逗号分隔。如果不配置该字段，则允许所有域名访问。

- 部署Worker脚本：
```bash
npx wrangler login
npx wrangler deploy --config config/wrangler.toml
```

#### 3.3 配置白名单的Bypass策略
- 配置白名单Bypass路由：在Cloudflare控制台，导航到`Zero Trust` > `访问控制` > `策略`，创建新策略，名称自定义，操作选择`BYPASS`，选择器类型选择`IP List`, 值为刚创建的List名称。保存策略。

- 现在，将策略添加到刚刚创建的应用程序中，排名第1位。这样，IP在白名单中的请求将绕过认证直接访问内网服务。
#### 3.4 IP白名单的注册鉴权（Token方式）
- 选择`Zero Trust` > `访问控制` > `服务凭据` > `创建凭据`，输入名称，创建后记下`Client ID`和`Client Secret`。

- 新建应用程序，名称自定义，公共主机名填写Worker脚本的域名（如`your-worker.your-domain.com`）。

- 创建新策略，名称自定义，操作选择`SERVICE AUTH`，选择器类型选择`Service Token`，值为刚创建的服务凭据名称。保存策略。

- 回到Worker的应用程序页面，选择现有策略，关联刚创建的策略。

#### 3.5 IP白名单的注册鉴权（Email方式）
- 创建新策略，名称自定义，操作选择`Allow`，选择器类型选择`Emails`，值为允许注册的邮箱地址，可以添加多个邮箱。

- 保存策略后，回到Worker的应用程序页面，选择现有策略，关联刚创建的策略。

#### 3.6 使用说明
- 浏览器访问Worker脚本的域名，完成认证后，IP将被添加到白名单中，且在指定时间内有效。

- 对于不支持认证的客户端应用，可以选择使用自动化任务如（ios的快捷指令等）配置`CF-Access-Client-Id`和`CF-Access-Client-Secret`请求头，实现自动认证。