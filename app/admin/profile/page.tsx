"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Image from "next/image"
import { ArrowLeft, Save, Upload, Loader2, Store, Send, User } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
    const router = useRouter()
    const [store, setStore] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [savingUser, setSavingUser] = useState(false)
    const [uploading, setUploading] = useState(false)
    
    // Store profile states
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [logoUrl, setLogoUrl] = useState("")
    const [memberRole, setMemberRole] = useState("")

    // User profile states
    const [userFullName, setUserFullName] = useState("")
    const [tgChatId, setTgChatId] = useState("")

    useEffect(() => {
        const fetchStoreAndProfile = async () => {
            // 1. Check Auth & Wait for Session
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push("/admin/login")
                return
            }

            // 2. Fetch User Profile Details
            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .maybeSingle()

            if (profile) {
                setUserFullName(profile.full_name || "")
                setTgChatId(profile.telegram_chat_id || "")
            }

            // 3. Fetch Store Membership
            const { data: member, error: memberError } = await supabase
                .from("store_members")
                .select("store_id, role, stores(*)")
                .eq("user_id", session.user.id)
                .maybeSingle()

            if (member) {
                setMemberRole(member.role)
                const rawStore = Array.isArray(member.stores) ? member.stores[0] : member.stores
                if (rawStore) {
                    setStore(rawStore)
                    setName(rawStore.name)
                    setSlug(rawStore.slug)
                    setLogoUrl(rawStore.logo_url || "")
                }
            }
            setLoading(false)
        }
        fetchStoreAndProfile()
    }, [router])

    const handleSaveStore = async () => {
        if (!store) return
        setSaving(true)

        // Check if slug is taken
        const { data: existing } = await supabase
            .from("stores")
            .select("id, slug")
            .eq("slug", slug)
            .neq("id", store.id) // Exclude current store
            .maybeSingle()

        if (existing) {
            const suggestion = `${slug}-${Math.floor(Math.random() * 1000)}`
            toast.error(`"${slug}" adresi zaten kullanımda.`)
            toast.info(`Öneri: "${suggestion}" kullanılsın mı?`, {
                action: {
                    label: "Evet, Kullan",
                    onClick: () => setSlug(suggestion)
                },
                duration: 8000
            })
            setSaving(false)
            return
        }

        const { error } = await supabase
            .from("stores")
            .update({ name, slug, logo_url: logoUrl })
            .eq("id", store.id)

        if (error) {
            toast.error("Güncelleme başarısız: " + error.message)
        } else {
            toast.success("İşletme profili güncellendi")
        }
        setSaving(false)
    }

    const handleSaveUserProfile = async () => {
        setSavingUser(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { error } = await supabase
            .from("profiles")
            .update({ 
                full_name: userFullName, 
                telegram_chat_id: tgChatId 
            })
            .eq("id", session.user.id)

        if (error) {
            toast.error("Profil güncelleme başarısız: " + error.message)
        } else {
            toast.success("Kişisel profiliniz ve Telegram bağlantınız kaydedildi.")
        }
        setSavingUser(false)
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${store.id}-${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        setUploading(true)

        try {
            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage.from('logos').getPublicUrl(filePath)

            setLogoUrl(data.publicUrl)
            toast.success("Logo yüklendi, kaydetmeyi unutmayın!")
        } catch (error: any) {
            toast.error("Yükleme hatası: " + error.message)
        } finally {
            setUploading(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse">Yükleniyor...</div>

    const isAdmin = memberRole === 'owner' || memberRole === 'manager'

    return (
        <div className="min-h-screen bg-background p-6 text-foreground pb-20">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/admin/dashboard">
                        <Button variant="outline" size="icon" className="rounded-full border-white/10 hover:bg-white/5">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold">Profil Ayarları</h1>
                </div>

                {/* Card 1: User personal profile & Telegram sync */}
                <Card className="border-white/5 bg-card/40 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><User className="w-5 h-5 text-primary" /> Kişisel Profil & Telegram Kurye Bağlantısı</CardTitle>
                        <CardDescription>Kendi bilgileriniz ve teslimat siparişi Telegram bildirim ayarları.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Adınız Soyadınız</label>
                                <Input
                                    value={userFullName}
                                    onChange={e => setUserFullName(e.target.value)}
                                    className="bg-secondary/50 border-transparent h-12"
                                />
                            </div>

                            <div className="space-y-3 pt-3 border-t border-white/5">
                                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <Send className="w-4 h-4 text-blue-400" /> Telegram Chat ID (Kurye / Çalışan)
                                </label>
                                <Input
                                    value={tgChatId}
                                    placeholder="Örn: 948291038"
                                    onChange={e => setTgChatId(e.target.value)}
                                    className="bg-secondary/50 border-transparent h-12 font-mono"
                                />
                                
                                <div className="p-4 bg-zinc-950/40 rounded-xl border border-white/5 space-y-2.5 text-xs text-zinc-400">
                                    <div className="font-bold text-white">Telegram Bildirimlerini Etkinleştirmek İçin:</div>
                                    <ol className="list-decimal pl-4 space-y-1.5">
                                        <li>Telegram uygulamasında <strong>@userinfobot</strong> botuna mesaj atarak chat ID numaranızı öğrenin ve yukarıdaki alana girin.</li>
                                        <li>SmartKafe Bildirim Botu bağlantısını açıp <strong>/start</strong> komutunu gönderin: <a href="https://t.me/smartkafe_kurye_bot" target="_blank" rel="noreferrer" className="text-blue-400 font-semibold hover:underline">@smartkafe_kurye_bot</a></li>
                                        <li>İşletme yöneticisi siparişinizi kurye olarak atadığında tüm detaylar anında telefonunuza iletilecektir.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        <Button className="w-full h-12 text-base font-bold bg-white text-black hover:bg-zinc-200" onClick={handleSaveUserProfile} disabled={savingUser}>
                            {savingUser ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                            Kişisel Bilgilerimi Kaydet
                        </Button>
                    </CardContent>
                </Card>

                {/* Card 2: Store details (Only if Owner/Manager) */}
                {store && isAdmin && (
                    <Card className="border-white/5 bg-card/40 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg"><Store className="w-5 h-5 text-zinc-300" /> İşletme Profili</CardTitle>
                            <CardDescription>İşletmenizin müşteriler tarafından görünen genel bilgileri.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Logo Section */}
                            <div className="flex flex-col items-center justify-center p-6 border border-white/5 rounded-xl bg-black/20">
                                {logoUrl ? (
                                    <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4 border-2 border-primary/20 shadow-2xl">
                                        <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center mb-4 text-muted-foreground">
                                        <Store className="w-12 h-12 opacity-20" />
                                    </div>
                                )}

                                <div className="relative">
                                    <Button variant="secondary" size="sm" disabled={uploading}>
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                        {uploading ? "Yükleniyor..." : "Logo Yükle"}
                                    </Button>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2">Önerilen: 500x500px, Kare format</p>
                            </div>

                            {/* Form Fields */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">İşletme Adı</label>
                                    <Input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="bg-secondary/50 border-transparent h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">URL Kısa Adı (Slug)</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground font-mono">smartkafe.com/</span>
                                        <Input
                                            value={slug}
                                            onChange={e => setSlug(e.target.value)}
                                            className="bg-secondary/50 border-transparent h-12 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full h-12 text-base font-bold bg-white text-black hover:bg-zinc-200" onClick={handleSaveStore} disabled={saving}>
                                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                İşletme Bilgilerini Kaydet
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
