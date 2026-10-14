"use client";

import { useEffect, useState } from "react";
import PlayerProfile from "./playerProfile";
import { createClient } from "@/lib/supabase/client";
import BossPreferences from "./bossPreferences";
import PlayerAbsences from "./playerAbsences";
import { type Raids, type Player, type PreferenceOption, type ClassSpec } from "@/lib/roster";


interface Props {
    userId: string;
    classSpecs: ClassSpec[];
    raids?: Raids[]
    preferenceOptions: PreferenceOption[];
}


export default function Preferences({userId,classSpecs,raids,preferenceOptions}:Props){
    const supabase = createClient();
    const [player,setPlayer] = useState<Player | null>(null)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>();

    const fetchPlayer = async () => {
        const {data: player, error:playerError} = await supabase
            .from("players")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (playerError) {
            setError(playerError.message);
        } else {
            setPlayer(player );
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchPlayer();
    }, [userId]);

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

    if (!player) return null;

    return (
        <div className="flex flex-col gap-8">
            <PlayerProfile player={player} classSpecs={classSpecs} onUpdate={fetchPlayer}/>
            <BossPreferences raids={raids} preferenceOptions={preferenceOptions} player={player} classSpecs={classSpecs}/>
            <PlayerAbsences player={player} />
        </div>
    )
}