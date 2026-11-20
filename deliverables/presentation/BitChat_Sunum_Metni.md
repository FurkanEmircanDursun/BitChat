# BitChat sunum metni

16 slayt. Yaklaşık 10–12 dakikalık anlatım için hazırlanmıştır.

## 1. BitChat

- Afet anında iletişim ve dayanışma
- Çalışan Android prototipi

### Sunucu anlatımı

BitChat, afet koşullarında yerel iletişimi ve dayanışmayı desteklemek için geliştirdiğimiz Android uygulaması. İlk sunumumuz projenin vizyonunu anlatıyordu. Bugün bu vizyonun çalışan bir bölümünü uygulamanın gerçek ekranları üzerinden gösterebiliyoruz. Bir kullanıcı internet olmasa da mesajını ve SOS talebini cihazında saklayabiliyor, ihtiyaç veya paylaşım ilanı oluşturabiliyor ve kendi koordinat noktalarını kaydedebiliyor. Bu sunumdaki ekran görüntüleri emülatörde çalışan uygulamadan alındı. Ekranlarda görünen TATBIKAT kayıtları deneme verisidir. Uygulanan özelliklerle henüz fiziksel saha doğrulaması bekleyen hedefleri ayrı ele alacağız.

Kaynak: İlk sunum, sayfa 1. deliverables/VERIFICATION.md. 01-home.png.

## 2. Afette iletişim kesintisi

- Yardım talebi bağlantıyı beklemek zorunda kalabilir
- Talebi önce cihazda korumak, iletişimin ilk adımıdır.

### Sunucu anlatımı

İlk sunumda tanımladığımız problem, afet sırasında internet ve GSM erişiminin kesilebilmesi veya yoğunluk nedeniyle kullanılamamasıydı. Bu koşullar yardım talebini iletmeyi ve yerel ihtiyaçları görünür kılmayı zorlaştırabilir. BitChat’in başlangıç noktası, kullanıcının bağlantı bulamadığı anda da bir işlem yapabilmesi. Talep cihazda kaydolur ve daha sonra aktarım için bekler. Bu yaklaşım, bir talebin kurtarma ekibine kesin olarak ulaşacağı anlamına gelmez. İlk hedefimiz, bağlantı yokken kaydı korumak ve kullanıcının neyin kaydedildiğini, neyin henüz iletilmediğini açıkça görebilmesidir.

Kaynak: İlk sunum, sayfa 2. README.md, kullanım ve kapsam.

## 3. Beş ekranda yerel dayanışma

- Ana sayfa: SOS ve yerel durum
- Mesajlar: kayıt ve iletim durumu
- Harita: kişisel koordinat noktaları
- Dayanışma: ihtiyaç ve paylaşım ilanları
- Ağ: cihaz bağlantısı ve tatbikat

### Sunucu anlatımı

Uygulama beş ana ekran etrafında düzenlendi. Ana sayfa acil çağrıya ve son duruma erişim sağlıyor. Mesajlar ekranında kayıtları, öncelikleri ve alındı durumunu görüyoruz. Harita kişisel koordinat noktalarını saklıyor. Dayanışma ekranı ihtiyaçları ve paylaşılabilecek kaynakları aynı yerde topluyor. Ağ ekranında cihaz koşulları, bağlantı izinleri ve tek telefonla çalıştırılabilen tatbikat bulunuyor. Yerel işlevler için kullanıcı hesabı, bir drone veya sunucu kurulumu gerekmiyor. Gerçek telefonlar arası bağlantı için ise uyumlu cihazlar, Bluetooth, Wi-Fi ve Google Play Hizmetleri gerekiyor.

Kaynak: app/App.tsx. app/src/ui/Screens.tsx. README.md. 11-dark-mode.png.

## 4. SOS önce cihaza kaydolur

- İhtiyacı açıklama
- Acil öncelikle kuyruğa alma
- Konumu isteğe bağlı ekleme
- 112 / AFAD’a otomatik gönderim yoktur.

### Sunucu anlatımı

