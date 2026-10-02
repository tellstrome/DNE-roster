import { DiscordSignInButton } from "@/components/SignInWithDiscord";
import { createClient } from "@/lib/supabase/server";
import ClaimPlayerCharacter from "@/components/characterClaim/claimPlayerCharacter";



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
    .single();

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

  return (
    <div>
      
    </div>
  );
}
