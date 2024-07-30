import "@fontsource/roboto";
import "../../styles/globals.css";

import { TRPCReactProvider } from "~/trpc/react";
import { NextUIProvider } from "@nextui-org/react";
import NavBar from "./NavBar";
import { SessionProvider } from "next-auth/react";

export default function Layout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <div>
            <SessionProvider>
                <NavBar />
                <NextUIProvider>
                    <TRPCReactProvider>{children}</TRPCReactProvider>
                </NextUIProvider>
            </SessionProvider>
        </div>
    );
}
