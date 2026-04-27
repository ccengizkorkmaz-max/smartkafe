"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { ArrowLeft, Lightbulb, User } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OnerilerPage() {
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSuggestions = async () => {
            const { data, error } = await supabase
                .from('suggestions')
                .select('*')
                .order('created_at', { ascending: false })
            
            if (!error && data) {
                setSuggestions(data)
            }
            setLoading(false)
        }
        fetchSuggestions()
    }, [])

    return (
        <div className="min-h-screen bg-[#020202] text-white p-6 md:p-12 selection:bg-primary/30">
            <Button variant="ghost" className="mb-8" asChild>
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Ana Sayfaya Dön
                </Link>
            </Button>

            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 text-yellow-500 mb-6 border border-yellow-500/20">
                        <Lightbulb className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4">Sizden Gelen Öneriler</h1>
                    <p className="text-muted-foreground text-lg">SmartKafe'yi daha iyi yapmak için topluluğumuzdan gelen harika fikirler.</p>
                </div>

                {loading ? (
                    <div className="text-center text-muted-foreground py-12">Yükleniyor...</div>
                ) : suggestions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12 bg-white/5 rounded-2xl border border-white/10">
                        Henüz bir öneri bulunmuyor. İlk öneriyi siz yapın!
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {suggestions.map((item) => (
                            <div key={item.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                                        <User className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-white">{item.name || "İsimsiz Kullanıcı"}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(item.created_at).toLocaleDateString("tr-TR", {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-zinc-300 leading-relaxed text-lg">{item.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
