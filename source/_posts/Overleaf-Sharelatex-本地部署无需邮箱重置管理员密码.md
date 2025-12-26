---
title: Overleaf(Sharelatex)本地部署无需邮箱重置管理员密码
date: 2025-12-26T23:40:39.000Z
tags:
  - 教程
  - 问题解决
  - Linux
  - Overleaf
  - Docker
  - ShareLaTeX
description: 本文介绍如何在Overleaf（ShareLaTeX）本地部署环境下，通过Docker日志直接获取重置链接来修改管理员密码。该方法解决了因未配置邮件服务（SMTP）而无法通过邮箱找回密码的问题，涵盖了日志提取、链接解析及域名替换等实操步骤。
cover: cover.png
---
# 概述
通过从Overleaf的日志中获取重置密码的链接并重置密码，实现无需邮箱重置管理员密码。
# 尝试发送重置密码邮件
在登录界面点击`Forgot your password?`，然后输入邮箱地址，点击`Reset password`。
# 获取重置密码链接
运行下面的语句从Overleaf的log中获取重置密码的链接：
```bash
docker exec <container_name> bash -c "cd /var/log/overleaf/ && cat web.log" | grep -oP 'https?://[^\\]+' | grep password
```
# 替换域名（可选）
在没有设置Overleaf的域名时，重置密码的链接会包含`localhost`，需要替换为实际的域名。
# 重置密码
打开获取到的重置密码链接，然后输入新密码，点击`Set new password`。