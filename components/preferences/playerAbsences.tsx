"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Calendar } from "@/components/ui/calendar"

interface Absences {
    id: number;
    user_id: string;
    start_date: string;
    end_date: string;
}

interface Props {
    player: {
        id: number;
        name: string;
        main_spec: number;
        user_id: string;
        role: string;
    }
}



export default function PlayerAbsences({player}:Props){
    const supabase = createClient();
    const [absences, setAbsences] = useState<Absences[] | null>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>();

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date())
    const [endDate, setEndDate] = useState<Date | undefined>(new Date())

    const fetchAbsences = async () => {
        const {data: absences, error:absencesError} = await supabase
            .from("player_absences")
            .select("*")
            .eq("user_id", player.user_id);

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

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-2xl">Planned absences</h2>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {isOpen ? (
                <div className="flex flex-col gap-2">
                    <form>
                        <div className="flex flex-row gap-8">
                
                            <div className="flex flex-col">
                                <label htmlFor="startDate" className="heading text-lg mt-6">Absence start date</label>
                                
                                
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
                                <label htmlFor="endDate" className="heading text-lg mt-6">Absence end date</label>
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
                    </form>
                    <Button variant="destructive" type="button" onClick={() => setIsOpen(false)} className="mr-auto">
                        Cancel
                    </Button>
                </div>
            ) : (
                <Button type="button" onClick={() => setIsOpen(true)} className="mr-auto">
                    Add new absence
                </Button>
            )}

            

            {absences && absences?.length > 0 ? (
                <div>

                </div>
            ) : (
                <p>No planned absences</p>
            )}
        </div>
    )
}