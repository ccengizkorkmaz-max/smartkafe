
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"

export default function AdminLogin() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [isLogin, setIsLogin] = useState(true)
    const router = useRouter()

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
