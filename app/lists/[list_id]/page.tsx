import { DiscordSignInButton } from "@/components/SignInWithDiscord";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import CreateNewListButton from "@/components/shopping_list/createNewListButton";
import AddNewListItem from "@/components/shopping_list/addNewListItem";
import MarkItemAsBought from "@/components/shopping_list/markItemAsBought";
import MarkListAsClosed from "@/components/shopping_list/markListAsClosed";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

interface Props {
  params: Promise<{ list_id: string }>;
}

export default async function Page({ params }: Props) {
    const { list_id } = await params;

    if (!list_id) {
        return "Incorrect list id"
    }

    const supabase = await createClient();
    const { data: user, error } = await supabase.auth.getUser();
    if (error || !user) {
        return (
            <div className="flex-col items-center justify-center my-auto">
                <DiscordSignInButton />
            </div>
        );
    }

    const {data: list, error:listError} = await supabase
    .from("shopping_lists")
    .select("*, shopping_list_items(*)")
    .eq("id", list_id)
    .single();

    if (listError) {
        return "Error fetching list"
    }

    return (
        <div className="flex-1 flex flex-col w-full">
            {user ? (
                <div className="flex flex-col w-full p-3 gap-8 bg-muted max-w-xl mx-auto rounded-sm ">
                    <div className="flex flex-row items-center justify-between">
                        <h2 className="text-xl">List number {list.id}</h2>
                        <MarkListAsClosed listId={list.id} isOpen={list.is_open} />
                    </div>
                    {list.shopping_list_items && list.shopping_list_items.length > 0 ? ( 
                        <div className="flex flex-col gap-1 p-2">
                            {list.shopping_list_items.map((item: any) => (
                                <div key={item.id} className={`w-full rounded-sm flex flex-row gap-1 items-center justify-between ${item.is_bought ? "bg-green-500/30" : "bg-slate-500/30"}`}>
                                    <div className="flex flex-row w-full items-center gap-1 pl-2">
                                        <p className={`${item.is_bought && ("line-through")}`}>{item.item}</p>
                                    </div>
                                    <MarkItemAsBought itemId={item.id} isBought={item.is_bought}/>
                                </div>
                            ))}

                        </div>
                    ) : "No items added"}
                    <AddNewListItem listId={list.id} />
                </div>
            ) : (
                <div>your mom is an app something went bad</div>
            )}
        </div>
    );
}
