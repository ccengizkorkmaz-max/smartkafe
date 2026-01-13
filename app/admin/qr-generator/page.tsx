
"use client"

import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function QRGenerator() {
    const [tableCount, setTableCount] = useState(10)
    const [storeSlug, setStoreSlug] = useState("")

    useEffect(() => {
        // Fetch store slug (assuming single store for admin demo)
        const fetchStore = async () => {
            const { data } = await supabase.from("stores").select("slug").single()
            if (data) setStoreSlug(data.slug)
        }
        fetchStore()
    }, [])

    const qrCodes = Array.from({ length: tableCount }, (_, i) => i + 1)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000'

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen bg-white text-black print:p-0">
            <div className="mb-8 print:hidden flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/dashboard">
                        <Button variant="outline" size="icon" className="bg-white text-black border-gray-300 hover:bg-gray-100 hover:text-black">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-black mb-2">QR Kod Oluşturucu</h1>
                        <p className="text-gray-600">Masa sayısını belirleyin ve QR kodları yazdırın.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Masa Sayısı:</label>
                        <Input
                            type="number"
                            value={tableCount}
                            onChange={(e) => setTableCount(Number(e.target.value))}
                            className="w-24 border-gray-300 text-black"
                        />
                    </div>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" /> Yazdır
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 print:grid-cols-3 print:gap-8">
                {qrCodes.map((num) => {
                    const url = `${baseUrl}/${storeSlug}?table=${num}`
                    return (
                        <div key={num} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl page-break-inside-avoid">
                            <QRCodeSVG value={url} size={150} level="H" />
                            <div className="mt-4 text-center">
                                <div className="font-bold text-xl uppercase tracking-widest">Masa</div>
                                <div className="text-4xl font-black">{num}</div>
                                <div className="text-[10px] text-gray-500 mt-2">{url}</div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <style jsx global>{`
        @media print {
            @page { margin: 1cm; }
            body { background: white; color: black; }
            .print\\:hidden { display: none !important; }
            .glass, header, footer { display: none !important; }
        }
      `}</style>
        </div>
    )
}
