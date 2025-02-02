---
title: UEFI Keylogger
date: 2025-01-28
linkTitle: UEFI Keylogger
---

Merhabalar. Bu blogta UEFI'de basit bir keylogger geliştireceğiz. Bir önceki blogta temel olarak UEFI'yi anlamıştık ve edk2 kurulumunu tamamlamıştık ve ardından bir adet gereği "Hello World" çıktısı veren sürücü yazmıştık. Artık basit projeler geliştirebilir hale geldik.

Kabaca yapacağımız şey UEFI'de klavyeden basılan tuşları ekrana bastıran bir sürücü yazacağız.

## **Kodlama**

KeyLogger.c projesi oluşturalım ve aşağıdaki kodları yapıştıralım:

```c
#include <Uefi.h>
#include <Library/UefiApplicationEntryPoint.h>
#include <Library/UefiLib.h>

EFI_STATUS
EFIAPI
UefiMain(
    EFI_HANDLE        ImageHandle,
    EFI_SYSTEM_TABLE  *SystemTable
) {
  EFI_SIMPLE_TEXT_INPUT_PROTOCOL *TextInput;
  EFI_INPUT_KEY Key;

  /* Protokole erişim sağla */
  TextInput = SystemTable->ConIn;

  Print (L"UEFI Keylogger!\n");

  while(1) {
    TextInput->ReadKeyStroke (
        TextInput, 
        &Key
    );
    if (Key.ScanCode == SCAN_ESC) {
      Print (L"ESC Button Detected\n");
      break;
    }

    if (Key.UnicodeChar != 0) {
      Print (L"Pressed: %c\n", Key.UnicodeChar);
    }
  }

  return EFI_SUCCESS;
}
```

Kodumuz oldukça basit. Detaylıca göz atalım:

```c
EFI_SIMPLE_TEXT_INPUT_PROTOCOL *TextInput;
EFI_INPUT_KEY Key;
```

Sürücümüzde **EFI_SIMPLE_TEXT_INPUT_PROTOCOL** protokolü ile bir pointer oluşturarak başlıyoruz. Bu pointer, klavyeden gelen girişleri yakalamak için kullanacağız. EFI_SIMPLE_TEXT_INPUT_PROTOCOL protokolü, klavye girişlerini okuma işlemini gerçekleştiren temel bir protokoldür. 

Daha sonra klavyeden basılan tuşları bir değişkene kaydetmek için EFI_INPUT_KEY tipinde bir değişken oluşturuyoruz.

```c
TextInput = SystemTable->ConIn;
```
Bu kısımda ise **EFI_SIMPLE_TEXT_INPUT_PROTOCOL**'e erişim sağlıyoruz. ConIn, Console Input Protocol (Konsol Giriş Protokolü) için kullanılan bir üye değişkendir. 

```c
while(1) {
    TextInput->ReadKeyStroke ( 
        TextInput, 
        &Key
    );
    if (Key.ScanCode == SCAN_ESC) {
      Print (L"ESC Button Detected\n");
      break;
    }

    if (Key.UnicodeChar != 0) {
      Print (L"Pressed: %c\n", Key.UnicodeChar);
    }
}
```

Artık bir döngü ile basılan tuşları ekrana bastırmaya başlıyoruz. **ReadKeyStroke** ile basılan tuşları **Key** değişkenine aktarıyoruz. 

Eğer basılan tuş ESC (SCAN_ESC) tuşuysa sürücünün döngüden çıkmasını sağlıyoruz. Eğer değilse basılan tuşu ekrana bastırıyoruz.


## **Sürücüyü Çalıştırma**

KeyLogger.inf dosyasını oluşturalım ve aşağıdaki kodları yapıştıralım:

```inf
[Defines]
  INF_VERSION                    = 0x00010006
  BASE_NAME                      = KeyLogger
  MODULE_TYPE                    = UEFI_APPLICATION
  VERSION_STRING                 = 1.0
  ENTRY_POINT                    = UefiMain

[Sources]
  KeyLogger.c

[Packages]
  MdePkg/MdePkg.dec
  ShellPkg/ShellPkg.dec
  MdeModulePkg/MdeModulePkg.dec

[LibraryClasses]
  UefiApplicationEntryPoint
  UefiLib
```

Aşağıdaki kodla projemizi build edelim:

```bash
Build -m ShellPkg\Application\KeyLogger\KeyLogger.inf
```

Her şey tamam olduğuna göre sonuca bakabiliriz:

![](../../../images/posts/uefi-keylogger/img1.png)

Gördüğünüz gibi klavyeden bastığım tuşlar ekrana bastırılıyor. ESC tuşuna basıldığında ise sürücü kapanıyor. 

## **Sonuç**

Bu blogta UEFI sürücüsü ile basit bir Keylogger geliştirmeyi öğrendik. Blogun basit olduğunun farkındayım ancak daha yeni olduğumuz için ve UEFI projelerine adepte olabilmek için böyle basit projelerle ilerlemenin güzel olacağını düşünüyorum. İlerideki süreçlerde daha derin projelere girişeceğiz. 
