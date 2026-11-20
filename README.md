# BitChat — çevrimdışı dayanışma

Türkçe React Native Android uygulaması. Hesap, drone veya sunucu kurulumu gerektirmez. Metro bağlantısı olmadan açılan APK üretir.

## Kullanım

1. `deliverables/BitChat-1.0.0.apk` dosyasını Android telefona aktarın ve kurun. Android, dosyayı açan uygulamaya bilinmeyen uygulama yükleme izni isteyebilir.
2. Ana sayfadan mesaj veya SOS hazırlayın. Ağ kapalıyken de kayıt yapılır; durum **alındı onayı yok** olarak kalır.
3. `Harita` ekranından koordinatlı kişisel noktalar ekleyin. Noktalar internet olmadan kalır. Konum izni isteğe bağlıdır; koordinat elle girilebilir.
4. `Dayanışma` üzerinden ihtiyaç veya paylaşım ilanı ekleyin. İlan ve duyurusu aynı SQLite işlemiyle saklanır.
5. Tek telefonla `Ağ > Tek telefonla ağ tatbikatı` açın. Bağlantı kesintisini ve düşük pili deneyin; tekrar çalıştırarak aktarımın ilerlemesini görün. Bu ekran tamamen izoledir; gerçek mesajları veya kuyrukları değiştirmez.

## İki telefonla gerçek bağlantı

Android 7+ **64 bit** cihaz, Google Play Hizmetleri, açık Bluetooth ve Wi-Fi gerekir. İnternet gerekmez. İki telefonda da aynı APK kullanılmalıdır.

1. Her iki uygulamada `Ağ > Yakındaki ağı aç` seçin, yakın cihaz izinlerini verin.
2. Bulunan telefonda `Bağlan` seçin. İki ekrandaki kodu fiziksel olarak karşılaştırıp iki tarafta da kabul edin. İstek 60 saniye içinde doğrulanmalıdır.
3. Mesaj gönderin. Karşı uygulama SQLite’a kaydettikten sonra uygulama düzeyinde alındı onayı yollar. **Yakındaki telefona ulaştı**, yalnızca bu komşu uygulamanın kaydı aldığını belirtir.
4. Çok atlamayı denemek için A–B ve ardından B–C eşleştirin. B eski geçerli mesajları da taşır. TTL en fazla 8 atlama; mesaj geçerliliği 24 saattir.
5. Arka plana geçildiğinde ağ bilinçli kapanır. Uygulamaya dönüp ağı yeniden açın. Sürekli arka plan teslimi vaat edilmez.

Konum mesaj başına açık onayla eklenir; ölçüm 2 dakikadan eskiyse yenilemek veya konum paylaşımını kapatmak gerekir. Konum ölçümü 15 saniye sonra hata verir. İzin reddinde mesaj, harita ve tatbikatın yerel işlevleri kullanılabilir.

## Gerçek kapsam ve sınırlar

- **Var:** beş etkileşimli ekran; SQLite işlemleri; Android Keystore P-256 / SHA-256 imzaları; Nearby Connections P2P_CLUSTER; karşılıklı kod doğrulaması; öncelik kuyruğu; tekrar deneme ve alındı onayı; tekrar paket reddi; TTL ve süre sınırı; pil politikası; açık/koyu tema; kişisel koordinat noktaları; paylaşım panelinden dışa aktarma.
- **Ortak kanal:** Nearby bağlantıları şifrelenir; aktarıcılar mesaj metnini okuyabilir. Çok atlamalı uçtan uca gizli sohbet yoktur. İmza cihaz anahtarını bağlar; kişinin gerçek adını doğrulamaz. Özel anahtar Android Keystore’dan çıkarılmaz.
- **Harita:** paketlenmiş bir koordinat tuvalidir. Resmi toplanma alanı/hastane, gerçek yollar, harita karosu veya yol tarifi içermez. Kişisel noktalar bu cihazda kalır; otomatik yayımlanmaz. Sabit varsayılan merkez konum iddiası değildir; gerçek koordinat veya ilk kişisel nokta gelince merkezlenir.
- **Önceliklendirme:** Türkçe/İngilizce yerel sözcük kurallarıdır; eğitilmiş ML modeli veya tıbbi triyaj değildir. Kullanıcı önceliği değiştirebilir; SOS daima acildir.
- **31-byte codec:** 4 byte kimlik, 4 byte gönderen özeti, 1 byte öncelik, 1 byte TTL, 8 byte koordinat, 13 byte ikili yük. Uzun imzalı mesaj veya şifreleme etiketi bu alana sığmaz. Codec test edilir; gerçek Nearby aktarımı tam imzalı zarfı kullanır. Ham BLE reklamı olarak yayımlama yapılmaz.
- **Pil:** şarjda / %50 üstü: 5 sn keşif + 10 sn mola. %20–50: 5 sn keşif + 25 sn mola, yalnız acil aktarım. %20 altı: siyah yüzeyler, keşif kapalı; mevcut bağlantılarda yalnız kendi SOS’u aktarılır. Bilinmeyen pilde temkinli politika uygulanır.
- **Yok:** drone/hotspot kumandası, 19 kHz kurtarma sinyali, garantili menzil veya 3 saniyelik Wi-Fi aktarımı, kripto para, resmi AFAD/belediye API teslimi. Dışa aktarma kurum teslimi değildir. Acil yardım hiçbir puana bağlı değildir.
- Bu bir saha prototipidir; acil servis yerine geçmez. Fiziksel telefon menzili/uyumluluğu ayrıca test edilmelidir.