Acil yardım düğmesi bir hazırlık ekranı açıyor. Kullanıcı nerede olduğunu ve neye ihtiyacı olduğunu yazabiliyor. Konum ekleme tercihi kullanıcıya ait. SOS kaydı her zaman acil öncelikle oluşturuluyor ve bağlantı kurulunca iletilmek üzere kuyruğa giriyor. Bu aşamada önemli ayrım, kaydetmenin teslim etmekten farklı olması. Kullanıcıya kayıt durumunu gösteriyoruz ve otomatik bir 112 ya da AFAD teslimi varmış gibi davranmıyoruz. Kurumlara doğrudan bildirim bu sürümün bir özelliği değil. Böylece acil durum arayüzü, yapabildiği işlemi ve henüz gerçekleşmeyen teslimi açıkça ayırıyor.

Kaynak: app/src/ui/Sheets.tsx, ComposeSheet. app/src/state/store.ts, sendMessage. 02-sos-form.png.

## 5. Mesajın durumu görünür

- Cihazda kayıtlı
- Yakındaki telefondan alındı onayı
- Kurum teslimi ayrı bir doğrulama gerektirir.

### Sunucu anlatımı

Mesajlar ekranı yalnızca bir konuşma listesi göstermiyor. Her kaydın hangi aşamada olduğunu da anlatıyor. Ağ kapalıysa mesaj cihazda kalır ve alındı onayı olmadığı belirtilir. Bağlı bir komşu uygulama mesajı kalıcı olarak kaydettiğinde uygulama düzeyinde bir alındı onayı dönebilir. Bu onay yalnızca komşu uygulamanın mesajı aldığını gösterir. Bir kurumun veya belirli bir kurtarma ekibinin gördüğü anlamına gelmez. Ekrandaki deneme mesajının bekliyor görünmesi bu nedenle doğru davranıştır. Emülatörde, bağlantıları kapatıp uygulamayı yeniden açtığımızda SOS kaydının kaldığını da kontrol ettik.

Kaynak: app/src/state/store.ts, handleRadio. app/src/core/AutonomousMeshEngine.ts. deliverables/VERIFICATION.md. 03-messages-saved.png.

## 6. Öncelik bağlantı beklemeden belirlenir

- ACİL: Enkaz altındayım
- İHTİYAÇ: Su lazım
- GENEL: Güvendeyim
- Cihaz içi kurallar kullanılır. Öncelik elle değiştirilebilir.

### Sunucu anlatımı

Önceliklendirme, internet bağlantısı veya uzak bir sunucu gerektirmeden cihaz içinde çalışıyor. İlk sürümde eğitilmiş bir yapay zekâ modeli yerine Türkçe ve İngilizce ifadeleri inceleyen kurallar kullanıyoruz. Örneğin enkaz altında olma ifadesi acil, su ihtiyacı kaynak önceliği, güvende olma bilgisi ise genel mesaj olarak değerlendiriliyor. Kullanıcı, normal mesajın önceliğini elle değiştirebiliyor. Testlerde olumsuz ifadeleri ve birden fazla kişiden söz eden mesajları da ele aldık. Örneğin kişinin kendisi iyi olsa bile komşusunun enkaz altında olduğunu belirtmesi acil önceliği düşürmüyor. Bu işlev tıbbi triyaj yerine geçmez.

Kaynak: app/src/core/OfflineAiClassifier.ts. app/__tests__/core.test.ts. İlk sunum, sayfa 6.

## 7. Bağlantı iki telefonun onayıyla kurulur

- Bluetooth ve Wi-Fi
- Karşılıklı doğrulama kodu
- İzin reddinde yerel özellikler kullanılabilir.

### Sunucu anlatımı

Yakındaki ağ için Android’in Nearby Connections köprüsünü uyguladık. İki telefonda da ağ açılır ve cihazlar birbirini bulduğunda kullanıcı bağlantıyı başlatır. İki ekrandaki kod karşılaştırılmadan bağlantı kabul edilmemelidir. Böylece kullanıcı hangi telefonla bağlantı kurduğunu kontrol edebilir. Bluetooth ve Wi-Fi açık olmalıdır, internet bağlantısı ise yerel bağlantının ön koşulu değildir. İzin verilmezse uygulama bunu açık bir hata ile bildirir ve yerel kayıt işlevlerini kullanılabilir tutar. Bu sunumda bağlantı köprüsünün uygulanmış olmasını fiziksel menzil veya saha teslimi kanıtı olarak sunmuyoruz. İki telefonla saha testi sonraki adımdır.

