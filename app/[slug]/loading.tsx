
export default function Loading() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground animate-pulse">Menü Yükleniyor...</p>
        </div>
    )
}
