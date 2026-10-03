"use client";

import { createClient } from "@/lib/supabase/client"; // client-side supabase
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import Image from "next/image";

export function DiscordSignInButton() {
    const router = useRouter();

    const handleDiscordSignIn = async () => {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
            redirectTo: `${window.location.origin}/auth/callback`, 
        },
        });

        if (error) {
        console.error("Error signing in with Discord:", error.message);
        return;
        }

        if (data?.url) {
        router.push(data.url); // actually send the user to Discord
        }
    };

    return (
        <Button onClick={handleDiscordSignIn} className="h-16 w-96 bg-[#5865F2] bg-linear-to-b from-[#5865F2] to-[#3b41a7] bg-size-[100%_200%] bg-top transition-all duration-500 ease-in-out hover:bg-[0_100%] text-white text-xl flex flex-row items-center gap-4 p-3">
            <Image src="/Discord-Symbol-White.png"
                width={528}
                height={400}
                alt="Discord logo white"
                className="object-scale-down h-full w-auto"
                />
            <p>Sign in with Discord</p>
        </Button>
    );
}