Kaynak: app/android/app/src/main/java/com/bitchat/bridge/BitChatModule.kt. app/src/state/store.ts, startNetwork. 04-permission-denied.png.

## 8. İhtiyaç ve paylaşım aynı yerde

- İhtiyacım var
- Paylaşabilirim
- Kaynak türü, miktar ve açıklama
- Acil yardım puana bağlı değildir.

### Sunucu anlatımı

Dayanışma ekranında kullanıcı bir ihtiyacını duyurabiliyor veya paylaşabileceği bir kaynağı ilan edebiliyor. Su, gıda, barınma, sağlık ve enerji gibi kategoriler var. Miktar ve açıklama, diğer kişilerin kaydı anlamasını kolaylaştırıyor. Ekrandaki iki litre su paylaşımı, uygulamaya test sırasında girilen gerçek bir deneme kaydı. İlanla bağlı duyuru aynı yerel veritabanı işlemi içinde saklanıyor. Henüz otomatik kaynak eşleştirmesi veya tamamlanmış bir takas sistemi iddia etmiyoruz. İlk sunumdaki Bitchat Coin ise gelecekte değerlendirilebilecek katkı puanı fikri olarak duruyor. Acil yardımın hiçbir aşaması puan sahibi olma koşuluna bağlı değil.

Kaynak: app/src/ui/Screens.tsx, AidScreen. app/src/ui/Sheets.tsx, AidSheet. İlk sunum, sayfa 7. 08-solidarity.png.

## 9. Kişisel noktalar çevrimdışı kalır

- Adı ve koordinatıyla nokta kaydı
- Toplanma, su, sağlık ve tehlike etiketleri
- Yakınlaştırılabilen koordinat planı
- Resmi afet haritası veya yol tarifi içermez.

### Sunucu anlatımı

Harita ekranı ilk sürümde kişisel bir koordinat planı olarak çalışıyor. Kullanıcı bir noktaya ad verip koordinatını saklayabiliyor ve bunun bir buluşma yeri, su noktası, sağlık noktası veya tehlike olduğunu belirtebiliyor. Konum elle girilebildiği için konum izni verilmediğinde de bir kayıt oluşturmak mümkün. Noktalar cihazda kalıyor ve internet olmadan yeniden görüntülenebiliyor. Bu sürümde resmi hastane veya toplanma alanı veri seti bulunmuyor. Ekran gerçek yolları göstermiyor ve navigasyon sağlamıyor. Geçersiz koordinatın reddedilmesini ve geçerli noktanın işaret olarak görünmesini emülatörde kontrol ettik.

Kaynak: app/src/ui/MapCanvas.tsx. app/src/ui/Sheets.tsx, PointSheet. deliverables/VERIFICATION.md. 09-offline-map.png.

## 10. Pil azalınca ağ davranışı değişir

- %50 üstü veya şarjda: aktif taşıyıcı
- %20 - %50: yalnız acil aktarım
- %20 altı: keşif kapalı
- Gerçek pil tüketimi saha testinde ölçülecek.

### Sunucu anlatımı

Pil seviyesi düştüğünde uygulama ağ davranışını değiştiriyor. Yüzde ellinin üzerinde veya şarjdayken aktif taşıyıcı politikası kullanılıyor. Yüzde yirmi ile elli arasında keşif aralığı uzuyor ve yalnızca acil mesajlar aktarılıyor. Yüzde yirminin altında keşif kapanıyor. Mevcut bir bağlantıda yalnızca kullanıcının kendi SOS kaydına aktarım izni veriliyor. Ekran da siyah yüzeylere geçiyor. Emülatörde pil değerini yüzde on ikiye ayarlayarak bu durumu gördük. Bu kontrol bir pil ömrü ölçümü değil. Gerçek enerji tüketimini, telefon modelleri ve kullanım koşullarıyla birlikte sahada ölçmek gerekiyor. Ağ bu sürümde uygulama öndeyken çalışıyor.

