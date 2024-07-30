import "../styles/globals.css";

import "@fontsource/roboto";
import { type Metadata } from "next";

import { TRPCReactProvider } from "../trpc/react";
import { NextUIProvider } from "@nextui-org/react";

export const metadata: Metadata = {
    title: "Engmetrix",
    description: "Git metrics for your team",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body>
                <NextUIProvider>
                    <TRPCReactProvider>{children}</TRPCReactProvider>
                </NextUIProvider>
            </body>
        </html>
    );
}
