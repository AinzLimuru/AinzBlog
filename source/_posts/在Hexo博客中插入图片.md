---
title: 在Hexo博客中插入图片
date: 2025-12-04T15:53:49.000Z
description: 本文详细介绍了在Hexo博客中插入图片的两种核心方法：通过source/images目录统一管理及启用post_asset_folder实现资源文件夹管理。同时针对图片路径解析失败、无法加载等常见BUG，提供了修改_config.yml配置文件的解决方案，确保Markdown图片在Hexo中正确渲染。
categories:
  - 技术分享
tags:
  - 博客教程
  - Markdown
  - 问题解决
  - Hexo
  - 图片配置
  - 静态博客
cover: cover.png
---
## 在Hexo博客中插入图片

在Hexo博客中插入图片非常简单,可以选择以下两种方式：



1. 直接在将所有的图片放在`source/images/`目录下，然后在Markdown文件中通过相对路径引用图片。

```markdown

![图片描述](/images/your-image.png)

```



2. 使用Hexo的`post_asset_folder`功能，将图片与文章放在同一目录下。首先在Hexo配置文件`_config.yml`中启用`post_asset_folder`选项：

```yaml

post_asset_folder: true

```

然后在创建新文章时，Hexo会自动为该文章创建一个同名的文件夹，将图片放在该文件夹中。引用图片时，可以使用相对路径：

```markdown

![图片描述](your-image.png)

```

这样，图片就会正确显示在你的Hexo博客文章中。



## 注意事项

部分项目会出现图片无法加载的情况，检查后会发现尝试从根目录加载图片，这时需要在Hexo配置文件中添加以下配置，确保图片路径正确解析。



在`_config.yml`中添加：

```yaml

marked:

  prependRoot: true

  postAsset: true

```

这样可以确保Hexo在渲染Markdown时正确处理图片路径，避免加载失败的问题。