---
title: Windbg'la Rootkit Dinamik Analizi Gerçekleştirme
date: 2025-02-02
authors:
  - name: 0xbekoo
    link: https://github.com/0xbekoo
    image: https://github.com/0xbekoo.png
tags:
  - Reverse-Engineering
  - Windows-kernel
  - Rootkit
  - Windbg
  - Dynamic-Analysis

excludeSearch: true
---

Merhabalar efenimmm hayat karartan yeni bir bloga hoşgeldiniz. Bu blogta Windbg kullanarak bir rootkit'in dinamik analizini nasıl gerçekleştirebiliriz buna göz atacağız.

Bu blogta analiz sürecimizde benim tarafından kodlanan [Malware Resurrection](https://0xbekoo.github.io/docs/malware-resurrection) projemi ele alacağım. Eğer dökümana göz attıysanız projede User-mode ve Kernel-mode olmak üzere iki kısımdan da yararlandığımı görmüşsünüzdür. Kernel-mode alanı için yazdığım .sys dosyasını bu blogta beraber analiz ederek, projenin arka planda neler yaptığına canlı bir şekilde bir malware analizcisi gibi göz atacağız. 