## Geliştirme

`app/`: React Native 0.83.1, React 19.2, TypeScript, Zustand, Fabric/TurboModules ve Hermes. Android köprüsü Kotlin, SQLiteOpenHelper ve Android Keystore kullanır. Taşıma katmanı Google Nearby Connections 19.3.0; keşif Bluetooth/Wi-Fi üzerinden SDK tarafından yönetilir.

```powershell
cd app
npm ci
npm run typecheck
npm test -- --watch=false
npx eslint . --quiet
cd ..
.\scripts\build-android.ps1
```

JDK 17 veya 21, Node 22.12+, Android SDK 36, Build Tools 36 ve NDK 28.2.13676358 gerekir. SDK yolunu `ANDROID_HOME` ile veya `app/android/local.properties` içindeki `sdk.dir` ile ayarlayın. İlk derleme bağımlılık indirir. Betik, MSIX terminallerindeki Java soket sorunu için kısa geçici klasör kullanır. Gradle 8.14.1, şablondaki eski Foojay eklentisiyle uyumluluk için sabitlenmiştir.

APK geliştirme sertifikasıyla imzalıdır; doğrudan kurulum içindir. Mağaza yayını öncesi ayrı kalıcı yayın anahtarı, gizlilik metni ve fiziksel cihaz kabul testi gerekir.

Son paket, test kanıtları ve doğrulanmamış alanlar `deliverables/VERIFICATION.md` dosyasındadır. Önbellekteki bağımlılıklarla internet olmadan yeniden derlemek için `scripts/build-android.ps1 -Offline` kullanılabilir.

## Mimari

```
app/src/core/       Paket, sınıflandırıcı, protokol, mesh zamanlayıcı, izole tatbikat
app/src/state/      Seri SQLite işlemleri, cihaz yaşam döngüsü ve ağ orkestrasyonu
app/src/specs/      Codegen TurboModule sözleşmesi
app/src/ui/         Temalar, harita tuvali, ekranlar ve formlar
app/android/app/src/main/java/com/bitchat/bridge/
                   SQLite, Keystore, Nearby, cihaz ve konum köprüsü
app/__tests__/     Paket ve kuyruk sınırları, veri kaybı ve kesinti testleri
deliverables/      APK, ekran görüntüleri ve doğrulama raporu
```

Kayıt üst sınırı 10.000 mesajdır. Kayıt hatasında UI başarısı gösterilmez. Bozuk/eski şema açılmaz; önceki veriler korunur. Kapanmış bir ilanın daha önce başka telefona ulaşmış kopyası geri çekilmez. Mesaj temizliği yalnız süresi dolan yerel kayıtları kaldırır.

## Resmi teknik başvurular

- [Nearby bağlantı ve doğrulama](https://developers.google.com/nearby/connections/android/manage-connections)
- [Nearby izinleri](https://developers.google.com/nearby/connections/android/get-started)
- [Android Bluetooth izinleri](https://developer.android.com/develop/connectivity/bluetooth/bt-permissions)
- [React Native ortam kurulumu](https://reactnative.dev/docs/set-up-your-environment)
