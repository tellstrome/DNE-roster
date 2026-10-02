"use client";


import { createClient } from "@/lib/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { ChevronDown, X } from "lucide-react";
import { useEffect,useState } from "react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

interface Player{
    id: number;
    name: string;
    main_spec: number;
    classes_specializations: {
        id: number;
        class_id: number;
        name: string;
        role: string;
        classes: {
            id: number;
            name: string;
            class_colour: string;
        }
    }
}

interface Props {
    userId: string;
}

export default function ClaimPlayerCharacter({userId}:Props){
    const supabase = createClient();
    const router = useRouter();

    const [players, setPlayers] = useState<Player[]>([]);
    const [error, setError] = useState<string | null>();
    const [loading, setLoading] = useState(true);
    const [selectedplayer, setSelectedPlayer] = useState<Player | null>(null);
    
    const [confirmError, setConfirmError] = useState<string | null>();
    const [confirmLoading, setConfirmLoading] = useState(false);

    const fetchPlayers = async () => {
        const { data: players, error: playersError } = await supabase
            .from("players")
            .select("*,classes_specializations(*,classes(*))")
            .is("user_id", null)
            .order("name", { ascending: true });

        if (playersError) {
            setError(playersError.message);
        } else {
            setPlayers(players || []);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchPlayers();
    }, [supabase])

    if (loading) return (
        <div>
            <p>Loading...</p>
        </div>
    )

    if (error) return (
        <div>
            <p>{error}</p>
        </div>
    )

    const confirmSelectedPlayer = async () => {
        if (!selectedplayer) return;
        setConfirmLoading(true);

        const { data: update, error: updateError } = await supabase
            .from("players")
            .update({
                user_id: userId
            })
            .eq("id",selectedplayer.id);

        if (updateError) {
            setConfirmError(updateError.message);
            setConfirmLoading(false);
        } else {
            router.refresh();
        }
    }

    return (
        <div className="flex flex-col gap-4 w-full max-w-96 ">
            <p className="text-xl">Select your profile</p>

            {selectedplayer ? (
                <div className="w-48 flex flex-col gap-2">
                    <div className="w-48 flex flex-row justify-between rounded-sm bg-muted border border-accent p-2"> 
                        <p>{selectedplayer.name}</p>
                        <button type="button" onClick={() =>setSelectedPlayer(null)}>
                            <X className="text-red-500"/>
                        </button>
                    </div>
                    <Button type="button" onClick={() => confirmSelectedPlayer()} disabled={confirmLoading}>
                        {confirmLoading ? "Loading..." : "Confirm"}
                    </Button>
                </div>
            ) : (
                <DropdownMenu>
                    <DropdownMenuTrigger className="w-48 bg-muted rounded-sm flex flex-row justify-between p-2">
                        Select player
                        <ChevronDown />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-48 overflow-auto w-48">
                        {players.map((player) => {
                            const colour = player.classes_specializations?.classes?.class_colour + "80";
                            return (
                            <DropdownMenuItem key={player.id}>
                                <button
                                type="button"
                                onClick={() => setSelectedPlayer(player)}
                                className={`w-full text-left rounded-sm border p-1`}
                                style={{
                                    background: colour
                                    ? `linear-gradient(to right, transparent, #${colour})`
                                    : undefined,
                                }}
                                >
                                {player.name}
                                </button>
                            </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    )


}