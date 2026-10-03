"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Calendar } from "@/components/ui/calendar"
import { ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Absences {
    id: number;
    user_id: string;
    start_date: string;
    end_date: string;
    player_id: number;
    players: Player;
}

interface Props {
    players:Player[];
}

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


export default function ManageAbsences({players}:Props){
    const supabase = createClient();
    const [absences, setAbsences] = useState<Absences[] | null>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>();

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date())
    const [endDate, setEndDate] = useState<Date | undefined>(new Date())
    const [absenceLoading, setAbsenceLoading] = useState<boolean>(false);

    const [selectedplayer, setSelectedPlayer] = useState<Player | null>(null);

    const toDateString = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    
    const fetchAbsences = async () => {
        const today = toDateString(new Date());
        const {data: absences, error:absencesError} = await supabase
            .from("player_absences")
            .select("*, players(*)")
            .gte("end_date", today)
            .order("start_date", { ascending: true });

        if (absencesError) {
            setError(absencesError.message);
        } else {
            setAbsences(absences);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchAbsences();
    }, [supabase]);

    if (loading) return "Loading..."

    
    const addNewAbsence = async () => {
        if (!startDate || !endDate) return;

        if (!selectedplayer) {
            setError("You must select a player.");
            return;
        }
        if (endDate < startDate) {
            setError("End date can't be before the start date.");
            return;
        }
        
        setAbsenceLoading(true);
        setError(null);

        const { error } = await supabase.from("player_absences").insert({
            player_id: selectedplayer?.id,
            start_date: toDateString(startDate),
            end_date: toDateString(endDate),
        });

        setAbsenceLoading(false);
        if (error) {
            setError(error.message);
        } else {
            setIsOpen(false);
            fetchAbsences();
        }
    }

    const removeAbsence = async (id:number) => {
        setAbsenceLoading(true);
        setError(null);

        const { error } = await supabase
            .from("player_absences")
            .delete()
            .eq("id",id);

        setAbsenceLoading(false);
        if (error) {
            setError(error.message);
        } else {
            setIsOpen(false);
            fetchAbsences();
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-2xl">Planned absences</h2>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {isOpen ? (
                <div className="flex flex-col gap-2">

                    {selectedplayer ? (
                        <div className="w-48 flex flex-col gap-2">
                            <div className="w-48 flex flex-row justify-between rounded-sm bg-muted border border-accent p-2"> 
                                <p>{selectedplayer.name}</p>
                                <button type="button" onClick={() =>setSelectedPlayer(null)}>
                                    <X className="text-red-500"/>
                                </button>
                            </div>
                            
                        </div>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger className="w-48 bg-muted rounded-sm flex flex-row justify-between p-2 ">
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

                    <div className="flex flex-row gap-8">
            
                        <div className="flex flex-col">
                            <label htmlFor="startDate" className="heading text-lg ">Absence start date</label>
                            
                            
                            <Calendar
                                mode="single"
                                id="startDate"
                                selected={startDate}
                                onSelect={setStartDate}
                                className="rounded-md border"
                                captionLayout="dropdown"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="endDate" className="heading text-lg ">Absence end date</label>
                            <Calendar
                                mode="single"
                                id="endDate"
                                selected={endDate}
                                onSelect={setEndDate}
                                className="rounded-md border"
                                captionLayout="dropdown"
                            />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 ">
                        <Button type="button" className="cursor-pointer" onClick={() => addNewAbsence()} disabled={absenceLoading}>
                            Add absence
                        </Button>
                        <Button variant="destructive" type="button" onClick={() => setIsOpen(false)} disabled={absenceLoading} className="cursor-pointer">
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <Button type="button" onClick={() => setIsOpen(true)} className="mr-auto cursor-pointer">
                    Add new absence
                </Button>
            )}

            

            {absences && absences?.length > 0 ? (
                <div className="flex flex-col gap-1">
                    {absences.map(a => (
                        <div key={a.id} className="bg-muted border border-accent rounded-sm flex flex-row gap-4 p-1 mr-auto items-center">
                            <p>{a.players.name}</p>
                            <p>Absence:</p>
                            <p>{a.start_date}</p>
                            <p>-</p>
                            <p>{a.end_date}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p>No planned absences</p>
            )}
        </div>
    )
}