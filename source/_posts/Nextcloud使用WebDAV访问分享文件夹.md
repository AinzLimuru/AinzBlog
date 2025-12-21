---
title: Nextcloud使用WebDAV访问分享文件夹
date: 2025-12-21 21:22:27
description: 介绍如何通过 WebDAV 协议访问 Nextcloud 分享文件夹，包括 URL 格式、用户名密码设置及 Windows 映射网络驱动器方法。
tags: 
  - Nextcloud
  - WebDAV
categories: 
  - 技术分享
cover: cover.png
---
## 1. 新建分享链接
在 Nextcloud 网页端，选择需要分享的文件夹，创建共享链接可以以生成一个形如`https://*****/s/AaaAABbbBBCccCCC`的链接。其中`*****`为你的 Nextcloud 服务器地址，`AaaAABbbBBCccCCC`为分享链接的唯一标识符。
## 2. 配置访问密码（可选）
在分享链接的设置中，可以选择在“自定义权限”中设置访问密码，以保护共享内容的安全。
## 3. 使用 WebDAV 访问分享文件夹
WebDAV 访问分享文件夹的URL为`https://*****/public.php/webdav`。用户名为1中生成的分享链接的唯一标识符`AaaAABbbBBCccCCC`，密码为2中设置的访问密码（如果有设置）。
### 4 在文件管理器中访问
以 Windows11 为例，可以在此电脑右键选择“映射网络驱动器”，在文件夹栏中输入 WebDAV URL，并使用上述的用户名和密码进行连接。
