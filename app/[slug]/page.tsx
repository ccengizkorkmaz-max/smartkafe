
import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import MenuClient from "@/components/menu/menu-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Force dynamic rendering since we depend on searchParams and DB data
export const dynamic = "force-dynamic"
export const revalidate = 0

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function StorePage({ params }: PageProps) {
    const { slug } = await params

    // 1. Fetch Store
    const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id, name, logo_url")
        .eq("slug", slug)
        .single()

    if (storeError || !store) {
        if (storeError) console.error("Store Fetch Error:", storeError)
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">Ops! İşletme Bulunamadı.</h1>
                <p className="text-muted-foreground mb-6">Aradığınız sayfa mevcut değil veya yanlış bir bağlantıya tıkladınız.</p>
                <Link href="/"><Button>Ana Sayfaya Dön</Button></Link>
            </div>
        )
    }

    // 2. Fetch Products
    const { data: products, error: productError } = await supabase
        .from("products")
        .select("id, name, price, description, image_url, category")
        .eq("store_id", store.id)
        .order("category", { ascending: true })

    if (productError) {
        console.error("Product Fetch Error:", productError)
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <MenuClient store={store} products={products || []} />
        </div>
    )
}
