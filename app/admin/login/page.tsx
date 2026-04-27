"use client"

import { useState, useEffect, Suspense } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"

function AdminLoginContent() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [isLogin, setIsLogin] = useState(true)
    const [isDemoLoading, setIsDemoLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const isDemo = searchParams.get('demo') === 'true'
        if (isDemo) {
            const demoLogin = async () => {
                setIsDemoLoading(true)
                try {
                    const { error } = await supabase.auth.signInWithPassword({
                        email: "ccengizkorkmaz@gmail.com",
                        password: "123456", 
                    })
                    if (error) throw error
                    toast.success("Demo işletme girişi başarılı!")
                    router.push("/admin/dashboard")
                } catch (error: any) {
                    toast.error(error.message || "Demo girişinde hata oluştu.")
                    setIsDemoLoading(false)
                }
            }
            demoLogin()
        }
    }, [searchParams, router])

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                toast.success("Giriş başarılı!")
                router.push("/admin/dashboard")
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/admin/login`,
                    },
                })
                if (error) throw error
                toast.success("Hesap aktivasyonu e-posta adresinize gönderildi. Lütfen onaylamayı unutmayın")
                setIsLogin(true)
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (isDemoLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
                 <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                 <p className="text-lg font-medium text-muted-foreground">Demo işletmeye giriş yapılıyor...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
            <Button variant="ghost" className="absolute top-4 left-4" asChild>
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Ana Sayfaya Dön
                </Link>
            </Button>
            <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-2xl text-center text-primary">
                        {isLogin ? "SmartKafe Giriş" : "Yönetici Kayıt"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Şifre</label>
                            <Input
                                type="password"
                                placeholder="••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "İşlem Yapılıyor..." : (isLogin ? "Giriş Yap" : "Kayıt Ol")}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button
                        variant="link"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-muted-foreground"
                    >
                        {isLogin ? "Hesabınız yok mu? Kayıt Olun" : "Zaten hesabınız var mı? Giriş Yapın"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default function AdminLogin() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Yükleniyor...</p>
            </div>
        }>
            <AdminLoginContent />
        </Suspense>
    )
}
