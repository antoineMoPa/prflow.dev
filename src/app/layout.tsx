import "../styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "../trpc/react";
import { NextUIProvider } from "@nextui-org/react";

export const metadata: Metadata = {
    title: "Engmetrix",
    description: "Engineering metrics for your team",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={`${GeistSans.variable}`}>
            <body>
                <NextUIProvider>
                    <TRPCReactProvider>{children}</TRPCReactProvider>
                </NextUIProvider>
            </body>
        </html>
    );
}
