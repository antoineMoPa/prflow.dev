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
                    <NavbarItem className="mr-3">
                        <Link href="/pricing">
                            Pricing
                        </Link>
                    </NavbarItem>
                    <NavbarItem className="mr-3">
                        <Button
                            as={Link}
                            color="success"
                            className="text-white"
                            href="https://docs.google.com/forms/d/e/1FAIpQLSfcT2arJ_gFdokI36FtCbuQbJjLVDuOR2XSR47E-OmeaSrMRw/viewform?usp=sf_link"
                            target="_blank">
                            Book a Demo
                        </Button>
                    </NavbarItem>
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
                    <NavbarItem className="mr-3">
                        <Link href="/pricing">
                            Pricing
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
                        <img src="/logo-with-text.png" alt="prflow.dev" className="h-10" />
                    </Link>
                </NavbarBrand>
                <SessionNavBarContent />
            </SessionProvider>
        </NextUiNavbar>
    );
}
