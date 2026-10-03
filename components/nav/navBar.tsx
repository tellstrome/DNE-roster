import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogoutButton } from "../logout-button";
import { createClient } from "@/lib/supabase/server";
import { Menu } from "lucide-react";
import Link from "next/link";

interface Props{
    userIsOfficer?:boolean;
}

export async function NavBar({userIsOfficer = false}:Props){
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();

    const user = data?.claims;

      const baseItem =
        "flex h-9 items-center justify-center whitespace-nowrap shrink-0 rounded-md border border-accent bg-muted px-4 text-sm font-medium text-primary hover:bg-accent cursor-pointer";
    const dropdownItem = `${baseItem} w-full`;

    if (!user) return null;

    return (
        <>
            <div className="hidden sm:flex flex-row gap-1">
                <Link href="/" className={baseItem}>
                    Home
                </Link>
                <Link href="/overview" className={baseItem}>
                    Overview
                </Link>
                {userIsOfficer && (
                    <Link href="/manage-roster" className={baseItem}>
                        Manage roster
                    </Link>
                )}
                {userIsOfficer && (
                    <Link href="/comp" className={baseItem}>
                        View comp
                    </Link>
                )}
                {user && (
                    <LogoutButton className={baseItem} />
                )}
            </div>
            <div className="sm:hidden flex flex-row">
            <DropdownMenu>
                <DropdownMenuTrigger className="bg-muted border border-accent rounded-md p-1 hover:bg-accent">
                    <Menu size={36}/>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="flex w-48 flex-col p-1">
                    <DropdownMenuItem asChild>
                        <Link href="/" className={dropdownItem}>
                            Home
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/overview" className={dropdownItem}>
                            Overview
                        </Link>
                    </DropdownMenuItem>
                    {userIsOfficer && (
                        <DropdownMenuItem asChild>
                            <Link href="/manage-roster" className={dropdownItem}>
                                Manage roster
                            </Link>
                        </DropdownMenuItem>
                    )}
                    {userIsOfficer && (
                        <DropdownMenuItem asChild>
                            <Link href="/comp" className={dropdownItem}>
                                View comp
                            </Link>
                        </DropdownMenuItem>
                    )}

                    {user && (
                        <DropdownMenuItem asChild>
                            <LogoutButton className={baseItem} />
                        </DropdownMenuItem>
                    )}
                    </DropdownMenuContent>
            </DropdownMenu>
            </div>
        </>
    )
}