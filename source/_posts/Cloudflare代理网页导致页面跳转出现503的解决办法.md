---
title: Cloudflare代理网页导致页面跳转出现503的解决办法
date: 2026-01-05T22:35:22.000Z
tags:
  - Cloudflare
  - CDN加速
  - 问题解决
  - 博客优化
  - 网络优化
  - Speed Brain
  - 503错误
  - 网页预加载
description: 解决Cloudflare代理网页时出现503错误及cf-speculation-refused响应头的问题。本文深入分析了Cloudflare Speed Brain智能加速功能导致的prefetch请求失败原因，并提供了关闭该功能以消除503报错的详细步骤，适合使用Cloudflare进行CDN加速和网站优化的开发者参考。
---
## TL;DR
不用处理
## 问题分析
Cloudflare代理网页时，如果页面跳转出现503并且对应的是prefetch的请求，那么该错误极大可能是因为Cloudflare的Speed Brain智能加速功能导致的。该加速功能会默认启用，通过在html中添加各种header来提示浏览器预加载页面，但这些加载请求不会被转发到源服务器，如果Cloudflare没有缓存相关的页面或资源，那么就会返回503错误，并伴随着一个响应头`cf-speculation-refused: prefetch refused: not eligible`。而当你回到跳转前的页面再次尝试跳转时，这个503的请求就不见了，因为Cloudflare已经缓存了这个页面，能够正常命中缓存。
## 解决办法
虽然这个报错不会影响到用户，但是如果执意要处理，那么可以禁用Cloudflare的Speed Brain智能加速功能。
入口在域名管理页面的"速度">"设置">"内容优化"