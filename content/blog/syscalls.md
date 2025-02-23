---
title: Windows Kernel'da Syscall Araştırma Yolculuğum
date: 2024-12-31
authors:
  - name: 0xbekoo
    link: https://github.com/0xbekoo
    image: https://github.com/0xbekoo.png
tags:
  - Reverse-Engineering
  - Syscall
  - Windows-kernel

excludeSearch: true
---

## **Giriş**

Merhabalar efenimm. Syscall yolcuğuluma hoşgeldiniz.


Birkaç gün önce SSDT tablosu üzerine bir [döküman](https://0xbekoo.github.io/docs/winkernel-dev/wkd-ssdt/) paylaşmıştım. Bu dökümanda temel olarak SSDT'nin ne olduğunu, adreslerin nasıl hesaplandığı vs anlatmıştım. Dökümanın son kısmında ise öğrendiğimiz şeylerin bir kernel sürücüsünü hazırlamıştık.

Ancak SSDT için bu dökümanı hazırladıktan sonra SSDT için bu bilgiler benim için yetersiz gelmişti. Eğer benim gibi bir konunun derinine inmeye meraklı iseniz benimle kalın. Çünkü Windows Kernel'da Syscall'ların nasıl işlendiğini vs. yakından göreceğiz; Hem statik analiz hem de dinamik analizle!

Bu blogta, temel bilgiler olan NTAPI'ların ne olduğu ve syscall'ın nasıl işlendiği vs. gibi konulara yer vermeyeceğim. Zira [**NTAPI Injection**](https://0xbekoo.github.io/docs/malware-dev/ntapi-injection/) dökümanında NTAPI'in ne olduğunu, [**Direct Systemcalls**](https://0xbekoo.github.io/docs/malware-dev/direct-syscalls) dökümanında bir syscall'ın nasıl işlendiğini ve  temel olarak [**SSDT**](https://0xbekoo.github.io/docs/winkernel-dev/wkd-ssdt/) dökümanında SSDT ve kernel'da syscall'ın nasıl işlendiğini daha önceden anlattım. Eğer temel şeylerle öğrenmeye başlayacaksınız bu dökümanlardan başlamak sizin için daha iyi olacaktır. Bu blogta nihai amacımız kernel alanında bir syscall'ın nasıl işlendiğini detaylı bir şekilde görmek olacak.


## **Statik Analiz**

Bir syscall işlendiğinde, ntdll.dll'den syscall yapıldığında kernel alanına geçişte ilk durağın KiSystemCall64 olduğunu biliyoruz. Statik olarak analizimizi buradan başlayacağız. IDA ortamında ntoskrnl.exe analiz etmekle başlayalım. 

### **KiSystemServiceUser**

**KiSystemCall64/KiSystemCall64Shadow** kodlarına göz attığınızda akışın **KiSystemServiceUser**'a doğru yönlendiğini göreceksiniz:

![](../../../images/posts/syscall-journey/img1.png)

**KiSystemServiceUser**'da syscall'ın işlenmesi için hazırlıklar yapılıyor:

![](../../../images/posts/syscall-journey/img2.png)

Burada odağımızı ```mov rbx,gs:188h``` kısmına çevirmemiz gerekiyor çünkü önemli bir yapı olan _KPCR yapısı içerisinden bir KTHREAD yapısı alınmakta. 

Bu yapının ne olduğunu anlamak için [Geoff Chappell, Software Analyst](https://www.geoffchappell.com/studies/windows/km/ntoskrnl/inc/ntos/amd64_x/kpcr.htm)'ın açıklamasından yararlanabiliriz:

> "KPCR yapısı, **Kernel Processor Control Region** anlamına gelir. Kernel, her mantıksal işlemci için bir KPCR yapısı tutar. KPCR, işlemci mimarisine son derece özeldir."

Yani kısaca aklımızda şöyle kalabilir bu yapıda işlemciye özel verileri saklamak için kullanılır. Yani baya önemli bir yapı. 

x64 sistemlerde KPCR yapısı, gs:0 alanına işaret eder:

```
kd> dt nt!_KPCR
   +0x000 NtTib            : _NT_TIB
   +0x000 GdtBase          : Ptr64 _KGDTENTRY64
   +0x008 TssBase          : Ptr64 _KTSS64
   +0x010 UserRsp          : Uint8B
   +0x018 Self             : Ptr64 _KPCR
   +0x020 CurrentPrcb      : Ptr64 _KPRCB
   +0x028 LockArray        : Ptr64 _KSPIN_LOCK_QUEUE
   +0x030 Used_Self        : Ptr64 Void
   +0x038 IdtBase          : Ptr64 _KIDTENTRY64
   +0x040 Unused           : [2] Uint8B
   +0x050 Irql             : UChar
   +0x051 SecondLevelCacheAssociativity : UChar
   +0x052 ObsoleteNumber   : UChar
   +0x053 Fill0            : UChar
   +0x054 Unused0          : [3] Uint4B
   +0x060 MajorVersion     : Uint2B
   +0x062 MinorVersion     : Uint2B
   +0x064 StallScaleFactor : Uint4B
   +0x068 Unused1          : [3] Ptr64 Void
   +0x080 KernelReserved   : [15] Uint4B
   +0x0bc SecondLevelCacheSize : Uint4B
   +0x0c0 HalReserved      : [16] Uint4B
   +0x100 Unused2          : Uint4B
   +0x108 KdVersionBlock   : Ptr64 Void
   +0x110 Unused3          : Ptr64 Void
   +0x118 PcrAlign1        : [24] Uint4B
   +0x180 Prcb             : _KPRCB
```

Şimdi odağımızı çevirdiğimiz koda baktığımızda ilk olarak **gs:188** işaret edilen bölüm alınmakta. Windbg'dan elde ettiğimiz çıktı ile KPCR yapıya baktığımızda bu kısmın **0x180 Prcb _KPRCB** alanından bir bölüme işaret ettiğini anlayabiliriz:

```
dt nt!_KPRCB
   +0x000 MxCsr            : Uint4B
   +0x004 LegacyNumber     : UChar
   +0x005 ReservedMustBeZero : UChar
   +0x006 InterruptRequest : UChar
   +0x007 IdleHalt         : UChar
   +0x008 CurrentThread    : Ptr64 _KTHREAD
```
```gs:188h``` olduğu için KRPCB yapısından KTHREAD yapısına işaret eden **+0x008 CurrentThread** alınmakta. **KTHREAD** yapısının ne olduğunu anlamak için yine [Geoff Chappell](https://www.geoffchappell.com/studies/windows/km/ntoskrnl/inc/ntos/ke/kthread/index.htm)'in makalesinden yararlanabiliriz:

> "KTHREAD yapısı, ETHREAD yapısının çekirdek kısmıdır. ETHREAD, Nesne Yöneticisi (Object Manager) aracılığıyla sunulan iş parçacığı nesnesidir. KTHREAD ise bunun temel çekirdeğini oluşturur."

Yani bildiğimiz ETHREAD yapısının kernel versiyonu. Thread yürütme/yönetimi için Kernel tarafından ihtiyaç duyulan birçok önemli bilgiyi içeriyor bu yapı. Bunlardan biri de bu yapıda TEB'in adresi bulunmasıdır:

```
kd> dt nt!_KTHREAD
...
   +0x080 SystemCallNumber : Uint4B
   +0x084 ReadyTime        : Uint4B
   +0x088 FirstArgument    : Ptr64
...
   +0x0f0 Teb              : Ptr64 Void
```

**KiSystemServiceUser**'ın son kısımlarında ise KTHREAD yapısından **SystemCallNumber** ve **FirstArgument** bayrakların ayarlandığını görebiliriz:

![](../../../images/posts/syscall-journey/img3.png)

Bundan sonra akış **KiSystemServiceStart**'a yönlendiriliyor. 

### Syscall Numarasının Belirlenmesi: **KiSystemServiceStart**

Yapılan syscall'ın ilk temelleri burada atılmaya başlanıyor.

Bir syscall yapıldığında, içerdiği syscall index'le beraber **Table Identifier** bilgisi de içermektedir. Kafanız karışmaması için bunu bir fotoğraf üzerinden anlatayım:

![](../../../images/posts/syscall-journey/byte-diagram.png)

Bitler sağdan sola okunduğundan 0 ila 11 bit System Call Index'ın bitini barındırır. 12 ila 13 bit arası ise Table Identifier'ın biti barındırır. Bundan sonraki bitler kullanılmaz. Şimdi ki durağımız olan **KiSystemServiceStart** tam da bu konuyla alakalı:

![](../../../images/posts/syscall-journey/img4.png)

Şimdi kafanızda daha iyi oturması için bir senaryo oluşturalım. Diyelim ki ntdll.dll'den NtOpenProcess için syscall yapıldı. Bu senaryoda Syscall'ın yapılmasını şöyle düşünmenizi istiyorum: içi beyaz sünger dolu kutu gibi düşünmenizi istiyorum.

Diyelim ki biri tarafından içinde iki tane hediye olan bu kutuyu aldınız. İçini açtığınızda en üstünde gereksiz beyaz sünger olduğunu gördüğünüz. Beyaz süngerin altında ise iki tane hediye bulunmakta. Normal bir insan gibi  üsteki süngerleri kaldırır ve altında duran hediyeleri alırız demi? 

Syscall çağırısı kernel alanından KiSystemServiceStart'a ulaştıktan sonra KiSystemServiceStart fonksiyonu aynen bunu yapıyor. Bu gereksiz süngerleri (kabaca kullanılmayan bitleri) kaldırıyor ve ilk olarak birinci eşyayı (Table Identifier) ve ikinci eşyayı (System Call Index) alıyor.

Bu örnekten sonra fonksiyona tekrar göz atalım:

![](../../../images/posts/syscall-journey/img5.png)

Örneğimizde NtOpenProcess'i söylemiştim. NtOpenProcess'in ssn numarası **0x26**'dır. Yani bu kısımda eax'ın 26h değeri barındırdığını düşünürsek:

```asm
mov edi,eax     ; eax = 0x26 (0010 0110)
shl edi,7
```

Burada yapılan işlem tam olarak aşağıda gösterildiği gibidir:

![](../../../images/posts/syscall-journey/img6.png)

Yani 7 bit sağ kaydırmadan sonra elde ettiğimiz değer tamamen 0 oluyor ve edi register'ı 0x0 değeri almış olur. Gereksiz bitleri kaldırdığımıza göre Table Identifier'ı alalım:

```
and edi,20h     ; edi = 0x20 (1000 00)
```

Burada yapılan işlem tam olarak aşağıda gösterildiği gibidir:

![](../../../images/posts/syscall-journey/img7.png)

Yani NtOpenProcess için alacağımız Table Identifier'ın sonucu 0x0 olacaktır.

Fakat bu durum her zaman böyle değildir. SSN numarası eğer 1000h ile 1FFFh arasındaysa Table Identifier değeri 0x20 olacaktır. Bu API'lar Windows GUI ile ilgilidir.

Eğer ki Syscall Numarası 0h ile FFFh arasındaysa, örneğimizde olduğu gibi Table Identifier değeri 0x0 olacaktır. Bu API'lar ise ntdll.dll ile ilgilidir. 

Şimdi ise Systemcall numarasının alındığı kısma geldik:

```
and eax,0FFFh   // eax = 0x26 (0010 0110)
```

Burada yapılan işlem ise aşağıda gösterilmiştir:

![](../../../images/posts/syscall-journey/img8.png)

**0010 0110** (Hex: 0x26) sonucunu elde ediyoruz. Bu ise NtOpenProcess'in Systemcall numarasıdır.

Kafamızda daha iyi oturması için herhangi bir GUI ile alakalı bir API seçelim ve bu adımları ona da uygulayalım. **win32u.dll**'den GUI ile alakalı bir API seçelim ve bu seçtiğimiz API'in Table Identifier değerini ve SSN'i hesaplayalım:

![](../../../images/posts/syscall-journey/img16.png)

**NtUserCreateWindowEx** GUI ile alakalı bir API'dir ve win32u.dll'in içinde bulunur. SSN Numarası ise **106F**. Bunun işlendiği varsayarsak:

```
mov edi,eax ; eax = 0x106F (0001 0000 0110 1111)
shl edi,7
```

Bu işlem tam olarak şöyle:

![](../../../images/posts/syscall-journey/img17.png)

7 bit sola kaydırdığımızda aldığımız sonuç **20h** oluyor. Daha sonra Table Identifier değerini alalım:

```
and edi,20h ; edi = 0x20 (1000 00)
```

Bu kodda yapılan işlem aşağdaki gibidir:

![](../../../images/posts/syscall-journey/img18.png)

Yani Table Identifier değeri 0x20 (32) oluyor. 

Yani her zaman Table Identifier değeri 0x0 olmuyor. Önceden anlattığım gibi, eğer GUI ile alakalı bir API'in ssn numarası işleniyorsa table Identifier değeri 0x20 olacaktır. 0x0 olması takdirde ntdll.dll'in içerisinden bir API olduğunu anlayabiliriz.

Son olarak GUI API'in SSN numarasını çıkaralım:

```
and eax,0FFFh   ; eax = 0x106F
```

Bu kodda yapılan işlem aşağıdaki gibidir:

![](../../../images/posts/syscall-journey/img19.png)

Sonucumuz **0001000001101111** yani 0x106F değerine denk gelmektedir. 

Böylece **KiSystemServiceStart** fonksiyonunun amacı, işlenilen syscall'ı ve Table Identifier değerlerini çıkarmak. Bu kısımdan sonra artık akış **KiSystemServiceRepeat**'e yöneliyor.

### Kernel Rutinin Hesaplanması: **KiServiceSystemRepeat**

Artık Syscall numarası belirlendikten sonra bu fonksiyonda ilk olarak SSDT'nin adresi alınmakta:

![](../../../images/posts/syscall-journey/img9.png)

Fakat ilgi çeken kısım ise SSDT'nin adresi alındıktan sonra rbx'in değerleri kontrol ediliyor. Hatırlayalım, rbx register'ı hangi adresi tutuyordu?

**KiSystemServiceUser** başlığında gördüğümüz gibi rbx register'ı, _KPRCB altında ```+0x008 CurrentThread    : Ptr64 _KTHREAD``` yapıyı tutmakta. Bu yapıda neyi kontrol ettiğine bir bakalım:

```
> dt nt!_KTHREAD
   ...
   +0x078 ThreadFlagsSpare : Pos 0, 2 Bits
   +0x078 AutoAlignment    : Pos 2, 1 Bit
   +0x078 DisableBoost     : Pos 3, 1 Bit
   +0x078 AlertedByThreadId : Pos 4, 1 Bit
   +0x078 QuantumDonation  : Pos 5, 1 Bit
   +0x078 EnableStackSwap  : Pos 6, 1 Bit
   +0x078 GuiThread        : Pos 7, 1 Bit
```

Bu yapıdan **GuiThread** flag'ın ayarlanıp ayarlanmadığını kontrol edilmektedir. Eğer ayarlanmamışsa direkt bu koşullardan atlanır.

İşin garip kısmı da ileride de göreceğimiz gibi, thread ilk olarak bu rutini çalıştırdığında GUI ile alakalı bir API'in işlenip işlenmediğini bilmiyor. Yani bir farklı deyişle, Kernel henüz mevcut Thread'ın bir GUI fonksiyonu işleyip işlemediğini bilmiyor. Dolayasıyla sonuç ne olursa olsun ilk kısımda burası her zaman atlanacaktır. İlerideki  analizde göreceksiniz ki hesaplamalardan sonra akış, eğer GUI ile alakalı bir API işleniyorsa bu kısma tekrardan yönlendirilecek.

![](../../../images/posts/syscall-journey/img10.png)

SSDT'nin adresi alındıktan sonra  bir karşılaştırma yapılıyor. Açıklamadan göreceğiniz üzere Syscall numarası, **r10+rdi+10h** adresindeki değerle karşılaştırıyor. r10 register'ı SSDT adresini barındırırken rdi değeri ise yukarıda gördüğümüz gibi Table Identifier sonucunu taşımaktadır. Örneğimizin yine NtOpenProcess olduğunu düşünürsek Table Identifier'ın 0x0 olduğunu varsayabiliriz. 

Bu koşulun amacı alınan syscall numarasının GUI ile alakalı bir API'a ait olup olmadığıdır. Eğer ait ise **loc_14068DAC7** fonksiyonuna yönlendirilir. Değilse işlemlere devam edilir.

Şimdi ise büyünün gerçekleştiği kısma geliyoruz:

![](../../../images/posts/syscall-journey/img11.png)

Eğer SSDT dökümanımı okuduysanız SSDT tablosunu kullanarak mutlak adrese erişmek için bazı formüller kullanıyorduk. Bu formülleri de iredteam kaynağından almıştım. Bu kısım tam olarak bununla ilgili. Detaya geçmeden önce formülleri bir hatırlayalım.

İlk olarak offset'i hesaplıyorduk:

<div align="center">
<br>
<b>
<i>
Offset = KiServiceTableAddress + 4 * SSN
</b>
</i>
</div>

Buradaki formülün karşılığını assembly kodlarında görebiliriz:

```
movsxd  r11, dword ptr [r10+rax*4] ; Offset'i hesapla
```

r10 register'da SSDT adresi, rax'ta SSN numarası bulunmakta. 

Yine SSDT dökümanında, elde ettiğimiz offset değeri ile ilgili kernel rutini hesaplıyorduk:

<div align="center">
<br>
<b>
<i>
 KernelRoutineAddress = KiServiceTableAddress + ( Offset >>> 4 )
</b>
</i>
</div>

Bu kısmın assembly karşılığı ise şu şekilde:

```
mov     rax, r11
sar     r11, 4          ; Elde edilen offset değerini 4 bit sağ kaydır
add     r10, r11        ; Kaydırma sonucunu SSDT adresiyle toplayarak mutlak adresi hesapla
```

Yani SSDT'te öğrendiğimiz formüller kullanılarak asıl adres hesaplanıyor. Böylece canlı bir şekilde de formülleri görmüş olduk.

Daha sonra edi register'ın değeri **0x20** değeri ile karşılaştırılıyor:

```
cmp edi,20h
jnz short loc_14068D270
```

Artık bunun ne anlama geldiğini biliyoruz. İşlenilen API'in GUI API'a ait olup olmadığı kontrol ediliyor. Bunun için de alınan Table Identifier değeri kullanılıyor. Eğer işlenilen API, GUI ile alakalı ise bu kısma yönlendiriliyor:

![](../../../images/posts/syscall-journey/img12.png)

Bu başlıkta ilk olarak bahsettiğim konuya geldik. Eğer edi gerçekten 0x20 ise, bu bir GUI API'in işlendiğini gösterir ve mevcut thread'ı **KiConvertGuiThread** ile bir GUI Thread'e dönüştürür. Sonrada akış tekrardan KiSystemServiceRepeat'e yönlendirilir

Artık işlenilen syscall'ın GUI ile alakalı olup olmadığı belirlendiğinde ve hesaplamalar yapıldıktan sonra akış KiSystemServiceGdiTebAccess'e yönlendirilir. Ardından hesaplanılan adrese yönlendirmek için akış **KiSystemServiceCopyEnd**'den devam ediyor:

![](../../../images/posts/syscall-journey/img13.png)

**KiSystemServiceCopyEnd**'nin adresine yönlendirmeden önce bu adresi rax'ın değeri kadarıyla çıkartıyor yani akış, KiSystemServiceCopyStart kısmına aktarılıyor.

### **Kernel Rutine Yönlendirme: KiSystemServiceCopyEnd**

![](../../../images/posts/syscall-journey/img14.png)

Bu fonksiyonda dikkatimizi çeken kısım ise akış, hesaplanan kernel rutin adresine yönlendirilmesidir:

![](../../../images/posts/syscall-journey/img15.png)

r10 register'da hesaplanan rutin adresi bulunmaktadır. rax register'a adres aktarılarak adres çağrılıyor.

### **Statik Analiz Sonucu**

Statik analizle incelediğimizde kernel alanında syscall'ın şu şekilde işlendiğini anlayabiliriz:

- **Durak 1 - KiSystemServiceUser**: Geçerli Thread için KPRCB yapısından CurrentThread yapı alınır, **SystemCallNumber** ve **FirstArgument** bayrakları ayarlanır.
- **Durak 2 - KiSystemServiceStart**: İşlenilecek syscall'ın numarasını ve Table Identifier değerlerini çıkarır.
- **Durak 3 - KiSystemRepeat**: Syscall işlenme sürecin en önemli durağı. İşlenilen syscall'ın GUI ile ilgili olup olmadığı belirlenir ve ilgili rutin adres hesaplanır.
- **Durak 4 - KiSystemServiceCopyEnd**: Artık syscall işlenme sürecin son durağı. Akış, hesaplanılan adrese yönlendirilir ve işlemler tamamlanmış olur.

## **Dinamik Analiz**

Sanal makinemize bağlı Windbg ile bu süreçleri yakından takip edebiliriz. Statik analizde öğrendiğimiz şeyleri dinamik olarak da görelim.

### **KiSystemCall64**'e Breakpoint Eklemek

KiSystemCall64'ün adresini okuyarak başlayabiliriz. Bunun için aşağıdaki komut ile adresini okuyabiliriz:

```
kd> rdmsr c0000082
msr[c0000082] = fffff802`5b21a1c0
```

İlk olarak windbg’da KiSystemCall64’e bp koyarak başlamıştım ancak sakın direkt olarak buraya bir bp koymayın yoksa PatchGuard selam verecektir:

![](../../../images/posts/syscall-journey/img20.png)

Yani BSOD veriyor. Tekrar tekrar analiz ettiğimde nedenini anladım. Ayrıca bunu anlamamda stackoverflow'da bu sorunun üzerine [konu açan](https://stackoverflow.com/questions/65367333/breakpoint-setting-in-ntkisystemcall64-not-working) kişi sayesinde netleştirmiş oldum.

KiSystemCall64 kısmın ilk kısımlarına göz atarsanız Windows çekirdek hata ayıklama mekanizması tarafından gerekli olan kernel stack'ın ayarlandığını göreceksiniz. Yani buradaki çözüm bu stack ayarlandıktan sonraki kısma bir bp koymak olacaktır:

![](../../../images/posts/syscall-journey/img21.png)

Statik analizde buna dikkat etmemiştim ancak windbg'da daha iyi anladım. İlk başlarda stack ayarlamanın yapıldığını görebiliriz. Aşağıda gösterilen kısma bir bp koyduğumda bir sıkıntı olmadığını gözlemledim:

![](../../../images/posts/syscall-journey/img22.png)

İşte sonucu:

![](../../../images/posts/syscall-journey/img23.png)

Başarılı bir şekilde tetikleniyor. Artık işlenilecek rastgele syscall'ı analiz edebiliriz!

### **KiSystemServiceUser**

Analize başlamadan önce bilmediğimiz bir syscall yapıldığı için hangi API için syscall yapıldığına göz atalım:

![](../../../images/posts/syscall-journey/img24.png)

Hızlı bir şekilde formülleri kullandığımızda, benim için **1a3** numaralı NtSetIoCompletion API'i tetiklenmiş. 

Statik analizimizde ilk durağın **KiSystemServiceUser** olduğunu görmüştük. Buraya bir bp koyarak akışı devam ettirelim:

```
kd> bp ntkrnlmp!KiSystemServiceUser
kd> g
Breakpoint 1 hit
nt!KiSystemServiceUser:
fffff802`5ac1264d c645ab02        mov     byte ptr [rbp-55h],2
```

Bu API'in ilk kısımlarında _KPRCB içerisinden KTHREAD yapısına işaret eden Current Thread yapının alındığını görmüştük. Windbg'da bunu görebiliriz:

![](../../../images/posts/syscall-journey/img25.png)

Yapının adresi alındıktan sonra **KiSystemServiceUser**'ın son kısmında ayarlamalar yapıldığını tekrar görebiliriz:

![](../../../images/posts/syscall-journey/img26.png)

Bu ayarlamarın yapıldıktan sonraki kısmına bir bp koyalım ve aktarılan değerlere göz atalım:

![](../../../images/posts/syscall-journey/img27.png)

Ayarlanan Systemcall numarası ve FirstArgument bayrakların değerlerini görebiliriz. Ayrıca Teb'in adresini de.

### **KiSystemServiceStart**

Artık syscall ve Table Identifier değerlerini çıkaran **KiSystemServiceStart** API'a bp koyalım:

```
kd> g
Breakpoint 4 hit
nt!KiSystemServiceStart:
fffff802`5ac12770 4889a390000000  mov     qword ptr [rbx+90h],rsp
```
Bu kısımda artık neler yapıldığını bilsek de bir kısaca göz atalım:

![](../../../images/posts/syscall-journey/img28.png)

Şimdi benim debugger'da tetiklenen syscall numarası 0x1a3 olduğu için bu değerle yapılan işlemleri tekrar edelim. Tekrardan zarar gelmez:

```
mov edi eax     ; eax = 0x1a3 (0001 1010 0011)
shr edi,7
```

Bu komutlar çalıştığında şu sonucu almamız gerekecek:

![](../../../images/posts/syscall-journey/img29.png)

Sonucumuz 0000 0011 (3) olacaktır. Windbg'da bu kısmı çalıştırıp sonucu doğrulayabiliriz:

![](../../../images/posts/syscall-journey/img31.png)

Çıktıdan gördüğümüz gibi kaydırma işleminden sonra **3** değeri alınıyor.

Şimdi kaydırma işleminden sonra Table Identifier'ı alalım:

![](../../../images/posts/syscall-journey/img30.png)

Sonucumuz **0**. Önceden anlattığım gibi eğer Table Identifier değeri 0 ise ntdll.dll API'a ait olduğunu anlayabiliriz. Doğrulamak için windbg'ı kullanalım:

![](../../../images/posts/syscall-journey/img32.png)

Son olarak ise Systemcall numarası alınacak:

```
and eax,0FFFh   ; eax = 0x1a3 (0001 1010 0011)
```

Aşağıda bu işlem gösterilmiştir:

![](../../../images/posts/syscall-journey/img33.png)

İşlem sonucunda **0001 1010 0011** yani 0x1a3 değerini elde ediyoruz. Yine doğrulamak için Windbg'ı kullanalım:

![](../../../images/posts/syscall-journey/img34.png)

Göründüğü üzere systemcall numarası alınmakta. Artık Syscall ve Table Identifier değerleri çıkarıldıktan sonra bu fonksiyonla işimiz bitiyor ve akış, **KiSystemServiceRepeat**'e yöneliyor.

### **KiSystemServiceRepeat**

Syscall ve Table Identifier değerleride alındıktan sonra artık bu durakta adresin hesaplanacağını biliyoruz.

![](../../../images/posts/syscall-journey/img35.png)

Tekrar etmekten zarar gelmez, SSDT'nin adresi alınması ardından işlenilen syscall numaranın GUI API'a ait olup olunmadığı karşılaştırılıyor. Ne olursa olsun thread ilk defa bu kısma gerdiğinde her zaman bu kısmı atlayacak çünkü önceden de anlattığım gibi, thread ilk defa bu kısma geldiğinde işlenilen API'in GUI ile alakalı olup olmadığını bilmiyor. İlerideki akışta hesaplamalardan sonra işlenilen API'in GUI ile alakalı olduğu tespit edildiğinde bu fonksiyonun başına tekrar yönlendirilecek.

Bu koşullar atladığında en önemli kısım geliyor. Artık adresin hesaplanması yapılıyor:

![](../../../images/posts/syscall-journey/img36.png)

r10 register'da SSDT'nin adresi bulunmakta. r11 register'a SSDT tablosunda işlenilen API'in mutlak adresine karşılık gelen Offset hesaplanıyor. Formülümüzü tekrardan hatırlayalım:

<div align="center">
<br>
<b>
<i>
Offset = KiServiceTableAddress + 4 * SSN
</b>
</i>
</div>

Doğrulamak için offset'in hesaplandığı kısmı çalıştırıp elde edilen değere göz atalım:

![](../../../images/posts/syscall-journey/img37.png)

Elde edilen offset değerin **0x637dd01** olduğunu görebiliriz. 

Şimdi ise offset değerini kullanarak mutlak adresi hesapladığı kısmi çalıştıralım ve hesaplanan adrese bakalım:

![](../../../images/posts/syscall-journey/img38.png)

Formülümüzü tekrar hatırlayalım arkadaşlar:

<div align="center">
<br>
<b>
<i>
 KernelRoutineAddress = KiServiceTableAddress + ( Offset >>> 4 )
</b>
</i>
</div>

Bu formül ile hesaplamadan sonra **0xfffff8025aeffa80** adresi elde ettim ve kontrol ettiğimde NtSetIoCompletion'a ait olduğunu doğruladım.

Adres hesaplamasından sonra edi'nin değeri 0x20 ile karşılaştırdığını tekrar görüyoruz. Artık bunun ne anlama geldiğini biliyoruzdur.

Eğer sizde tetiklenen Syscall numarası GUI ile alakalı bir API'a ait ise bu koşul sağlanacaktır. Benimkinde tetiklenen API, GUI ile ilgili olmadığından burası atlanacaktır.

Atlamadan sonra akışın **KiSystemServiceGdiTebAccess**'e yönlendirdiğini göreceksiniz:

![](../../../images/posts/syscall-journey/img39.png)

Artık bu kısımlarda yapılan işlemlere göz atmamıza gerek yok. Zira artık işlenilen syscall'ın adresi belirlendi ve artık buraya yönlendirimeye hazırlanılacak. Ancak statik analizimizde gördüğümüz gibi bu yönlendirme **KiSystemServiceCopyEnd**'e gerçekleşecek ve bu fonksiyonun sonuna göz attığınızda KiSystemServiceCopyEnd'in gerisine yönlendirdiğini göreceksiniz:

![](../../../images/posts/syscall-journey/img40.png)

jmp r11 olan kısma bir bp koyalım ve akış bu kısma geldiğinde bir ileri götürelim ve nereye yönlendirdiğine bir bakalım:

![](../../../images/posts/syscall-journey/img41.png)

Bazı verilerin kopyalanması için **KiSystemServiceCopyStart**'a yönlendirdiğini göreceksiniz. Artık bu kısımdan sonra ilgili adrese yönlendirilmek üzere **KiSystemServiceCopyEnd**'e yönlenecek.

### **KiSystemServiceCopyEnd**

Artık syscall işlenmesi bitti ve hesaplanan adresi yönlendirme noktasına geldik:

![](../../../images/posts/syscall-journey/img42.png)

Burada dikkatimizi çeken kısım rax register'a r10'un değeri verilmesi. r10 register'ı hesaplanan adresi taşımakta. Adresin çağırıldığı noktaya bp koyalım ve bir ileri götürelim:

![](../../../images/posts/syscall-journey/img43.png)

Başarılı bir şekilde NtSetIoCompletion'a yönlendirdiğini görebiliriz.

## **Sonuç**

Arkadaşlar umarım bu blog size yararlı olmuştur. 

Ek olarak, bu analizimde zorlandığım süreçte bana cidden katkısı olan Alice'in [Syscall yolcuğu](https://alice.climent-pommeret.red/posts/a-syscall-journey-in-the-windows-kernel/) ile alakalı bloguna da göz atabilirsiniz. Gerçekten bu kaynak sayesinde analiz sırasında anlamadığım noktaları anlamamda çok katkısı oldu. 
