---
title: 解决高延迟场景中OpenVPN速度缓慢的问题
date: 2026-01-03T22:08:11.000Z
updated: 2026-01-03T15:08:39.000Z
cover: cover.png
tags:
  - 问题解决
  - 教程
  - 运维命令
  - 系统监控
  - 反向代理
  - Linux
  - OpenVPN
  - 网络优化
  - BBR
description: 针对高延迟场景下的OpenVPN速度缓慢问题，本文提供了全方位的性能调优方案。涵盖了强制UDP协议、计算并优化sndbuf/rcvbuf缓冲区、调整Linux内核sysctl参数以及启用BBR拥塞控制算法。此外还介绍了如何通过Nginx配置HTTP/3和QUIC缓冲区，以显著提升高延迟网络环境下的吞吐量和稳定性。
---
## 连接协议选择
强制使用 UDP，1% 丢包在 TCP 下会被放大为严重的延迟，而 UDP 下则基本无影响。
```
proto udp
```

## 增加缓冲区
根据实际延迟与最大带宽计算出合理的缓冲区大小，单位为字节。
如延迟为100ms，最大带宽为100Mbps，那么缓冲区大小应该为100ms * 100Mbps * 1000 / 8 = 1250000Bytes。对应的配置为：
```
sndbuf 1250000
rcvbuf 1250000
push "sndbuf 1250000"
push "rcvbuf 1250000"
```
上述值还可以适当调大。

## 增加服务器的TCP/UDP缓冲区大小
在`/etc/sysctl.conf`中添加以下内容：
```
# 增大内核 UDP 缓冲区限制，适配高带宽深管道（BDP）
net.core.rmem_max=16777216
net.core.wmem_max=16777216
net.core.rmem_default=16777216
net.core.wmem_default=16777216

# 启用 BBR 拥塞控制算法（对高延迟环境至关重要）
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
```

## 提高nginx的缓冲区大小
修改nginx的配置文件，添加/修改如下内容
```
http {
    server {
        listen 443 quic reuseport; # 启用 QUIC
        http3 on; # 启用 HTTP/3

        # 核心：增大单条 H3 流的缓冲区
        # 设为 12m 可以支撑 200ms 延迟下约 500Mbps 的理论吞吐量
        http3_stream_buffer_size 12m; # 增大单条 H3 流的缓冲区

        # 增大代理缓冲区
        proxy_buffers 16 1024k;
        proxy_busy_buffers_size 15360k;
    }
}
```