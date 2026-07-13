# SmartKafe Uçtan Uca Bütünsel Test Görev Listesi

Bu test listesi, SmartKafe projesinde Faz 1'den Faz 4'e kadar geliştirilen tüm modülleri kapsar. Sırasıyla her adımı test ederek sistemi doğrulayabilirsiniz.

---

## 🏗️ FAZ 1: Altyapı, Onboarding & Seçenekli Menü

### 1. Kayıt ve İşletme Kurulumu (Onboarding)
- [ ] **Kullanıcı Kaydı:** `/admin/register` adresine gidin. E-posta ve şifrenizle kayıt olun.
- [ ] **İşletme Onboarding:** Kayıt sonrası yönlendirilen kurulum sayfasında işletme adı (örn: `Kadıköy Kahvesi`) ve web adresi (slug: `kadikoykahve`) belirleyin.
- [ ] **Onboarding RLS Yetkisi:** Kayıt olan kullanıcının veritabanında otomatik `owner` (Kurucu) yapıldığını ve `/admin/dashboard` sayfasına yönlendiğini doğrulayın.

### 2. Kategori & Seçenekli Ürün Yönetimi
- [ ] **Ürün Ekleme:** Ürünler sayfasına gidip "Yeni Ürün Ekle" deyin. İsim, kategori, açıklama, fiyat, görsel URL, kalori ve alerjen etiketleri (Gluten, Süt vb.) girip kaydedin.
- [ ] **Seçenek Grubu (Modifier Group) Oluşturma:** Eklediğiniz bir ürüne (örn: *Latte*) seçenek grubu oluşturun:
  - İsim: *Süt Tercihi*
  - Zorunlu mu: *Evet*
  - Minimum/Maximum Seçim: *1 / 1* (Sadece bir tane seçebilmeli)
- [ ] **Seçenek Detayları (Modifier Items):** Bu gruba seçenekler ekleyin:
  - *Tam Yağlı Süt* (Fiyat Farkı: ₺0)
  - *Yulaf Sütü* (Fiyat Farkı: ₺15)
  - *Badem Sütü* (Fiyat Farkı: ₺20)
- [ ] **Çoklu Seçim Grubu:** Ekstra malzemeler için opsiyonel, min: 0, max: 3 seçilebilir grup oluşturup seçenekleri ekleyin.

### 3. Müşteri Menü Arayüzü & Sepet Kontrolü
- [ ] **Masa Menü Girişi:** `/kadikoykahve` (müşteri menü adresi) sayfasına gidin.
- [ ] **Alerjen ve Kalori Görünümü:** Ürün kartlarında kalori değeri ve alerjen uyarı logolarının göründüğünü doğrulayın.
- [ ] **Seçenek Seçim Penceresi:** Ürüne tıkladığınızda seçenek detay penceresinin açıldığını; zorunlu olan grubun seçilmeden sepete eklemeye izin vermediğini doğrulayın.
- [ ] **Sepet Hesaplama:** Yulaf sütü (+₺15) seçildiğinde ürün fiyatının sepet toplamına doğru yansıdığını kontrol edin.

---

## 🍽️ FAZ 2: KDS (Mutfak Ekranı) & Masa Yönetimi

### 1. İnteraktif Masa Haritası & Çağrılar
- [ ] **Masa Oluşturma:** QR kod oluşturucu ekranından sisteme masalar tanımlayın (Masa 1, Masa 2 vb.).
- [ ] **Masa Çağrısı Gönderme:** Müşteri menü ekranının altındaki **"Garson Çağır"** veya **"Hesap İste"** butonlarına basın.
- [ ] **Masa Haritası Alarmı:** `/admin/dashboard` Masa Haritası sekmesinde, çağrı yapılan masanın **kırmızı renkte yanıp sönerek** uyarı verdiğini doğrulayın.
- [ ] **Çağrı Kapatma:** Masa kartına tıklayıp gelen çağrıyı panelden temizleyin (dismiss).

### 2. Masa Yönetim Detayları
- [ ] **Masaya Sipariş Girme:** Müşteri QR kodunu okutup Masa 1 adına birkaç ürün sipariş etsin. Masa Haritasında masanın renginin **Sarı (Aktif Sipariş)** olduğunu doğrulayın.
- [ ] **Panelden Ürün Ekleme:** Masa kartına tıklayarak açılan detay penceresinden masaya manuel olarak ürün ekleyin ve adisyona yansıdığını kontrol edin.
- [ ] **İskonto (İndirim) Tanımlama:** Masaya yüzde bazlı (örn: %10) veya tutar bazlı (örn: ₺50) iskonto girin. Toplam tutarın düştüğünü doğrulayın.
- [ ] **Masa Taşıma:** Masa 1 adisyonunu boş olan Masa 5'e taşıyın. Masa 1'in boşaldığını ve adisyonun Masa 5'e geçtiğini doğrulayın.
- [ ] **Masa Birleştirme:** Masa 5'in adisyonunu aktif durumdaki Masa 2 ile birleştirin. Adisyonların bir araya toplandığını doğrulayın.

### 3. Mutfak Takip Sistemi (KDS - Kitchen Display)
- [ ] **KDS Sipariş Kartı:** Masadan sipariş gönderildiği an **Mutfak Takip (KDS)** sekmesine sipariş kartının düştüğünü doğrulayın.
- [ ] **İstasyon Filtreleme:** KDS Ayarlarından istasyonunuzu sadece "Coffee" kategorisini izleyecek şekilde kısıtlayın. Yemek ve tatlı siparişlerinin bu istasyondan gizlendiğini doğrulayın.
- [ ] **Gecikme Alarmları:** Sipariş hazırlama sınırını 1 dakika yapın. 1 dakika içinde tamamlanmayan KDS kartlarının kırmızı renkte yanıp sönerek (pulse glow) şefi uyardığını test edin.
- [ ] **Sipariş Tamamlama:** Sipariş kartındaki "Hazır" butonuna tıklayarak siparişi KDS'ten gönderin.

