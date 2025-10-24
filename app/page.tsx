import { DiscordSignInButton } from "@/components/SignInWithDiscord";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import CreateNewListButton from "@/components/shopping_list/createNewListButton";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const { data: user, error } = await supabase.auth.getUser();
    if (error || !user) {
      return (
        <div className="flex-col items-center justify-center my-auto">
          <DiscordSignInButton />
        </div>
      );
    }

  const {data: lists, error:listError} = await supabase
    .from("shopping_lists")
    .select("*, shopping_list_items(*)")
    .eq("is_open", true);

    if (listError) {
        return "Error fetching lists"
    }
  return (
    <div>
      {user ? (
        <div className="flex flex-col w-full p-3 gap-8 bg-muted max-w-xl mx-auto rounded-sm ">
          <h2 className="text-xl">{lists.length} active shopping lists</h2>
          {lists && lists.length > 0 && lists.map((item:any) => (
            <Link key={item.id} href={`/lists/${item.id}`} className="bg-green-500/30 hover:bg-green-600/50 p-2 rounded-sm border border-green-500/50">
              <p>List number {item.id}</p>
            </Link>
          ))}

          <CreateNewListButton />
        </div>
      ) : (
        <div>your mom is an app something went bad</div>
      )}
    </div>
  );
}
