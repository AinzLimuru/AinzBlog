---
title: Windows配置Claude Code代理（无额外依赖）
date: 2026-01-04T18:21:59.000Z
cover: cover.png
tags:
  - 问题解决
  - 教程
  - 网络优化
  - AI工具
  - Windows 11
  - Claude Code
  - 环境变量
  - 代理配置
description: 本文详细介绍了在 Windows 环境下为 Claude Code 配置网络代理的实操教程。通过修改 Claude 安装目录下的启动脚本并结合 TUN 模式，解决因网络环境导致的连接失败问题。无需额外依赖，步骤简单明了，涵盖 npm 安装、环境变量配置及代理生效测试，是开发者优化 Claude Code 使用体验的必备指南。
---
## 安装Claude Code (已安装的自行跳过)

1. [官网](https://claude.com/product/claude-code)的PowerShell一键安装`irm https://claude.ai/install.ps1 | iex`(我没成功，安装目录是空的)
2. npm安装`npm install -g @anthropic-ai/claude-code`

## 配置代理

1. 打开新PowerShell
2. 查看`claude`安装位置`whereis claude`
3. 输出的路径可能是`/cygdrive/c/...`，去掉`/cygdrive/c`,使用`%HOMEDRIVE%/`拼接后面的内容
4. 在资源管理器的路径中输入修改后的内容回车，选择用记事本/VSCode打开输出目录中的`claude`文件
5. 在`#!/bin/sh`下面追加
`export HTTP_PROXY="http://<ip>:<port>";export HTTPS_PROXY="http://<ip>:<port>"`
修改后的文件如下所示：
```bash
#!/bin/sh
export HTTP_PROXY="http://<ip>:<port>"; # 这两行是新增的(替换为你的代理ip和端口)
export HTTPS_PROXY="http://<ip>:<port>"; # 这两行是新增的(替换为你的代理ip和端口)
basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")
...
```
6. 保存文件
7. 开启代理工具（v2rayN）的TUN模式（上面的工作不做，只开启这个也不好使）
8. 重新打开PowerShell，输入`claude`测试，如果一切顺利，可以开始登录。