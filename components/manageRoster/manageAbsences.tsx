"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Absence, type Player } from "@/lib/roster";
import type { DayButton } from "react-day-picker";
import { DefaultModal, ModalBackdrop } from "../ui/modals";


interface Props {
    players:Player[];
}

export default function ManageAbsences({players}:Props){
    const supabase = createClient();
    const [absences, setAbsences] = useState<Absence[] | null>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>();

    const [viewDay, setViewDay] = useState<Date>(new Date());
    const [absencesIsOpen, setAbsencesIsOpen] = useState<boolean>(false);
    const [confirmDeleteAbsence, setConfirmDeleteAbsence] = useState<number | null>(null);

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date())
    const [endDate, setEndDate] = useState<Date | undefined>(new Date())
    const [absenceLoading, setAbsenceLoading] = useState<boolean>(false);

    const [selectedplayer, setSelectedPlayer] = useState<Player | null>(null);

    const toDateString = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const absentOn = (day: Date): string[] => {
        const key = toDateString(day);
        const names = (absences ?? [])
            .filter(a => a.start_date <= key && key <= a.end_date)
            .map(a => a.players.name);
        return [...new Set(names)];
    };

    const fetchAbsences = async () => {
        const today = toDateString(new Date());
        const {data: absences, error:absencesError} = await supabase
            .from("player_absences")
            .select("*, players(*, classes_specializations(*,classes(*)))")
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

    const DayWithNames = useMemo(() => {
        return function DayWithNames(props: React.ComponentProps<typeof DayButton>) {
            const names = absentOn(props.day.date);
            return (
                <CalendarDayButton {...props} className="items-start justify-start ">
                    <span className="px-1">{props.day.date.getDate()}</span>
                    {names.slice(0, 1).map(n => (
                        <span key={n} className="w-full truncate text-left text-[10px] leading-tight rounded bg-red-500/40 px-1">
                            {n}
                        </span>
                    ))}
                    {names.length > 1 && <span className="text-[10px] bg-fuchsia-500/40 w-full rounded">+{names.length - 1} more</span>}
                </CalendarDayButton>
            );
        };
    }, [absences]);

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
            setConfirmDeleteAbsence(null);
        }
    }

    const now = new Date();
    const oneYearAhead = new Date(now);
    oneYearAhead.setFullYear(now.getFullYear() + 1);

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
                                weekStartsOn={1}
                                selected={startDate}
                                onSelect={setStartDate}
                                startMonth={now}
                                endMonth={oneYearAhead}
                                className="rounded-md border"
                                captionLayout="dropdown"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="endDate" className="heading text-lg ">Absence end date</label>
                            <Calendar
                                mode="single"
                                id="endDate"
                                weekStartsOn={1}
                                selected={endDate}
                                onSelect={setEndDate}
                                startMonth={now}
                                endMonth={oneYearAhead}
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
                    <p>Click on a day to see who is absent. Red = one or more players absent.</p>
                    <div className="flex flex-row flex-wrap gap-2 ">
                        <Calendar
                            mode="single"
                            selected={viewDay}
                            onSelect={(d) => d && setViewDay(d)}
                            weekStartsOn={1}
                            startMonth={now}
                            endMonth={oneYearAhead}
                            captionLayout="dropdown"
                            className="rounded-md border w-full max-w-96"
                            components={{ DayButton: DayWithNames }}
                        />
                        <div className="flex flex-col gap-1 border border-accent rounded-sm flex-1 min-w-48 max-w-96 p-2">
                            <h3 className="text-lg">{toDateString(viewDay)}</h3>
                            {absentOn(viewDay).length > 0 ? (
                                absentOn(viewDay).map(name => <p key={name}>{name}</p>)
                            ) : (
                                <p>Nobody is absent</p>
                            )}
                        </div>
                    </div>
                    <Button onClick={() => setAbsencesIsOpen(true)} className="mr-auto" variant={"secondary"}>
                        {absencesIsOpen ? "Hide " : "Show "} all absences
                    </Button>
                    {absencesIsOpen && (
                        <ModalBackdrop onClose={() => setAbsencesIsOpen(false)}>
                            <DefaultModal onClose={() => setAbsencesIsOpen(false)}>
                                <h2 className="text-xl">All planned absences</h2>
                                {absences.map(a => {
                                    const base = a.players.classes_specializations?.classes.class_colour;
                                    const classColour = base ? `#${base}4D` : undefined;
                                    return (
                                        <div key={a.id} style={{ backgroundColor: classColour }} className={`border border-accent rounded-sm flex flex-row gap-4 p-1 mr-auto items-center w-full justify-between`}>
                                            <span className="flex flex-row flex-wrap gap-x-2 items-center">
                                                <img
                                                    src={a.players.classes_specializations?.icon}
                                                    width={20}
                                                    height={20}
                                                    alt={a.players.classes_specializations?.name}
                                                    className="shrink-0 h-[20px] w-[20px]"
                                                    />
                                                <p className="w-24 truncate">{a.players.name}</p>
                                                <span className="flex flex-row flex-wrap gap-x-2">
                                                    <p>Absence:</p>
                                                    <span className="flex flex-row flex-wrap gap-x-2">
                                                        <p>{a.start_date}</p>
                                                        <p>-</p>
                                                        <p>{a.end_date}</p>
                                                    </span>
                                                </span>
                                            </span>
                                            <button type="button" className="text-red-500 bg-background  rounded-sm cursor-pointer" onClick={() => setConfirmDeleteAbsence(a.id)}><X /></button>
                                        </div>
                                    )
                                })}
                            </DefaultModal>
                        </ModalBackdrop>
                    )}
                    {confirmDeleteAbsence && (
                        <ModalBackdrop onClose={() => setConfirmDeleteAbsence(null)}>
                            <DefaultModal onClose={() => setConfirmDeleteAbsence(null)}>
                                <h2 className="text-xl">Delete absence</h2>
                                <p>Confirm deleting absence</p>
                                <div className="flex flex-row gap-1 items-center ml-auto mt-2">
                                    <Button onClick={()=>setConfirmDeleteAbsence(null)}>
                                        Cancel
                                    </Button>
                                    <Button variant="destructive" onClick={()=>removeAbsence(confirmDeleteAbsence)} disabled={loading}>
                                        Confirm
                                    </Button>
                                </div>
                            </DefaultModal>
                        </ModalBackdrop>
                    )}
                </div>
            ) : (
                <p>No planned absences</p>
            )}
        </div>
    )
}