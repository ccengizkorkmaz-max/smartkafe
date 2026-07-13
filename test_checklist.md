# SmartKafe Uçtan Uca Test Görev Listesi

SmartKafe Faz 3 ve Faz 4 geliştirmelerini doğrulamak için aşağıdaki test senaryolarını sırasıyla takip edebilirsiniz:

---

## 🗂️ AŞAMA 1: Kurye Tanımlama & Telegram Aktivasyonu (Faz 4)
- [ ] **1. Kurye Hesabı Oluşturma:** Canlı siteniz üzerinden yeni bir kullanıcı kaydı açın (`/admin/register`).
- [ ] **2. İlk Bot Teması (Güvenlik Kontrolü):** Oluşturduğunuz kurye botuna Telegram'dan girip herhangi bir şey yazın. Botun size chat ID numaranızla birlikte bir **[Profil Ayarlarına Git]** linki gönderdiğini doğrulayın.
- [ ] **3. Chat ID Kaydetme:** Linke tıklayarak profile gidin, botun gösterdiği Chat ID numarasını **Telegram Chat ID** alanına girip kaydedin.
- [ ] **4. Personel Ataması:** Yönetici hesabınızla admin paneline girip **"👥 Personel"** sekmesini açın. Kuryenizin adını aratıp bulun, rolünü **"Courier (Kurye)"** seçip işletmenize ekleyin.
- [ ] **5. Aktiflik (Online/Offline) Durum Testi:**
  - Kurye olarak Telegram botuna `/offline` yazın. Admin panelinde kurye isminin yanındaki ışığın griye döndüğünü ve kurye atama listesinde `🔴` göründüğünü doğrulayın.
  - Kurye olarak Telegram botuna `/online` yazın. Admin panelinde ışığın yeşile döndüğünü ve listede `🟢` aktifleştiğini doğrulayın.

---

## 🗺️ AŞAMA 2: Paket Servis & Poligon Kontrolü (Faz 4)
- [ ] **1. Dış Bölge Sipariş Engeli:** Müşteri sepet ekranına girip ödeme adımında "Paket Servis" seçin. Adres kutusuna **"Beşiktaş"** veya **"Bebek"** yazın. Sistemin servis dışı uyarısı vererek siparişi engellediğini doğrulayın.
- [ ] **2. İç Bölge Sipariş Doğrulaması:** Adres kutusuna simülatördeki **"Moda"** veya **"Kadıköy"** adreslerinden birini yazıp seçin.
- [ ] **3. Servis Ücreti Kontrolü:** Belirlenen teslimat ücretinin (₺15) sepete eklendiğini ve minimum sepet tutarı kontrolünün başarıyla çalıştığını doğrulayın.
- [ ] **4. Sipariş Tamamlama:** "Kapıda Nakit" seçeneğiyle siparişi tamamlayın.

---

## 🚚 AŞAMA 3: Dispatcher & Telegram Webhook Entegrasyonu (Faz 4)
- [ ] **1. Siparişin Panale Düşmesi:** Yönetici panelinde **"Kurye Dağıtım"** sekmesini açın. Yeni gelen paket servis siparişinin kartını inceleyin.
- [ ] **2. Kurye Seçimi ve Atama:** Dropdown menüsünden `🟢 [Online]` durumdaki kuryenizi seçip **"Ata"** butonuna basın.
- [ ] **3. Telegram Anlık Bildirimi:** Kuryenin telefonuna Telegram üzerinden sipariş detayları (Müşteri adı, adres, tutar, kapıda ödeme yöntemi, yol tarifi linki) ve butonların anında ulaştığını doğrulayın.
- [ ] **4. Webhook Statü Güncellemesi:**
  - Telegram'da **`🚚 Yoldayım`** butonuna basın. Admin panelinde sipariş durumunun anında **"Yolda"** statüsüne geçtiğini doğrulayın.
  - Telegram'da **`✓ Teslim Ettim`** butonuna basın. Siparişin admin panelinden otomatik kapandığını, sipariş durumunun `paid` (Ödendi) yapıldığını doğrulayın.

---

## 🍽️ AŞAMA 4: QR Masa Güvenliği & Hesap Bölüşme (Faz 3)
- [ ] **1. QR Token Rotasyonu:** Admin panelinde `/admin/qr-generator` sayfasına girin. **"Tokenları Yenile"** butonuna basın. Eski basılmış masa QR linklerinin hemen geçersiz kaldığını, yeni üretilen tokenlı linklerin çalıştığını test edin.
- [ ] **2. Kişi Başı Hesap Bölüşme:** Bir masaya sipariş ekleyin. Müşteri ekranında sepete girip "Hesabı Bölüş" butonuna basın. 2 kişi seçip kısmi ödeme yapın. Kalan adisyon tutarının düştüğünü doğrulayın.
- [ ] **3. Ürün Bazlı Hesap Bölüşme:** Masadaki adisyondan sadece belirli ürünleri seçerek ödeme yapın. Seçilen ürünlerin adisyondan düşüldüğünü doğrulayın.

---

## 📊 AŞAMA 5: Ciro Raporu & Termal Slip Z-Raporu (Faz 3)
- [ ] **1. Ciro Raporu:** `/admin/reports` sayfasına girin. Günlük ciro, ödeme dağılım grafikleri ve popüler ürünler listesinin yaptığınız test siparişlerine göre güncellendiğini doğrulayın.
- [ ] **2. Termal Slip Z-Raporu Baskısı:** Sayfadaki **"Z-Raporu Yazdır"** butonuna basın. Tarayıcının yazdırma önizlemesinde 80mm'lik adisyon slip formatına uygun, çıktısı tertemiz bir Z-Raporu tasarımının belirdiğini doğrulayın.
