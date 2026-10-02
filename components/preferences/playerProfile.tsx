"use client";

import * as React from "react"
import { useState } from "react";
import {Select,SelectContent,SelectGroup,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface Props{
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
    onUpdate: () => void | Promise<void>
}

export default function PlayerProfile({player,classSpecs,onUpdate}:Props){
    const supabase = createClient();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const handleSpecChange = async (value: string) => {
        setLoading(true);
        setError(null);

        const { error } = await supabase
            .from("players")
            .update({ main_spec: Number(value) })
            .eq("id", player.id);

        if (error) {
            setError(error.message);
        } else {
            await onUpdate();
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col gap-4 mt-8">
            <h2 className="text-6xl">{player.name}</h2>

            <div>
                <p>Main spec:</p>
                <div className="flex flex-row gap-2 items-center">
                    <Select
                    defaultValue={player.main_spec != null ? String(player.main_spec) : undefined}
                    onValueChange={handleSpecChange}
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="Select main spec" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                            {classSpecs.map((item) => {
                                const base = item.classes?.class_colour;
                                const colour = base ? `#${base}80` : undefined;

                                return (
                                    <SelectItem key={item.id} value={String(item.id)} style={{ backgroundColor: colour }}>
                                        <span className="flex items-center gap-2" >
                                            <img src={item.icon} width={20} height={20} alt="" className="shrink-0" />
                                            {item.classes.name} - {item.name}
                                        </span>
                                    </SelectItem>
                                )
                            })}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    {loading && (<Loader2 className="animate-spin"/>)}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
        </div>
    );
}