import "@fontsource/roboto";
import "../../styles/globals.css";

import { TRPCReactProvider } from "~/trpc/react";
import { NextUIProvider } from "@nextui-org/react";

export default function Layout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <div>
            <NextUIProvider>
                <TRPCReactProvider>{children}</TRPCReactProvider>
            </NextUIProvider>
        </div>
    );
}
