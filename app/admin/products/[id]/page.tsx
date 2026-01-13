
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { use } from "react" // React 19 hook for params

interface PageProps {
    params: Promise<{ id: string }>
}

export default function ProductFormPage({ params }: PageProps) {
    const { id } = use(params)
    const isNew = id === "new"
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [storeId, setStoreId] = useState("")

    const [formData, setFormData] = useState({
        name: "",
        price: "",
        category: "",
        description: "",
        image_url: ""
    })

    useEffect(() => {
        // Get store ID
        supabase.from("stores").select("id").single().then(({ data }) => {
            if (data) setStoreId(data.id)
        })

        if (!isNew) {
            // Fetch product details
            supabase.from("products").select("*").eq("id", id).single().then(({ data, error }) => {
                if (data) {
                    setFormData({
                        name: data.name,
                        price: data.price.toString(),
                        category: data.category,
                        description: data.description || "",
                        image_url: data.image_url || ""
                    })
                }
            })
        }
    }, [id, isNew])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!storeId) {
            toast.error("Mağaza bilgisi alınamadı")
            return
        }

        setLoading(true)
        const payload = {
            store_id: storeId,
            name: formData.name,
            price: parseFloat(formData.price),
            category: formData.category,
            description: formData.description,
            image_url: formData.image_url
        }

        let error
        if (isNew) {
            const { error: insertError } = await supabase.from("products").insert(payload)
            error = insertError
        } else {
            const { error: updateError } = await supabase.from("products").update(payload).eq("id", id)
            error = updateError
        }

        setLoading(false)

        if (error) {
            toast.error("Hata: " + error.message)
        } else {
            toast.success(isNew ? "Ürün eklendi" : "Ürün güncellendi")
            router.push("/admin/products")
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen p-6 flex items-center justify-center">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>{isNew ? "Yeni Ürün Ekle" : "Ürünü Düzenle"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ürün Adı</label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fiyat (₺)</label>
                                <Input
                                    type="number"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Kategori</label>
                                <Input
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="Örn: Kahve, Tatlı"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Açıklama</label>
                            <Input
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Görsel URL</label>
                            <Input
                                value={formData.image_url}
                                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Kaydediliyor..." : "Kaydet"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
