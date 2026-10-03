import { DiscordSignInButton } from "@/components/SignInWithDiscord";
import { createClient } from "@/lib/supabase/server";
import ClaimPlayerCharacter from "@/components/characterClaim/claimPlayerCharacter";

export default async function Page() {
    const supabase = await createClient();
    const { data: user, error } = await supabase.auth.getUser();
    if (error || !user) {
        return (
            <div className="flex flex-col items-center justify-center my-auto mx-auto gap-8">
            <DiscordSignInButton />
            </div>
        );
    }

    const {data: player, error:playerError} = await supabase
        .from("players")
        .select("*")
        .eq("user_id", user.user.id)
        .maybeSingle();

    if (!player) {
        return (
        <div className="flex flex-col items-center justify-center my-auto mx-auto gap-8">
            <ClaimPlayerCharacter userId={user.user.id}/>
        </div>
        )
    }
    if (playerError) {
        return "Error fetching players"
    }

    if (player.role !== "officer"){
        return (
            <div className="flex flex-col items-center justify-center my-auto mx-auto gap-8">
                <h1 className="text-2xl">Forbidden</h1>
            </div>
        )
    }


    return (
        <div>
            <h1 className="text-2xl">Manage roster</h1>
        
        </div>
    );
}
