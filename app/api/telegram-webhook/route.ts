import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
    try {
        const body = await request.json()

        // Handle Telegram Callback Query (Interactive button clicks)
        if (body.callback_query) {
            const callbackQuery = body.callback_query
            const callbackData = callbackQuery.data // e.g. "on_the_way:UUID" or "delivered:UUID"
            const courierChatId = callbackQuery.from.id.toString()
            const messageId = callbackQuery.message.message_id
            const originalText = callbackQuery.message.text

            const [action, orderId] = callbackData.split(":")

            if (!orderId) {
                return NextResponse.json({ ok: true })
            }

            // Get store bot token
            const { data: order } = await supabase
                .from("orders")
                .select("*, stores(*)")
                .eq("id", orderId)
                .single()

            if (!order) {
                return NextResponse.json({ ok: true })
            }

            const currentStore = Array.isArray(order.stores) ? order.stores[0] : order.stores
            const botToken = currentStore?.payment_settings?.telegram_bot_token || "8635446793:AAELVKXaRqWUJFNXVXqXJMyMVD3xeiZBI_Q"

            let newStatus = ""
            let statusTextLabel = ""
            let alertText = ""

            if (action === "on_the_way") {
                newStatus = "on_the_way"
                statusTextLabel = "🚚 YOLDAYIM"
                alertText = "Sipariş durumunu 'Yolda' olarak güncellediniz."
            } else if (action === "delivered") {
                newStatus = "paid" // Closed & Paid
                statusTextLabel = "✓ TESLİM EDİLDİ"
                alertText = "Sipariş teslim edildi ve ödeme kapatıldı."
            }

            if (newStatus) {
                // Update Supabase Order Status
                await supabase
                    .from("orders")
                    .update({ 
                        status: newStatus,
                        payment_status: newStatus === 'paid' ? 'paid' : 'pending'
                    })
                    .eq("id", orderId)

                // Answer Callback Query
                await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        callback_query_id: callbackQuery.id,
                        text: alertText
                    })
                })

                // Edit Message Text
                const newText = `${originalText}\n\n*Güncel Durum: ${statusTextLabel}*`
                const newKeyboard = action === 'on_the_way' ? {
                    inline_keyboard: [
                        [
                            { text: "✓ Teslim Ettim", callback_data: `delivered:${orderId}` }
                        ]
                    ]
                } : { inline_keyboard: [] }

                await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: courierChatId,
                        message_id: messageId,
                        text: newText,
                        parse_mode: "Markdown",
                        reply_markup: newKeyboard
                    })
                })
            }
        }

        // Handle Telegram Text Messages (/online, /offline, /start)
        if (body.message && body.message.text) {
            const chatId = body.message.chat.id.toString()
            const text = body.message.text.trim().toLowerCase()

            // Find profile by telegram_chat_id
            const { data: profile } = await supabase
                .from("profiles")
                .select("id, full_name")
                .eq("telegram_chat_id", chatId)
                .maybeSingle()

            const botToken = "8635446793:AAELVKXaRqWUJFNXVXqXJMyMVD3xeiZBI_Q"

            if (profile) {
                let replyText = ""
                let isOnline = false

                if (text === "/online" || text === "/start") {
                    isOnline = true
                    replyText = `🟢 *SmartKafe Kurye Sistemine Hoş Geldiniz!*\n\nDurumunuz: *Aktif (Servise Açık)*\nYeni siparişler telefonunuza anlık iletilecektir.\n\n_Çevrimdışı olmak için /offline yazabilirsiniz._`
                } else if (text === "/offline") {
                    isOnline = false
                    replyText = `🔴 *Çevrimdışı Durumuna Geçtiniz.*\n\nYeni sipariş bildirimi almayacaksınız.\n\n_Tekrar çalışmaya başlamak için /online yazabilirsiniz._`
                }

                if (replyText) {
                    // Update profile online status
                    await supabase
                        .from("profiles")
                        .update({ is_online: isOnline })
                        .eq("id", profile.id)

                    // Send response message
                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: replyText,
                            parse_mode: "Markdown"
                        })
                    })
                }
            } else {
                const host = request.headers.get("host") || "smartkafe.vercel.app"
                const protocol = host.includes("localhost") ? "http" : "https"
                const profileUrl = `${protocol}://${host}/admin/profile`

                const replyText = `⚠️ *Profil Bulunamadı!*\n\nSipariş bildirimleri alabilmek için lütfen önce SmartKafe profil sayfanızdan bu Chat ID değerini kaydedin:\n\n*Chat ID'niz:* \`${chatId}\`\n\n🔗 *Profil Sayfası:* [Profil Ayarlarına Git](${profileUrl})`
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: replyText,
                        parse_mode: "Markdown"
                    })
                })
            }
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error("Webhook processing error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
