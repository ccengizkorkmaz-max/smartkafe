
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Image from "next/image"
import { ArrowLeft, Save, Upload, Loader2, Store } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function ProfilePage() {
    const [store, setStore] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [logoUrl, setLogoUrl] = useState("")

    useEffect(() => {
        const fetchStore = async () => {
            const { data } = await supabase.from("stores").select("*").single()
            if (data) {
                setStore(data)
                setName(data.name)
                setSlug(data.slug)
                setLogoUrl(data.logo_url || "")
            }
            setLoading(false)
        }
        fetchStore()
    }, [])

    const handleSave = async () => {
        setSaving(true)

        // Check if slug is taken
        const { data: existing } = await supabase
            .from("stores")
            .select("id, slug")
            .eq("slug", slug)
            .neq("id", store.id) // Exclude current store
            .maybeSingle()

        if (existing) {
            // Generate suggestion
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
            toast.success("Profil güncellendi")
        }
        setSaving(false)
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${store.id}-${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        setUploading(true)

        try {
            // Upload
            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get Public URL
            const { data } = supabase.storage.from('logos').getPublicUrl(filePath)

            setLogoUrl(data.publicUrl)
            toast.success("Logo yüklendi, kaydetmeyi unutmayın!")
        } catch (error: any) {
            toast.error("Yükleme hatası: " + error.message)
        } finally {
            setUploading(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/admin/dashboard">
                        <Button variant="outline" size="icon" className="rounded-full">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold">İşletme Profili</h1>
                </div>

                <Card className="border-white/5 bg-card/40 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Genel Bilgiler</CardTitle>
                        <CardDescription>İşletmenizin müşteriler tarafından görünen bilgileri.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Logo Section */}
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-xl bg-black/20">
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
                            <p className="text-xs text-muted-foreground mt-2">Önerilen: 500x500px, Kare format</p>
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
                                    <span className="text-sm text-muted-foreground">smartkafe.com/</span>
                                    <Input
                                        value={slug}
                                        onChange={e => setSlug(e.target.value)}
                                        className="bg-secondary/50 border-transparent h-12 font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button className="w-full h-12 text-lg font-bold" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                            Değişiklikleri Kaydet
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
