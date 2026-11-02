"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { DefaultModal, ModalBackdrop } from "../ui/modals";
import Link from "next/link";

type Variant = "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;
interface Props {
    variant?: Variant;
    className?: string;
}
export default function PrivacyPolicyPopup({variant, className = ""}:Props){
    const [isOpen, setIsOpen] = useState<boolean>(false);
    return(
        <>
            <Button variant={variant} className={className} onClick={() => setIsOpen(true)}>
                Privacy Policy
            </Button>
            {isOpen && (
                <ModalBackdrop onClose={() => setIsOpen(false)}>
                    <DefaultModal onClose={() => setIsOpen(false)}>
                        <div className="flex flex-col gap-2 text-sm">
                            <h1 className="text-2xl">Privacy Policy</h1>
                            <h2 className="text-lg mt-4 font-bold">What data is collected:</h2>
                            <p>The app uses Discord as an authentication provider, meaning it receives your Discord ID, username, avatar and email.</p>
                            <p>The app uses a list of raid members nicknames to manage the roster. By logging in with Discord you connect your account to one of these nicknames.</p>

                            <h2 className="text-lg mt-4 font-bold">What your data is used for:</h2>
                            <p>The data is used to allow you to sign in and identify you in the app, in order for you to manage your own roster and spec preferences, as well as absences.</p>
                            <p>Your Discord username, avatar, and email are not shown to other users or copied into our database tables. The site does not sell your data, and also does not share it with anyone other than Supabase and Discord.</p>

                            <h2 className="text-lg mt-4 font-bold">How your data is stored:</h2>
                            <p>Your data is stored in Supabase. For more information, see <Link className="font-bold text-blue-500 hover:text-blue-600" href="https://supabase.com/privacy">Supabase Privacy Policy</Link>.</p>

                            <h2 className="text-lg mt-4 font-bold">Data deletion:</h2>
                            <p>You can delete your account at any time under the "preferences" tab. Deleting your account will permanently delete your data and prevent you from managing your preferences and absences.</p>
                            <p>Your ingame nickname and any planned absence dates remains in the app while you are in the raidteam in order for officers to manage and create boss rosters, and will only be deleted if you leave the raid team.</p>

                            <h2 className="text-lg mt-4 font-bold">Cookies and sessions:</h2>
                            <p>Supabase uses cookies or local storage to keep you signed in. No tracking or advertising cookies are used.</p>

                            <Button className="ml-auto" onClick={() => setIsOpen(false)}>
                                Got it
                            </Button>
                        </div>
                    </DefaultModal>
                </ModalBackdrop>
            )}
        </>
    )
}