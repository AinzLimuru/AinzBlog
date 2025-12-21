---
title: Wallpaper Engine 搜索作者教程
date: 2025-12-10 22:24:09
description: 详细教程：如何在 Wallpaper Engine 创意工坊中通过作者名称找到其所有作品，包括通过 Steam ID 构建创意工坊链接的方法。
categories:
  - 技术分享
tags: 
  - Wallpaper Engine
  - Steam
  - 教程
cover: cover.jpg
---

## 前言

Wallpaper Engine 本身并不支持根据名称直接搜索作者，但我们可以通过作者的 Steam 账号编号来访问其创意工坊主页。本文将介绍如何通过作者名称找到其创意工坊。

<!-- more -->

## 操作步骤

### 方法一：从已知壁纸查找（可选）

如果你已经有该作者的某个壁纸，可以通过以下步骤快速找到：

#### 1. 打开壁纸详情页

在 Steam 创意工坊中打开任意一个该作者的壁纸。

![打开壁纸](打开壁纸.png)

#### 2. 进入作者的创意工坊

点击作者名称进入其创意工坊主页。

![进入作者的创意工坊](进入作者的创意工坊.png)

#### 3. 复制页面链接

复制浏览器顶部的链接地址备用。链接格式如下：

```
https://steamcommunity.com/profiles/********/myworkshopfiles/?appid=431960
```

![复制顶部链接](复制顶部链接.png)

> **提示**：如果你已经知道作者的 Steam ID，可以直接跳到第 6 步。

---

### 方法二：通过搜索作者名称

#### 4. 搜索 Steam 用户

访问 Steam 用户搜索页面，输入作者名称进行搜索：

🔗 [Steam 用户搜索](https://steamcommunity.com/search/users/?l=schinese)

找到目标用户后点击进入其个人主页。

#### 5. 获取用户 Steam ID

在用户主页中，点击"**查看账号主人装备的物品**"按钮（或访问积分商店相关页面）。

![查看账号装备](查看账号装备.png)

#### 6. 获取并构建创意工坊链接

新打开的页面 URL 中包含了该用户的 Steam ID，格式如下：

```
https://store.steampowered.com/points/profile/*********
```

其中星号部分是一串数字（Steam ID）。

将这串数字替换到以下模板链接中：

```
https://steamcommunity.com/profiles/[Steam_ID]/myworkshopfiles/?appid=431960
```

将 `[Steam_ID]` 替换为实际的数字即可。

---

## 完成

在浏览器中打开构建好的链接，即可访问该作者的 Wallpaper Engine 创意工坊主页，查看其所有作品。

---

## 小贴士

- 如果作者设置了隐私，可能无法查看其创意工坊内容
- 也可以通过浏览器插件来简化这个过程
- 收藏常用作者的创意工坊链接，方便下次访问