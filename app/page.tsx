"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight, QrCode, Smartphone, Zap, ChefHat, Check, BarChart3, LayoutDashboard } from "lucide-react"
import Image from "next/image"

export default function Home() {
  const features = [
    {
      icon: <QrCode className="w-6 h-6 text-blue-400" />,
      title: "QR Kod Menü",
      description: "Müşterileriniz masadaki QR kodu okutarak menünüze anında ulaşsın. Uygulama indirmek yok."
    },
    {
      icon: <Smartphone className="w-6 h-6 text-purple-400" />,
      title: "Temassız Sipariş",
      description: "Garson beklemeden cepten sipariş verme konforu. Siparişler anında ekrana düşsün."
    },
    {
      icon: <ChefHat className="w-6 h-6 text-orange-400" />,
      title: "Mutfak Paneli",
      description: "Gelen siparişleri anlık bildirimlerle takip edin, hazırlayın ve tamamlayın."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-green-400" />,
      title: "Garson Çağırma",
      description: "Müşterileriniz tek tıkla garson çağırabilir veya hesap isteyebilir."
    }
  ]

  const faqs = [
    {
      q: "SmartKafe nasıl çalışır?",
      a: "Çok basit! İşletme profilinizi oluşturup menünüzü yüklersiniz. Size özel üretilen QR kodları masalarınıza yapıştırırsınız. Müşterileriniz kamerayla kodu okutup saniyeler içinde sipariş verir. Siparişler anında mutfak/kasa panelinize düşer."
    },
    {
      q: "Hangi tür işletmeler için uygundur?",
      a: "Kafe, restoran, bar, plaj işletmeleri, oteller, çay bahçeleri ve hatta food court'lar için idealdir. Masaya servis yapan veya 'gel-al' çalışan tüm yeme-içme işletmeleri kullanabilir."
    },
    {
      q: "Müşterilerin uygulama indirmesi gerekir mi?",
      a: "Hayır! SmartKafe tamamen web tabanlıdır. Müşterileriniz sadece telefon kamerasını açıp QR kodu okutur. Instagram, WhatsApp veya herhangi bir tarayıcı üzerinden menü anında açılır."
    },
    {
      q: "Gerçekten tamamen ücretsiz mi?",
      a: "Evet. SmartKafe şu an tüm özellikleri ile %100 ücretsizdir. Kurulum ücreti, aylık abonelik veya komisyon yoktur."
    },
    {
      q: "Mevcut pos sistemimle entegre çalışır mı?",
      a: "SmartKafe bağımsız bir bulut sistemdir. Mevcut sisteminize dokunmadan, paralel olarak ("ekstra bir sipariş kanalı" gibi) çalışabilir. Kurulum gerektirmez."
    }
  ]

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-primary/30">

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-bold">SK</div>
            <span className="font-bold text-lg tracking-tight">SmartKafe</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/smartkafem?table=1" className="text-sm text-muted-foreground hover:text-white transition-colors hidden sm:block">Demo Mağaza</Link>
            <Link href="/admin/login">
              <Button size="sm" className="font-semibold">Giriş Yap</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-30 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-green-400 mb-6">
              ✨ Tamamen Ücretsiz QR Menü Sistemi
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              Siparişleri<br /> Hızlandırın.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              SmartKafe ile işletmenizi hiçbir ücret ödemeden dijitalleştirin. QR menü, temassız sipariş ve mutfak paneli tamamen ücretsiz.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/admin/login">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform bg-green-600 hover:bg-green-500 text-white">
                  Ücretsiz Başlayın <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/smartkafem?table=1">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full bg-transparent border-white/10 hover:bg-white/5 hover:text-white">
                  Demoyu İncele
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Hero Image Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 50, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative w-full max-w-5xl perspective-1000"
          >
            <div className="relative rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl p-2 md:p-4">
              {/* Fake UI Header */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1 rounded-full bg-black/50 border border-white/10 text-[10px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Canlı Sipariş Akışı
              </div>

              {/* Grid of screens */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[400px] overflow-hidden rounded-xl bg-black/50 p-4">

                {/* Screen 1: Mobile Customer Interface */}
                <div className="relative bg-[#09090b] rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-xl">
                  {/* Fake Mobile Header */}
                  <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-white/5">
                    <div className="w-20 h-3 bg-white/10 rounded-full" />
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-[10px]">🍔</span>
                    </div>
                  </div>
                  {/* Fake Mobile Content */}
                  <div className="p-4 space-y-4 flex-1">
                    {/* Hero Item */}
                    <div className="w-full aspect-video bg-zinc-800 rounded-xl overflow-hidden relative group">
                      <Image
                        src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60"
                        alt="Burger"
                        fill
                        className="object-cover opacity-80"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-white font-bold">
                        🔥 Popüler
                      </div>
                    </div>
                    {/* Menu List */}
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3 items-center">
                          <div className="w-12 h-12 bg-zinc-800 rounded-lg flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="w-2/3 h-2 bg-white/20 rounded-full" />
                            <div className="w-1/3 h-2 bg-white/10 rounded-full" />
                          </div>
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">+</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Fake Mobile Nav */}
                  <div className="h-12 border-t border-white/5 flex items-center justify-center gap-6">
                    <div className="w-1/3 h-1 bg-white/20 rounded-full" />
                  </div>
                </div>

                {/* Screen 2: Admin Dashboard (Main) */}
                <div className="col-span-2 bg-[#09090b] rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-xl">
                  {/* Fake Admin Header */}
                  <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="w-32 h-2 bg-white/10 rounded-full" />
                  </div>

                  {/* Fake Admin Content */}
                  <div className="p-6 flex-1 bg-grid-white/[0.02]">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold">Canlı Siparişler</h3>
                      <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">● Sistem Aktif</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Order Card 1 */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                        <div className="flex justify-between mb-3">
                          <span className="font-bold text-lg">Masa 4</span>
                          <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">Hazırlanıyor</span>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="text-sm text-muted-foreground flex justify-between"><span>2x Latte</span> <span>180₺</span></div>
                          <div className="text-sm text-muted-foreground flex justify-between"><span>1x Cheesecake</span> <span>150₺</span></div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-8 bg-green-500/20 rounded w-full" />
                        </div>
                      </div>

                      {/* Order Card 2 (Pending) */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden opacity-60">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gray-500" />
                        <div className="flex justify-between mb-3">
                          <span className="font-bold text-lg">Masa 7</span>
                          <span className="text-xs text-gray-400">Yeni</span>
                        </div>
                        <div className="space-y-2">
                          <div className="w-3/4 h-2 bg-white/10 rounded" />
                          <div className="w-1/2 h-2 bg-white/10 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">İşletmeniz İçin Tam Çözüm</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Modern bir işletmenin ihtiyacı olan tüm dijital araçlar SmartKafe'de.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Nasıl Çalışır?</h2>
              <div className="space-y-8">
                {[
                  { step: "01", title: "Hesabınızı Oluşturun", desc: "Saniyeler içinde kayıt olun ve işletme profilinizi oluşturun." },
                  { step: "02", title: "Menünüzü Yükleyin", desc: "Ürünlerinizi, fiyatlarını ve fotoğraflarını panele ekleyin." },
                  { step: "03", title: "QR Kodları Masalara Koyun", desc: "Sistemden aldığınız QR kodları çıktı alıp masalarınıza yerleştirin." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold font-mono">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-1">{item.title}</h4>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative h-[400px] rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 p-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-grid-white/[0.02]" />
              <QrCode className="w-48 h-48 text-white/5" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

    </section>

      {/* FAQ Section */ }
  <section className="py-24 bg-zinc-900/30 border-y border-white/5">
    <div className="max-w-4xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Sıkça Sorulan Sorular</h2>
        <p className="text-muted-foreground">Aklınıza takılan soruların cevaplarını burada bulabilirsiniz.</p>
      </div>

      <div className="grid gap-6">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <h3 className="text-lg font-bold mb-3 flex items-start gap-3">
              <span className="text-primary mt-1">
                <Check className="w-5 h-5" />
              </span>
              {faq.q}
            </h3>
            <p className="text-muted-foreground pl-8 leading-relaxed">
              {faq.a}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>

  {/* CTA Section */ }
  <section className="py-24">
    <div className="max-w-4xl mx-auto px-6 text-center">
      <div className="p-10 md:p-16 rounded-3xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/20">
        <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">Hemen Ücretsiz Kullanmaya Başlayın</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          Kredi kartı gerekmez, kurulum ücreti yok, aylık ödeme yok. SmartKafe işletmeniz için tamamen ücretsizdir.
        </p>
        <Link href="/admin/login">
          <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-2xl shadow-primary/30 hover:scale-105 transition-transform bg-white text-black hover:bg-gray-200">
            Ücretsiz Hesap Oluştur
          </Button>
        </Link>
      </div>
    </div>
  </section>

  {/* Footer */ }
  <footer className="border-t border-white/5 py-10 text-center text-sm text-muted-foreground">
    <p>© 2024 SmartKafe. Tüm hakları saklıdır.</p>
  </footer>
    </div >
  );
}