Kaynak: app/src/core/AutonomousMeshEngine.ts. app/src/state/store.ts, scheduleDiscovery. app/App.tsx. 12-low-battery.png.

## 11. Kesintiyi tek telefonla denemek

- Kesilince paket bekler
- Bağlantı dönünce adım ilerler
- Sanal A, B ve C telefonları
- Bu ekran fiziksel radyo aktarımı kanıtı değildir.

### Sunucu anlatımı

Bir drone veya ikinci telefon olmadan da kavramı inceleyebilmek için izole bir ağ tatbikatı ekledik. Ekrandaki A, B ve C sanal telefonlardır. B’nin bağlantısını kapattığımızda SOS adımı ilerlemez. Bağlantıyı geri açıp yeniden çalıştırdığımızda paket sanal düğümler boyunca ilerler ve sonunda sanal alındı onayı oluşur. Düşük pil durumu da ayrıca denenebilir. Bu kayıtlar gerçek mesaj kuyruğuna karışmaz. Amaç, kesinti ve yeniden deneme davranışını anlaşılır bir yüzeyde göstermek. Bu ekranı bir Bluetooth menzil testi veya gerçek cihazlar arası teslim kanıtı olarak değerlendirmiyoruz.

Kaynak: app/src/core/exercise.ts. app/src/ui/Screens.tsx, ExerciseSheet. 05-exercise-recovery.png.

## 12. Dışa aktarma kullanıcının kontrolünde

- Yerel kayıtların JSON dosyası
- Android paylaşım seçicisi
- Kurum teslimi ayrı bir entegrasyondur.

### Sunucu anlatımı

Yerel kayıtları uygulamadan çıkarmak gerektiğinde kullanıcı bir JSON dosyası oluşturabiliyor. Ardından Android’in paylaşım seçicisi açılıyor ve dosyanın nasıl paylaşılacağına kullanıcı karar veriyor. Ekranda gördüğümüz dosya, bu akışın emülatörde oluşturduğu gerçek bir çıktı. Test sırasında herhangi bir alıcı seçmedik veya dosyayı bir kuruma göndermedik. Bu özellik, ilk vizyondaki kurum koordinasyonu için bir hazırlık adımı olarak düşünülebilir. Fakat otomatik AFAD veya belediye senkronizasyonu anlamına gelmez. Böyle bir entegrasyon için kurum uç noktası, yetkilendirme, veri sözleşmesi ve kurumdan dönen teslim doğrulaması ayrıca tasarlanmalı.

Kaynak: app/android/app/src/main/java/com/bitchat/bridge/BitChatModule.kt, exportData. 06-json-export.png. İlk sunum, sayfa 8.

## 13. İmza, kimlik ve kanal gizliliği

- Cihaz imzası: mesaj kaynağı ve bütünlük kontrolü
- Bağlantı kodu: iki telefonun karşılıklı onayı
- Ortak kanal: aktarıcılar metni okuyabilir

### Sunucu anlatımı

Güvenlik tarafında üç ayrımı açık tutuyoruz. Mesajlar cihazın Android Keystore içindeki anahtarıyla imzalanıyor. Bu imza cihaz kökenini ve mesajın bütünlüğünü kontrol etmeye yarıyor, kişinin görünen adını gerçek kimliğe dönüştürmüyor. Telefonlar arası bağlantıda kullanıcılar aynı doğrulama kodunu karşılaştırıyor. Nearby bağlantıları taşıma katmanında şifreleniyor. Bununla birlikte bu sürüm bir ortak kanal kullanıyor ve aktarıcı telefonlar iletilen metni okuyabiliyor. Dolayısıyla çok atlamalı uçtan uca gizli sohbet özelliği varmış gibi konuşmuyoruz. İlk sunumdaki bu hedef, ayrı bir gizlilik tasarımı ve doğrulama gerektiren sonraki çalışma alanı olarak duruyor.

