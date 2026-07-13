"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Loader2, Store, Sparkles, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"

export default function AdminOnboarding() {
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const checkExistingStore = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push("/admin/login")
                return
            }

            // Check if user is already a member of a store
            const { data: member } = await supabase
                .from("store_members")
                .select("store_id")
                .eq("user_id", session.user.id)
                .maybeSingle()

            if (member) {
                // Already has a store, go straight to dashboard
                router.push("/admin/dashboard")
            } else {
                setCheckingAuth(false)
            }
        }
        checkExistingStore()
    }, [router])

    const handleCreateStore = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        // Basic slug validation: lowercase alphanumeric and hyphens only
        const formattedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")
        if (!formattedSlug) {
            toast.error("Geçersiz web adresi.")
            setSubmitting(false)
            return
        }

        try {
            // Check if slug is unique
            const { data: existing } = await supabase
                .from("stores")
                .select("id")
                .eq("slug", formattedSlug)
                .maybeSingle()

            if (existing) {
                toast.error(`"${formattedSlug}" adresi zaten kullanımda. Lütfen başka bir adres deneyin.`)
                setSubmitting(false)
                return
            }

            // Insert new store.
            // Due to the DB trigger 'on_store_created', the authenticated user 
            // will automatically be inserted as 'owner' in the 'store_members' table.
            const { data: store, error: storeError } = await supabase
                .from("stores")
                .insert({
                    name: name.trim(),
                    slug: formattedSlug
                })
                .select()
                .single()

            if (storeError) throw storeError

            toast.success("İşletmeniz başarıyla kuruldu! Kontrol paneline aktarılıyorsunuz...")
            router.push("/admin/dashboard")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "İşletme kaydı sırasında bir hata oluştu.")
        } finally {
            setSubmitting(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/admin/login")
    }

    // Dynamic slug preview as they type
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setName(val)
        // Auto-generate slug suggestion from name
        const suggestedSlug = val
            .toLowerCase()
            .replace(/ı/g, "i")
            .replace(/ğ/g, "g")
            .replace(/ü/g, "u")
            .replace(/ş/g, "s")
            .replace(/ö/g, "o")
            .replace(/ç/g, "c")
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
        setSlug(suggestedSlug)
    }

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#020202] text-white p-4">
                <Loader2 className="h-12 w-12 animate-spin text-green-500 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Kullanıcı kontrol ediliyor...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020202] text-white p-4 relative selection:bg-primary/30">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-green-500/10 blur-[100px] rounded-full pointer-events-none" />

            <Button variant="ghost" onClick={handleLogout} className="absolute top-4 right-4 text-muted-foreground hover:text-white">
                <LogOut className="mr-2 h-4 w-4" />
                Çıkış Yap
            </Button>
            
            <Card className="w-full max-w-md border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="bg-green-500/10 p-2 rounded-xl border border-green-500/20">
                            <Store className="w-6 h-6 text-green-500" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-white">İşletmenizi Kurun</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        SmartKafe'ye hoş geldiniz! Menünüzü yönetmeye başlamak için işletme profilinizi oluşturun.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateStore} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">İşletme Adı</label>
                            <Input
                                type="text"
                                placeholder="Örn: Moda Kahvecisi"
                                value={name}
                                onChange={handleNameChange}
                                className="bg-zinc-900/50 border-white/10 h-12 text-white focus-visible:ring-green-500"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Dijital Menü Adresi (Slug)</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3 text-sm text-zinc-500 font-mono select-none">
                                    smartkafe.com/
                                </span>
                                <Input
                                    type="text"
                                    placeholder="moda-kahvecisi"
                                    value={slug}
                                    onChange={e => setSlug(e.target.value.toLowerCase())}
                                    className="bg-zinc-900/50 border-white/10 h-12 text-white pl-[110px] font-mono focus-visible:ring-green-500"
                                    required
                                />
                            </div>
                            {slug && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                                    <Sparkles className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                                    Adresiniz: <span className="text-white font-bold">smartkafe.com/{slug}</span>
                                </p>
                            )}
                        </div>
                        <Button type="submit" className="w-full h-12 mt-6 bg-green-600 hover:bg-green-500 text-white font-bold text-base transition-colors" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Kuruluyor...
                                </>
                            ) : "Kurulumu Tamamla"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
