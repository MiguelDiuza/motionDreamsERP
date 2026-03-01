import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { Toaster } from "sonner";

// Use Montserrat as per user preference (Poppins/Montserrat style)
const montserrat = Montserrat({ subsets: ["latin"], weight: ['400', '700', '900'] });

export const metadata: Metadata = {
    title: "Motion Dreams ERP",
    description: "Sistema de gestión administrativa y financiera para estudios creativos.",
    icons: {
        icon: "/img/favicon.svg",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body className={`${montserrat.className} bg-black text-white selection:bg-brand-red selection:text-white`}>
                <div className="flex flex-col lg:flex-row min-h-screen relative overflow-hidden">
                    {/* Global Background Elements */}
                    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-red/10 rounded-full blur-[120px]" />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-red/5 rounded-full blur-[120px]" />
                    </div>

                    <Sidebar />

                    <main className="flex-1 min-w-0 h-screen overflow-y-auto relative custom-scrollbar p-6 lg:p-0">
                        {children}
                        <Toaster richColors position="top-right" theme="dark" />
                    </main>
                </div>
            </body>
        </html>
    );
}
