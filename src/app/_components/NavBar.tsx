"use client";

import {
  Navbar as NextUiNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/navbar";
import { Link, Button } from "@nextui-org/react";
import { getSession, SessionProvider, useSession } from "next-auth/react";

import React from "react";

function SessionNavBarContent() {
    const session = useSession();

    return (
        <>
            <NavbarContent className="hidden sm:flex gap-4" justify="center">
                <NavbarItem>
                    <Link href="/">
                        Home
                    </Link>
                </NavbarItem>
                {
                    session?.data?.user &&
                        <NavbarItem>
                            <Link href="/teams">
                                Teams
                            </Link>
                        </NavbarItem>
                }
            </NavbarContent>
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
                        Engmetrix
                    </Link>
                </NavbarBrand>
                <SessionNavBarContent />
            </SessionProvider>
        </NextUiNavbar>
    );
}
