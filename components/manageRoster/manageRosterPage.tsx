"use client";

import { ClassSpec, Player, PreferenceOption, RosterOption } from "@/lib/roster";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";
import BossOrder from "./bossOrder";
import ManageAbsences from "./manageAbsences";
import AddNewPlayer from "./addNewPlayer";

export default function ManageRosterPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [specs, setSpecs] = useState<ClassSpec[]>([]);
    const [preferenceOptions, setPreferenceOptions] = useState<PreferenceOption[]>([]);
    const [rosterOptions, setRosterOptions] = useState<RosterOption[]>([]);

    const fetchAll = useCallback(async () => {
        const [playersRes, specsRes, prefRes, rosterRes] = await Promise.all([
            supabase
                .from("players")
                .select("*, classes_specializations(*,classes(*)), player_preferences(*, preference_options(*)), player_absences(*), boss_rosters(*)")
                .order("name", { ascending: true }),
            supabase
                .from("classes_specializations")
                .select("*, classes(*)")
                .order("id", { ascending: true }),
            supabase
                .from("preference_options")
                .select("*, roster_options(*)")
                .order("id", { ascending: true }),
            supabase
                .from("roster_options")
                .select("*")
                .order("id", { ascending: true }),
        ]);

        const firstError = playersRes.error || specsRes.error || prefRes.error || rosterRes.error;
        if (firstError) {
            setError(firstError.message);
        } else {
            setError(null);
            setPlayers(playersRes.data);
            setSpecs(specsRes.data);
            setPreferenceOptions(prefRes.data);
            setRosterOptions(rosterRes.data);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <div className="flex flex-col gap-8">
            <BossOrder allPlayers={players} specs={specs} preferenceOptions={preferenceOptions} rosterOptions={rosterOptions} onUpdate={fetchAll}  />
            <ManageAbsences players={players} />
            <AddNewPlayer classSpecs={specs} onUpdate={fetchAll} />
        </div>
    );
}