Kaynak: app/android/app/src/main/java/com/bitchat/bridge/BitChatModule.kt, sign/verify. app/src/core/protocol.ts. README.md, ortak kanal kapsamı. İlk sunum, sayfa 5.

## 14. Doğrulanan hata durumları

- 50 otomatik test
- Bozuk paket, kesinti ve kayıt hataları
- Emülatörde çalışan APK
- Fiziksel telefon testi henüz yapılmadı.

### Sunucu anlatımı

Çalışan APK’nın yanında elli otomatik test bulunuyor. Testler paket boyutlarını, koordinat sınırlarını, atlama sayısını, öncelik sırasını, kesintiden sonra yeniden denemeyi ve alındı onayı olmadan durumun teslim edildi diye değişmemesini kapsıyor. Yerel köprüyü taklit eden testlerde kayıt hatalarını ve aynı anda gelen güncellemeleri de kontrol ettik. Bunları fiziksel disk veya radyo testiyle karıştırmıyoruz. Emülatörde uygulamayı kurduk, çevrimdışı kayıt, izin reddi, ilan, harita ve düşük pil akışlarını denedik. Klavye açıkken düğmenin örtülmesi hatasını bu incelemede bulup düzelttik. Bir sonraki kabul adımı, fiziksel telefonlarda gerçek bağlantı ve teslimi ölçmek.

Kaynak: deliverables/VERIFICATION.md. app/__tests__/core.test.ts. app/__tests__/store.test.ts. 10-keyboard-visible.png.

## 15. Bugünkü prototip ve sonraki hedefler

- Çalışan yerel çekirdek
- Fiziksel saha pilotu
- Resmi veri ve kurum entegrasyonu
- Uçtan uca gizlilik ve cihaz içi AI
- Bitchat Coin: gelecekte değerlendirilecek katkı puanı

### Sunucu anlatımı

İlk sunumdaki uzun vadeli vizyonu koruyoruz, fakat bugünkü ürün durumunu ayrı gösteriyoruz. Şu an kurulabilir Android uygulaması, çevrimdışı yerel kayıt, SOS, öncelik kuyruğu, kişisel noktalar, dayanışma ilanları ve yakın cihaz bağlantı köprüsü var. Sırada iki veya üç fiziksel telefonla saha pilotu, menzil ve pil ölçümü, farklı üreticilerde uyumluluk kontrolü bulunuyor. Resmi harita verileri, kurum API’leri, uçtan uca gizli sohbet ve cihaz içinde çalışan bir AI modeli sonraki geliştirme konuları. Bitchat Coin de uygulanmış bir para veya kripto varlık değil. Acil yardımdan bağımsız katkı puanı fikri olarak gelecekte değerlendirilir.

Kaynak: İlk sunum, sayfa 7, 8, 10 ve 11. README.md ve deliverables/VERIFICATION.md, kapsam sınırları.

## 16. Bir sonraki adım: saha pilotu

- Afet öncesi hazırlık
- Afet anında yerel dayanışma
- Çalışan prototipin fiziksel telefonlarla doğrulanması

### Sunucu anlatımı

BitChat’in amacı, afet öncesinde öğrenilebilen ve bağlantı kesildiğinde yerel işlemleri sürdürebilen bir dayanışma aracı oluşturmak. Bugün bu yaklaşımı gerçek Android ekranları ve kurulabilir bir APK üzerinden gösterebiliyoruz. Buradan sonraki adım, prototipi fiziksel telefonlarla denemek. Başarı ölçütümüz yalnızca bir bağlantı simgesinin yanması olmayacak. Mesajın hangi koşulda kaydedildiğini, hangi telefona ulaştığını, kesintide nasıl beklediğini ve pil azaldığında ne yaptığını ölçmek olacak. Kurumlarla paylaşılacak veri ve gizlilik ihtiyaçları da bu pilotun bulgularıyla netleşecek. İlk sunumdaki vizyonu, ölçülebilen saha davranışlarıyla ilerletmek istiyoruz.

Kaynak: İlk sunum, sayfa 11 ve 12. README.md. deliverables/VERIFICATION.md.
