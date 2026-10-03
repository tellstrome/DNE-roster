import { DiscordSignInButton } from "@/components/SignInWithDiscord";
import { createClient } from "@/lib/supabase/server";
import ClaimPlayerCharacter from "@/components/characterClaim/claimPlayerCharacter";
import BossOrder from "@/components/manage-roster/bossOrder";
import ManageAbsences from "@/components/manage-roster/manageAbsences";

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

    const {data: allPlayers, error:allPlayersError} = await supabase
        .from("players")
        .select("*, classes_specializations(*,classes(*)), player_preferences(*, preference_options(*)), player_absences(*),boss_rosters(*)")
        .order("name", { ascending: true });

    const { data: specs } = await supabase
        .from("classes_specializations")
        .select("*,classes(*)")
        .order("id", { ascending: true });

    const { data: preferenceOptions } = await supabase
        .from("preference_options")
        .select("*, roster_options(*)")
        .order("id", { ascending: true });

    const { data: rosterOptions } = await supabase
        .from("roster_options")
        .select("*")
        .order("id", { ascending: true });

    return (
        <div>
            <h1 className="text-2xl">Manage roster</h1>

            {allPlayers && specs && preferenceOptions && rosterOptions && (
                <BossOrder allPlayers={allPlayers} specs={specs} preferenceOptions={preferenceOptions} rosterOptions={rosterOptions} />
            )}

            {allPlayers && (
                <ManageAbsences players={allPlayers} />
            )}
            
        </div>
    );
}
