"use client";

import {Select,SelectContent,SelectGroup,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";


interface Props{
    raids?: {
        id: number;
        name: string;
        colour: string;
        background: string;
        raid_bosses: {
            id: number;
            name: string;
            image: string;
        }[]
    }[];
    preferenceOptions: {
        id:number;
        option: string;
        colour:string;
    }[];
    player: {
        id: number;
        name: string;
        main_spec: number;
        user_id: string;
        role: string;
    }
    classSpecs: {
        id: number;
        class_id: number;
        name: string;
        role: string;
        icon: string;
        classes: {
            id: number;
            name: string;
            class_colour: string;
        }
    }[];
}

interface BossPref {
  preference: number;
  spec_preference: number | null;
}

export default function BossPreferences({raids,preferenceOptions,player,classSpecs}:Props){
    const supabase = createClient();
    const [prefs, setPrefs] = useState<Record<number, BossPref | undefined>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>();
    

    const fetchPreferences = async () => {
        const {data: preferences, error:preferencesError} = await supabase
            .from("player_preferences")
            .select("*")
            .eq("user_id", player.user_id);

        if (preferencesError) {
            setError(preferencesError.message);
        } else {
            setPrefs(
            Object.fromEntries(
                (preferences ?? []).map((p) => [
                p.boss_id,
                { preference: p.preference, spec_preference: p.spec_preference },
                ])
            )
            );
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchPreferences();
    }, [player]);

    const NO_PREFERENCE = 3;
    const savePref = async (bossId: number, patch: Partial<BossPref>) => {
        setError(null);
        const previous = prefs[bossId];

        setPrefs((p) => ({
            ...p,
            [bossId]: {
            preference: NO_PREFERENCE,
            spec_preference: null,
            ...p[bossId],
            ...patch,
            },
        }));

        const { error } = await supabase
            .from("player_preferences")
            .upsert(
            { user_id: player.user_id, boss_id: bossId, ...patch },
            { onConflict: "user_id,boss_id" }
            );

        if (error) {
            setError(error.message);
            setPrefs((p) => {
            const next = { ...p };
            if (previous === undefined) delete next[bossId];
            else next[bossId] = previous;
            return next;
            });
        }
    };


    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-2xl">Boss preferences</h2>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex flex-row gap-1 overflow-x-auto w-full">
                {raids && raids.length > 0 && raids.map(raid => {
                    const orderedBosses = raid.raid_bosses.sort((a, b) => a.id - b.id);
                    return (
                    <div key={raid.id} className="">
                        
                        <div className="flex flex-row gap-1">
                        {orderedBosses.map(boss => {
                            const row = prefs[boss.id];
                            const selectedId = row?.preference ?? NO_PREFERENCE;
                            const selected = preferenceOptions.find((o) => o.id === selectedId);
                            const triggerColour = selected?.colour ? `#${selected.colour}80` : "#90cbe980";
                            const specValue = row?.spec_preference ?? player.main_spec;
                            return (
                                <div key={boss.id} className="flex flex-col w-[128px]">
                                    <div className="bg-muted border border-accent rounded-sm ">
                                        <img src={boss.image} width={128} height={64}/>
                                        <p className="p-1 my-auto h-14">{boss.name}</p>
                                    </div>
                                    <Select
                                        value={String(selectedId)}
                                        onValueChange={(v) => savePref(boss.id, { preference: Number(v) })}
                                        disabled={loading}
                                    >
                                        <SelectTrigger
                                            className="w-full"
                                            style={{ backgroundColor: triggerColour }}
                                            >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                        <SelectGroup>
                                            {preferenceOptions.map((item) => {
                                                const base = item.colour;
                                                const colour = base ? `#${base}80` : undefined;
                                                return (
                                                    <SelectItem key={item.id} value={String(item.id)} style={{ backgroundColor: colour }}>
                                                        {item.option}
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={specValue != null ? String(specValue) : ""}
                                        onValueChange={(v) => savePref(boss.id, { spec_preference: Number(v) })}
                                        disabled={loading}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select main spec" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                            {classSpecs.map((item) => {
                                                const base = item.classes?.class_colour;
                                                const colour = base ? `#${base}80` : undefined;
                
                                                return (
                                                    <SelectItem key={item.id} value={String(item.id)} style={{ backgroundColor: colour }}>
                                                        <span className="flex items-center gap-2 text-xs" >
                                                            <img src={item.icon} width={20} height={20} alt="" className="shrink-0" />
                                                            {item.name}
                                                        </span>
                                                    </SelectItem>
                                                )
                                            })}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )
                        })}
                        </div>
                    </div>
                )})}
            </div>
        </div>
    )
}