---

## 💳 FAZ 3: Kasa & Hesap Yönetimi

### 1. QR Güvenlik & Token Rotasyonu
- [ ] **QR Token Rotasyonu:** `/admin/qr-generator` sayfasına gidin. **"Tokenları Yenile"** butonuna basın.
- [ ] **Eski QR Kod İptali:** Daha önceden alınmış bir masa adresi linkini (eski tokenlı) açmayı deneyin. Sistem tarafından QR kodun geçersiz olduğunu ve sipariş verilemeyeceğini belirten güvenlik uyarısını görün.
- [ ] **Yeni QR Kod Doğrulaması:** Yeni üretilen tokenlı masa linkinin başarıyla açıldığını ve sipariş alabildiğini doğrulayın.

### 2. Hesap Bölüşme (Split Bill) Modülü
- [ ] **Kişi Başı Bölüşme:** Masada aktif adisyon varken, müşteri ekranından "Hesabı Bölüş" modalını açın. Toplam tutarı 3 kişiye bölün. Bir kişinin payı olan online ödemeyi yapın. Kalan adisyon tutarının 2/3 oranında azaldığını doğrulayın.
- [ ] **Ürün Bazlı Bölüşme:** Modal içinden ürün bazlı seçeneği seçip, adisyondaki sadece belirli ürünleri (örn: 1 adet Cheesecake) işaretleyip ödeyin. Kalan hesapta sadece ödenmeyen ürünlerin listelendiğini doğrulayın.

### 3. Ciro Analiz & Termal Z-Raporu
- [ ] **Ciro Takibi:** `/admin/reports` sayfasına girin. Günlük ciro, ortalama sepet tutarı, ödeme tipi grafikleri ve en çok satan ürünlerin güncellendiğini doğrulayın.
- [ ] **Thermal Z-Raporu:** Sayfadaki **"Z-Raporu Yazdır"** butonuna basın. Tarayıcının yazdırma önizlemesinde 80mm'lik termal slip formatına tam uyumlu, adisyon yazıcısından çıkartılabilecek şablonu inceleyin.

---

## 🚚 FAZ 4: Paket Servis & Kurye Dağıtım

### 1. Coğrafi Poligon & Paket Servis Checkout
- [ ] **Servis Dışı Teslimat:** Müşteri sepet ekranında ödeme seçeneğini "Paket Servis" olarak belirleyin. Adres alanına Kadıköy poligonu dışında kalan **"Beşiktaş"** veya **"Bebek"** yazın. Sistemin gönderim alanı dışı uyarısı verdiğini ve siparişi engellediğini doğrulayın.
- [ ] **Servis İçi Teslimat:** Adrese **"Moda"** veya **"Kadıköy"** yazıp seçin.
- [ ] **Teslimat Ücreti & Minimum Sepet:** Adres seçildikten sonra belirlenen teslimat ücretinin (₺15) sepete otomatik eklendiğini ve minimum sepet limit kontrolünün başarıyla çalıştığını doğrulayın.
- [ ] **Kapıda Ödeme Siparişi:** Ödeme yöntemini "Kapıda Nakit" seçerek siparişi tamamlayın.

### 2. Kurye Tanımlama & Telegram Entegrasyonu
- [ ] **Kurye Kaydı:** Bir kurye hesabı açın (`/admin/register`). Telegram'da kurye botunuza girip `/start` yazın. Profil bulunamadı uyarısını ve **[Profil Ayarlarına Git]** linkini görün.
- [ ] **Chat ID Kaydı:** Linke tıklayıp kuryenin profil sayfasına gidin, Telegram Chat ID değerini girip kaydedin.
- [ ] **Personel Ataması:** Yönetici hesabınızla paneldeki **"Personel"** sekmesine girip, kuryenizi aratın ve rolünü **"Courier (Kurye)"** olarak işletmeye ekleyin.
- [ ] **Aktiflik (Online/Offline) Durum Testi:**
  - Kurye olarak Telegram botuna `/offline` yazın. Yönetici panelinde kurye isminin solundaki ışığın griye döndüğünü ve kurye atama listesinde `🔴` göründüğünü doğrulayın.
  - Kurye olarak Telegram botuna `/online` yazın. Yönetici panelinde durum ışığının yeşile döndüğünü ve listede `🟢` aktifleştiğini doğrulayın.

### 3. Kurye Dağıtım (Dispatcher) & Webhook Akışı
- [ ] **Sipariş Atama:** Kasa yönetim panelindeki **"Kurye Dağıtım"** sekmesini açın. Gelen siparişe listedeki aktif (`🟢`) kuryeyi atayın.
- [ ] **Anlık Telegram Bildirimi:** Kuryenin telefonuna Telegram üzerinden sipariş detaylarının (Müşteri bilgisi, tutar, adres, ödeme yöntemi, yol tarifi linki) ve interaktif butonların ulaştığını doğrulayın.
- [ ] **Webhook Statü Güncellemesi:**
  - Telegram botunda **`🚚 Yoldayım`** butonuna basın. Yönetici panelinde sipariş durumunun anında **"Yolda"** statüsüne geçtiğini doğrulayın.
  - Telegram botunda **`✓ Teslim Ettim`** butonuna basın. Siparişin kasadan anında kapandığını, sipariş ve ödeme durumunun `paid` (Ödendi) yapıldığını ve Z-Raporu ciro verilerine yansıdığını doğrulayın.
