# BitChat Android doğrulaması

28 Ekim 2026. Çıktı: `BitChat-1.0.0.apk`. Kurulabilir saha prototipidir; mağaza yayını veya kurtarma sistemi kabulü değildir.

## Paket

- Paket: `com.bitchat`; sürüm kodu `1`, Android sürüm adı `1.0`.
- Android API 24+; `arm64-v8a` ve `x86_64`.
- Boyut: 33.669.826 byte (32,11 MiB).
- SHA-256: `B7AEAEB54F7E0AB4FC7BA7C5DCA164CF1CC0891C8C893B1B5EF081BBFE449537`.
- Release derlemesi başarılı; Hermes paketi APK içinde. Metro sunucusu gerekmez.
- `apksigner verify --verbose`: başarılı, APK Signature Scheme v2, 1 imzalayan.
- `zipalign -c -P 16 4`: çıkış kodu 0.
- Geliştirme sertifikası kullanılır. Mağaza yayını için ayrı yayın anahtarı gerekir.

## Otomatik kontroller

- TypeScript: geçti.
- ESLint hata denetimi: geçti. Stil uyarıları yayın engeli olarak kullanılmadı.
- Jest: **50 test, 2 test grubu, tümü geçti**.
- Android Kotlin, Java, CMake, manifest ve release lint-vital adımları: geçti.
- Arayüz mekanik tasarım taraması: bulgu yok. Bu, kapsamlı erişilebilirlik kabul testi anlamına gelmez.
- Bağımlılık taraması: 9 düşük önem dereceli bildirim kaldı; orta, yüksek ve kritik bildirim yok. CLI 20.2.0 güncellemesi orta dereceli bildirimleri giderdi. Ayrıntısız özet `dependency-audit-summary.json` içindedir.

Testler bozuk/kısa paketleri, byte offsetini, koordinat sınırlarını, TTL taşmasını, Türkçe olumsuz ifadeleri ve karışık acil ifadeleri, imzalanan alanların bağlanmasını, süre sonunu, öncelik sırasını, pil eşiklerini, kesilen gönderimin geri çekilmeli yeniden denemesini ve uygulama düzeyinde alındı onayı olmadan teslim durumunun değişmemesini kapsar. Mock yerel köprüyle disk doluluğu, atomik ilan/mesaj kaydı ve eşzamanlı güncellemelerde veri kaybı denetlendi. Bu mock testler fiziksel disk doluluğu veya radyo başarısı kanıtı değildir.

## Emülatörde çalışan APK

Pixel 9a, Android API 36, x86_64. Son paket yeniden kuruldu. Uygulamanın başlangıcı Android Keystore anahtarıyla bir meydan okumayı imzalayıp doğrular; bu denetim geçmeden ana arayüz açılmaz.

Doğrulanan akışlar:

- Açılış ve beş ana ekran; başlangıçta hayali komşu, teslim veya resmi tesis üretilmez.
- SOS yerelde imzalanıp kaydedildi. Ağ kapalıyken **alındı onayı yok** olarak kaldı.
- Wi-Fi ve mobil veri kapatılıp süreç zorla durduruldu. Yeniden açılışta SOS korundu.
- Yakındaki cihaz izni reddedildi. Açıklayıcı hata gösterildi; yerel ekranlar kullanılabildi.
- İzole tatbikatta bağlantı kesilince adım ilerlemedi; tekrar bağlantıda üç sanal düğüm boyunca ilerleyip sanal onay verdi. Gerçek kuyruk etkilenmedi.
- Dışa aktarma gerçek `.json` dosyasıyla Android paylaşım seçicisini açtı. Bir alıcıya gönderme yapılmadı; kurum teslimi iddia edilmedi.
- Boş dayanışma ilanı reddedildi. Geçerli su paylaşımı ve bağlı duyurusu kaydedildi.
- Boş koordinat ve enlem `91` reddedildi. Geçerli kişisel nokta kaydedildi; haritada işaret ve yakınlaştırma kontrolü çalıştı.
- İlk incelemede klavyenin düğmeleri örtebildiği görüldü. Form yüksekliği ve geri tuşu düzeltildi. Son APK’da geri tuşu önce klavyeyi kapattı; taslak korundu. Klavye açıkken kaydırıp gönder düğmesine basılarak mesaj kaydedildi.
- Koyu tema seçildi. Emülatörün pil değeri %12, fişi çekilmiş olarak ayarlanınca siyah yüzey ve **Tarama kapalı** uyarısı gösterildi. Test sonunda pil ayarı geri alındı.
- Deneme sonunda yalnız bu test uygulamasının emülatör verileri temizlendi; temiz kurulum ekranı yeniden açıldı. Harita/ilan/tema kayıtlarının ikinci süreç açılışındaki görünümü ayrıca doğrulanmadı; süreç yeniden açılışıyla kalıcılık kontrolü SOS kaydı üzerinde yapıldı.

Ekran görüntüleri `screenshots/` altındadır. Görünen TATBIKAT kayıtları yalnız test sırasında emülatörde oluşturuldu; APK’ya örnek kayıt olarak gömülmedi. Başlangıçta emülatörün Pixel Launcher / System UI süreçleri yanıt vermeme pencereleri gösterdi; kapatıldı. Bir UI otomasyon oturumunda test aracının erişilebilirlik kaydı çakıştı; işlemler sıralı tekrarlandı. Bunlar uygulama teslim başarısı veya fiziksel cihaz kanıtı olarak değerlendirilmedi.

## Doğrulanmayan ve uygulanmayan kapsam

İki fiziksel telefonla Bluetooth/Wi-Fi bağlantısı, gerçek menzil, çok atlamalı saha teslimi, pil tüketimi ve OEM uyumluluğu doğrulanmadı. Android Nearby taşıma köprüsü uygulandı; bu emülatör kontrolü donanım kabulü yerine geçmez.

Harita kişisel koordinat planıdır; resmi harita veya yardım noktası veri seti yoktur. Kanal ortaktır; çok atlamalı uçtan uca gizli sohbet yoktur. Ağ uygulama arka plana geçtiğinde kapanır. Drone, 19 kHz akustik iletişim, kripto para ve AFAD/belediye sunucu eşitlemesi uygulanmadı. Ayrıntılı kapsam ve telefonla deneme adımları ana `README.md` dosyasındadır.
