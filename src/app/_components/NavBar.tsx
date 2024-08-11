"use client";

import {
  Navbar as NextUiNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/navbar";
import { Link, Button } from "@nextui-org/react";
import { SessionProvider, useSession } from "next-auth/react";

import React from "react";

function SessionNavBarContent() {
    const session = useSession();

    return (
        <>
            { !session?.data?.user &&
                <NavbarContent justify="end">
                    <NavbarItem>
                        <Button as={Link} color="success" href="/api/auth/signin" variant="flat">
                            Sign In
                        </Button>
                    </NavbarItem>
                    <NavbarItem>
                        <Button as={Link} color="primary" href="/api/auth/signin" variant="flat">
                            Sign Up
                        </Button>
                    </NavbarItem>
                </NavbarContent>
            }
            { session?.data?.user &&
                <NavbarContent justify="end">
                    <NavbarItem className="mr-3">
                        <Link href="/teams">
                            Teams
                        </Link>
                    </NavbarItem>
                    <NavbarItem>
                        <Button as={Link} color="primary" href="/api/auth/signout" variant="flat">
                            Sign Out
                        </Button>
                    </NavbarItem>
                </NavbarContent>
            }
        </>
    );
}

export default function NavBar() {
    return (
        <NextUiNavbar>
            <SessionProvider>
                <NavbarBrand>
                    <Link href="/">
                        <img src="/prflow-with-text.dev.png" alt="prflow.dev" className="h-8" />
                    </Link>
                </NavbarBrand>
                <SessionNavBarContent />
            </SessionProvider>
        </NextUiNavbar>
    );
}
