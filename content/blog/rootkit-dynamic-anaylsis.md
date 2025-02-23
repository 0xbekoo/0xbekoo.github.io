---
title: Windbg'la Rootkit için Dinamik Analiz Gerçekleştirme
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

draft: true
---

Merhabalar efenimmm hayat karartan yeni bir bloga hoşgeldiniz. Bu blogta Windbg kullanarak bir rootkit'in dinamik analizini nasıl gerçekleştirebiliriz buna göz atacağız.

Bu analiz sürecimizde benim tarafından kodlanan [Malware Resurrection](https://0xbekoo.github.io/docs/malware-dev/malware-resurrection/) rootkit'i ele alacağım. Eğer dökümana göz attıysanız projede User-mode ve Kernel-mode olmak üzere iki kısımdan da yararlandığımı görmüşsünüzdür. Kernel-mode alanı için yazdığım .sys dosyası büyük ölçüde rootkit tekniklerinden yararlandığı için bu blogta beraber analiz ederek, projenin arka planda neler yaptığına canlı bir şekilde göz atacağız. 

## **Sürücülerin Yüklenme Süreci**

Analizlerimize başlamadan önce bir sürücünün sisteme nasıl yüklendiğini anlamamız gerekiyor.

![](../../../images/posts/root-dynamic-analysis/diagram.png)

ntoskrnl.exe'den bir sürücünün yüklenme işlemi **NtLoadDriver** ile başlar. NtLoadDriver, registry yolunda belirtilen DriverServiceName'i kullanarak bir sürücü oluşturan bir rutindir. Bu rutinin başlamasıyla akış **IopLoadDriverImage** ile devam eder. IopLoadDriverImage'dan sonra akış IopLoadDriver'a aktarılmasıyla artık bir sürücünün oluşturulması gibi önemli adımlar burada başlanıyor. 

Akışın IopLoadDriver ile devam etmesiyle IopLoadDriver tarafından **MmLoadSystemImageEx** çağırılır. Asıl büyünün gerçekleştiği kısım bu fonksiyonun içerisidir çünkü bir sürücünün yüklenmesi MmLoadSystemImageEx tarafından gerçekleştirilir.

MmLoadSystemImageEx fonksiyonu sadece bir sürücüyü çalıştırmaktan sorumlu değildir. Yüklemeden önce bu fonksiyon sürücünün doğru bir şekilde sistem belleğine yüklenmesi ve gerekli tüm yapıların doğru bir şekilde yapılandırılmasından da sorumludur. Örneğin sürücünün yüklenmesinden sonra PsLoadedModuleList adlı global yapıda **KLDR_DATA_TABLE_ENTRY** kullanarak sürücüyü saklaması gibi. 

Sürücünün yüklenmesiyle IopLoadDriver içerisinde yüklenilen sürücünün bilgilerini elde edebilecek fonksiyonlardan yararlanabiliriz. Örneğin **PnpCallDriverEntry** ile yüklenilen sürücünün başlangıç adresini elde etmemiz gibi. 

## **Analizin Gerçekleştirilmesi**

Rootkit'i analiz etmek için öncelikle yüklenilen sürücünün başlangıç adresini elde ederek başlamamız gerekecek.

Şimdi elimizdeki rootkit'i sisteme yüklemeden önce Windbg ile **IopLoadDriver**'a bir breakpoint koyabiliriz. Bu adımdan sonra sürücümüzü çalıştırdığımızda bp tetiklenecektir:

```
0: kd> bp nt!IopLoadDriver
0: kd> g
Breakpoint 0 hit
nt!IopLoadDriver:
fffff804`0ab37dd0 48895c2410      mov     qword ptr [rsp+10h],rbx
```

![](../../../images/posts/root-dynamic-analysis/img1.png)

CallStack'e göz attığımızda IopLoadDriver tarafından MmLoadSystemImageEx çağırıldığını görebiliriz.


Şimdi ilk amacımız sürücünün yüklenmesinden sonra başlangıç adresini elde etmek. Başlangıç adresini elde etmek için birçok yöntem bulunuyor. Bunlardan bir kaçını ayrı başlıklarla sıralayacağım.

### **NT_HEADERS64 ile Başlangıç Adresini Bulma**

NT_HEADERS64 yapısı içerisinde 

NT_HEADERS64 yapısı ile yüklenilen sürücünün başlangıç adresini elde edebiliriz.

IopLoadDriver'ı kontrol edersek, MmLoadSystemImage çağırılması ardından **RtlImageNtHeader** çağırıldığını görebiliriz:

```
kd> uf @rip

...

nt!IopLoadDriver+0x1d6:
...
fffff804`0ab37fe8 488d4598        lea     rax,[rbp-68h]
fffff804`0ab37fec 4533c9          xor     r9d,r9d
fffff804`0ab37fef 4889442428      mov     qword ptr [rsp+28h],rax
fffff804`0ab37ff4 488d4c2458      lea     rcx,[rsp+58h]
fffff804`0ab37ff9 488d45b0        lea     rax,[rbp-50h]
fffff804`0ab37ffd 4533c0          xor     r8d,r8d
fffff804`0ab38000 33d2            xor     edx,edx
fffff804`0ab38002 4889442420      mov     qword ptr [rsp+20h],rax
fffff804`0ab38007 e8d4cb0100      call    nt!MmLoadSystemImage (fffff804`0ab54be0)
fffff804`0ab3800c 448bf0          mov     r14d,eax
fffff804`0ab3800f 85c0            test    eax,eax
fffff804`0ab38011 0f886f040000    js      nt!IopLoadDriver+0x6b6 (fffff804`0ab38486)  Branch

