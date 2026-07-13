"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"

export default function AdminRegister() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/admin/login`,
                    data: {
                        full_name: fullName,
                    }
                },
            })

            if (error) throw error

            if (data?.session) {
                // Email confirmation is disabled, logged in immediately
                toast.success("Kayıt başarılı! İşletmenizi kurmaya yönlendiriliyorsunuz...")
                router.push("/admin/onboarding")
            } else {
                // Email confirmation is enabled
                toast.success("Kayıt başarılı! Lütfen e-posta adresinize gönderilen aktivasyon linkini onaylayın.", {
                    duration: 8000
                })
                router.push("/admin/login")
            }
        } catch (error: any) {
            toast.error(error.message || "Kayıt sırasında bir hata oluştu.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020202] text-white p-4 relative selection:bg-primary/30">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-green-500/10 blur-[100px] rounded-full pointer-events-none" />

            <Button variant="ghost" className="absolute top-4 left-4 text-muted-foreground hover:text-white" asChild>
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Ana Sayfaya Dön
                </Link>
            </Button>
            
            <Card className="w-full max-w-md border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="bg-green-500/10 p-2 rounded-xl border border-green-500/20">
                            <Sparkles className="w-6 h-6 text-green-500" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-white">SmartKafe Yönetici Kaydı</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Hemen kaydolun, işletmenizin dijital menüsünü saniyeler içinde yönetmeye başlayın.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Adınız Soyadınız</label>
                            <Input
                                type="text"
                                placeholder="Örn: Ahmet Yılmaz"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                className="bg-zinc-900/50 border-white/10 h-12 text-white focus-visible:ring-green-500"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">E-posta Adresiniz</label>
                            <Input
                                type="email"
                                placeholder="admin@isletme.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="bg-zinc-900/50 border-white/10 h-12 text-white focus-visible:ring-green-500"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Güçlü Bir Şifre</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="bg-zinc-900/50 border-white/10 h-12 text-white focus-visible:ring-green-500"
                                required
                                minLength={6}
                            />
                        </div>
                        <Button type="submit" className="w-full h-12 mt-6 bg-green-600 hover:bg-green-500 text-white font-bold text-base transition-colors" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Hesap Oluşturuluyor...
                                </>
                            ) : "Hesap Oluştur"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-white/5 py-4">
                    <div className="text-sm text-muted-foreground">
                        Zaten hesabınız var mı?{" "}
                        <Link href="/admin/login" className="text-green-500 hover:underline font-semibold">
                            Giriş Yapın
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
