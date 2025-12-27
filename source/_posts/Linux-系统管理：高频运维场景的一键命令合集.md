---
title: Linux 系统管理：高频运维场景的一键命令合集
date: 2025-12-27T16:45:03.000Z
tags:
  - Linux
  - Docker
  - 磁盘管理
  - 问题解决
  - 教程
  - 运维命令
  - Kubernetes
  - 系统监控
description: 本文汇总了Linux系统运维中的高频一键命令，涵盖使用smartmontools查看硬盘SMART健康状态，以及在Docker、Containerd和Kubernetes环境下通过进程PID快速定位所属容器或Pod的实用技巧。适合系统管理员与DevOps工程师提升日常排错效率。
cover: cover.png
---
## 查看所有硬盘的SMART详细信息

### 依赖包安装

```bash
sudo apt install smartmontools
```
### 命令介绍

首先使用`lsblk`获取所有的存储设备，然后使用`grep`过滤出`sd`、`hd`、`nvme`、`vd`开头的设备，最后使用`xargs`和`smartctl`获取每个设备的SMART信息。
```bash
lsblk -d -o NAME | grep -E '^(sd|hd|nvme|vd)' | xargs -I {} sudo smartctl -a "/dev/{}"
```

## 查看所有硬盘的SMART详细信息（极简输出）
### 依赖包安装

```bash
sudo apt install smartmontools
```

### 命令介绍

流程同上
```bash
lsblk -d -o NAME | grep -E '^(sd|hd|nvme|vd)' | xargs -I {} sudo smartctl -H "/dev/{}"
```

## 定位进程所属容器/Pod

### 依赖包安装

定位pod需要crictl
```bash
sudo apt install crictl
```

### 命令介绍

#### Docker

首先使用`cat`和`grep`获取进程所属的cgroup，然后使用`docker ps`和`grep`获取容器ID。
```bash
docker ps | grep $(sudo cat /proc/<pid>/cgroup | grep -oP 'docker-\K[a-f0-9]+' | head -c 12)
```

#### ctr(containerd)

首先使用`cat`和`grep`获取进程所属的cgroup，然后选取包含pids的一行以去掉重复数据，直接从最后的信息中提取命名空间和容器名称。
```bash
sudo cat /proc/<pid>/cgroup | grep pids | awk -F'/' '{print $(NF-1), $NF}'
```

#### Kubernetes获取容器id

首先使用`cat`和`grep`获取进程所属的cgroup, 然后选取包含pids的一行以去掉重复数据，从行中解析最后一级的前12位。
```bash
sudo cat /proc/<pid>/cgroup | grep pids | awk -F'/' '{print substr($NF,1,12)}'
```

#### Kubernetes获取Pod名称

使用`crictl`根据容器ID获取Pod名称。其中容器ID为上一步获取到的12位ID。
```bash
crictl inspect -o go-template --template='{{index .status.labels "io.kubernetes.pod.name"}}' $(sudo cat /proc/<pid>/cgroup | grep pids | awk -F'/' '{print substr($NF,1,12)}')
```