nt!IopLoadDriver+0x247:
fffff804`0ab38017 488b4d98        mov     rcx,qword ptr [rbp-68h]
fffff804`0ab3801b e820f2b5ff      call    nt!RtlImageNtHeader (fffff804`0a697240)
...
```

Burada elde edilen adresle NT_HEADERS_64 yapısından **OptionalHeader.AddressOfEntryPoint** altından sürücünün başlangıç offsetine ulaşabiliriz:

![](../../../images/posts/root-dynamic-analysis/img2.png)

Şimdi ise aldığımız değer ile adrese göz atalım:

![](../../../images/posts/root-dynamic-analysis/img3.png)

Yüklenilen sürücünün başlangıç adresiyle hesapladığımızda yüklenilen Resurrection sürücünün **FxDriverEntry** adresine işaret ettiğini görebiliriz. 

### **PnpCallDriverEntry ile Başlangıç Adresini Bulma**

Bir diğer yöntem ise yukarıda bahsettiğim PnpCallDriverEntry fonksiyonundan yararlanmak olacaktır.

Eğer IopLoadDriver fonksiyonuna göz atarsanız PnpCallDriverEntry fonksiyonunu çağırdığını göreceksiniz:

```
kd> uf @rip

...

nt!IopLoadDriver+0x4c3:
...
fffff804`0ab382aa 488bd7          mov     rdx,rdi
fffff804`0ab382ad 498bcf          mov     rcx,r15
fffff804`0ab382b0 e8f33d0300      call    nt!PnpCallDriverEntry (fffff804`0ab6c0a8)
fffff804`0ab382b5 448bf0          mov     r14d,eax
fffff804`0ab382b8 85c0            test    eax,eax
fffff804`0ab382ba 7815            js      nt!IopLoadDriver+0x501 (fffff804`0ab382d1)
```

Bu kısma bir bp koyalım ve ardından PnpCallDriverEntry içerisine bir göz atalım:

![](../../../images/posts/root-dynamic-analysis/img4.png)

Bu rutinin ilk kısımlarına göz attığımızda gözümüze çarpan **guard_dispatch_icall** olabilir. Bu rutine de göz atalım:

```
kd> uf nt!guard_dispatch_icall
...
nt!guard_dispatch_icall+0x6e:
fffff804`0a805fae 0faee8          lfence
fffff804`0a805fb1 ffe0            jmp     rax
```

Eğer bu rutinin kodlarına göz atarsak rax'ın adresine jmp edildiği bir instruction'a denk geleceğiz. Sanırım anahtarımızı bulduk, değil mi? Hadi bir göz atalım:

![](../../../images/posts/root-dynamic-analysis/img5.png)

Böylece başlangıç adrese erişmiş olduk

Artık bu kısımdan sonra analiz için yapabileceğimiz birçok yol bulunmakta. Farklı bir rootkit analiz ediyorsanız amacınıza göre devam edebilirsiniz. 




## **References**

- [revers.engineering - Hiding Drivers on Windows 10](https://revers.engineering/hiding-drivers-on-windows-10/)

- [André Lima - Starting dynamic analysis on a Windows x64 rootkit](https://medium.com/@0x4ndr3/starting-dynamic-analysis-on-a-windows-x64-rootkit-8c7a74871fda)
