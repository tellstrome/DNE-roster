import { DiscordSignInButton } from "@/components/SignInWithDiscord";
import { createClient } from "@/lib/supabase/server";
import ClaimPlayerCharacter from "@/components/characterClaim/claimPlayerCharacter";
import Preferences from "@/components/preferences/preferences";



export default async function Home() {
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

  const {data: raidbosses, error:raidbossesError} = await supabase
        .from("raids")
        .select("*, raid_bosses(*)")
        .eq("active", true)
        .order("id", { ascending: true });

    const {data:classSpecs, error: classError} = await supabase
        .from("classes_specializations")
        .select("*, classes(*)")
        .order("id", { ascending: true });

    const {data:preferenceOptions, error: preferenceOptionsError} = await supabase
        .from("preference_options")
        .select("*")
        .order("id", { ascending: true });

  return (
    <div>
      {classSpecs && preferenceOptions && (
          <Preferences userId={user.user.id} classSpecs={classSpecs} raids={raidbosses ?? []} preferenceOptions={preferenceOptions} />
      )}
    </div>
  );
}
