"use client";

import { useSortable } from '@dnd-kit/react/sortable';
import { DragDropProvider } from '@dnd-kit/react';
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { move } from "@dnd-kit/helpers";
import { Button } from '../ui/button';
import { Check, Clock, Coins, Eye, EyeOff, Sofa } from 'lucide-react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger,} from "@/components/ui/tooltip"
import {Select,SelectContent,SelectGroup,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select"

interface Bosses{
    id: number;
    raid_id: number; 
    name: string;
    image: string;
    index: number | null;
    visible: boolean;
}

interface SortableProps{
    id:number,
    index:number,
    boss: Bosses,
    toggleVisibility: (item: any) => void;
}

function Sortable({id, index,boss,toggleVisibility}:SortableProps) {
  const {ref} = useSortable({id, index});

  return (
    <div ref={ref} className="flex flex-col w-[128px] bg-muted border border-accent rounded-sm cursor-move">
        <img src={boss.image} width={128} height={64} className={boss.visible ? "" : "opacity-25"}/>
        <p className={`p-1 my-auto h-12 text-sm ${boss.visible ? "" : "opacity-25"}`}>{boss.name}</p>
        <Button variant="outline" className="cursor-pointer h-6" onClick={()=>toggleVisibility(boss)}>
            {boss.visible ? (
                <span className='flex flex-row items-center gap-2'>
                    <EyeOff /> Hide
                </span>
            ) : (
                <span className='flex flex-row items-center gap-2'>
                    <Eye /> Show
                </span>
            )}
        </Button>
    </div>
  );
}

interface PreferenceOption {
  id: number;
  option: string;
  colour: string;
  roster_option: number | null;
}

interface RosterOption {
    id: number;
    option: string;
    colour: string;
}

interface PlayerPreference {
  id: number;
  boss_id: number;
  user_id: string;
  preference: number;
  spec_preference: number | null;
  preference_options: PreferenceOption | null;
}

interface Absence {
  id: number;
  user_id: string;
  start_date: string;
  end_date: string;
}

interface BossRosterRow {
  player_id: number;
  boss_id: number;
  spec: number | null;
  option: number | null;
}

interface Props {
    allPlayers: {
        id: number;
        name: string;
        main_spec: number | null;
        user_id: string | null;
        role: string;
        classes_specializations: {
            id: number;
            class_id: number;
            name: string;
            role: string;
            icon: string;
            classes: { 
                id: number; 
                name: string; 
                class_colour: string };
        } | null;
        player_preferences: PlayerPreference[];
        player_absences: Absence[];
        boss_rosters: BossRosterRow[];
    }[];
    specs: { 
        id: number;
        class_id: number;
        name: string;
        role: string;
        icon: string;
        classes: { 
            id: number; 
            name: string; 
            class_colour: string };
    }[];
    preferenceOptions: PreferenceOption[];
    rosterOptions: RosterOption[];
}

interface BossRoster {
  option: number | null;
  spec: number | null;
}

export default function BossOrder({allPlayers,specs,preferenceOptions,rosterOptions}:Props){

    const supabase = createClient();

    const [bosses, setBosses] = useState<Bosses[]>([])
    const [error, setError] = useState<string | null>();
    const [loading, setLoading] = useState(true);
    const [savingChanges, setSavingChanges] = useState<boolean>(false);

    const [overrides, setOverrides] = useState<Record<string, BossRosterRow | undefined>>(() =>
        Object.fromEntries(
            allPlayers.flatMap((p) =>
            (p.boss_rosters ?? []).map((r) => [`${r.player_id}:${r.boss_id}`, r])
            )
        )
    );

    const fetchBosses = async () => {
        const {data:bosses, error:bossesError} = await supabase
            .from("raid_bosses")
            .select("*");

        if (bossesError ) {
            setError(bossesError.message);
        } else {
            const sorted = [...(bosses || [])].sort((a: any, b: any) => {
                if (a.index === null) return 1;
                if (b.index === null) return -1;
                return a.index - b.index;
            });
            setBosses(sorted);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchBosses();
    }, [supabase]);

    const updateBossOrder = async (ordered: Bosses[]) => {
        setSavingChanges(true);
        setError(null);

        const results = await Promise.all(
            ordered.map((boss, index) =>
            supabase
                .from("raid_bosses")
                .update({ index })
                .eq("id", boss.id)
                .select("id")
            )
        );

        const failed = results.find((r) => r.error);
        const blocked = results.some((r) => !r.error && (r.data?.length ?? 0) === 0);

        if (failed?.error) {
            setError(failed.error.message);
            fetchBosses(); // restore the saved order
        } else if (blocked) {
            setError("Order change was blocked (are you an officer?).");
            fetchBosses();
        }

        setSavingChanges(false);
    };

    const toggleBossVisibility = async (id: number, visible: boolean) => {
        setError(null);
        const { data, error } = await supabase
            .from("raid_bosses")
            .update({ visible: !visible })
            .eq("id", id)
            .select();

        if (error) {
            setError(error.message);
        } else if (!data || data.length === 0) {
            setError("Update was blocked (are you an officer?).");
        } else {
            setBosses((items) =>
                items.map((b) => (b.id === id ? { ...b, visible: !visible } : b))
            );
        }
    };

    const byClass = (a: any, b: any) =>
        (a.classes_specializations?.classes?.name ?? "").localeCompare(
            b.classes_specializations?.classes?.name ?? ""
        ) || a.name.localeCompare(b.name);

    const NO_PREFERENCE_ID = 3;

    const rosterById = new Map(rosterOptions.map((r) => [r.id, r]));

    const defaultRoster = (() => {
    const pref = preferenceOptions.find((o) => o.id === NO_PREFERENCE_ID);
    return pref?.roster_option != null ? rosterById.get(pref.roster_option) : undefined;
    })();

    const sorted = [...(allPlayers ?? [])].sort(byClass);

    const tankPlayers   = sorted.filter((p) => p.classes_specializations?.role === "tank");
    const healerPlayers = sorted.filter((p) => p.classes_specializations?.role === "healer");
    const meleePlayers  = sorted.filter((p) => p.classes_specializations?.role === "melee");
    const rangedPlayers = sorted.filter((p) => p.classes_specializations?.role === "ranged");

    const specById = new Map((specs ?? []).map((s) => [s.id as number, s]));

    const dateString = (d: Date) =>
        d.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });

    const today = new Date();
    const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayStr = dateString(today);
    const weekAheadStr = dateString(weekAhead);

    if (loading) return "Loading..."

    if (!bosses) return null;

    const sortedBosses = bosses.filter(boss => boss.visible)

    

    const overrideOption = async (
        bossId: number,
        playerId: number,
        patch: Partial<Pick<BossRosterRow, "spec" | "option">>
        ) => {
        setError(null);
        const key = `${playerId}:${bossId}`;
        const previous = overrides[key];

        // optimistic update
        setOverrides((o) => ({
            ...o,
            [key]: { player_id: playerId, boss_id: bossId, spec: null, option: null, ...o[key], ...patch },
        }));

        const { error } = await supabase
            .from("boss_rosters")
            .upsert({ player_id: playerId, boss_id: bossId, ...patch }, { onConflict: "player_id,boss_id" });

        if (error) {
            setError(error.message);
            setOverrides((o) => ({ ...o, [key]: previous })); // revert
        }
    };

    const massOverride = async (playerId: number, rosterOptionId: number) => {
        setError(null);

        const rows = sortedBosses.map((boss) => ({
            player_id: playerId,
            boss_id: boss.id,
            option: rosterOptionId,
        }));
        if (rows.length === 0) return;

        // remember the old values so a failure can be rolled back
        const previous = Object.fromEntries(
            rows.map((r) => [`${r.player_id}:${r.boss_id}`, overrides[`${r.player_id}:${r.boss_id}`]])
        );

        // optimistic update, keeping any existing spec override
        setOverrides((o) => {
            const next = { ...o };
            for (const r of rows) {
            const key = `${r.player_id}:${r.boss_id}`;
            next[key] = {
                player_id: r.player_id,
                boss_id: r.boss_id,
                spec: null,
                ...next[key],
                option: rosterOptionId,
            };
            }
            return next;
        });

        const { error } = await supabase
            .from("boss_rosters")
            .upsert(rows, { onConflict: "player_id,boss_id" });

        if (error) {
            setError(error.message);
            setOverrides((o) => ({ ...o, ...previous }));
        }
    };


    return(
        <div className="flex flex-col gap-4 my-8">
            <h2 className="text-3xl">Boss order</h2>
            <div>
                 <p>Drag and drop boss-frames to change boss order. {savingChanges && <span className="ml-2 text-muted-foreground">Saving...</span>}</p>
                <p>Hide a boss to remove it from the final comp's boss order.</p>
            </div>
           
            
            {error && <p className="text-sm text-red-500">{error}</p>}
            {bosses ? (
                <DragDropProvider
                    onDragEnd={(event) => {
                        if (event.canceled) return;
                        const next = move(bosses, event);
                        setBosses(next);
                        updateBossOrder(next);
                    }}
                >
                    <div className="flex flex-row gap-1 overflow-x-auto w-full">
                    {bosses.map((item, index) => (
                        <Sortable key={item.id} id={item.id} index={index} boss={item} toggleVisibility={()=> toggleBossVisibility(item.id, item.visible)} />
                    ))}
                    </div>
                </DragDropProvider>
                ): (<p>No folders found.</p>)}


            <h2 className="text-3xl mt-8">Roster</h2>
            <div>
                <p>Click on a player's spec icon under each boss to override their spec preference.</p>
                <p>Click on the roster status (in/out) to override roster preferences.</p>
            </div>
            <div>
                <Table className="table-fixed overflow-x-auto" style={{ width: 64 + 128 + 128 * (sortedBosses?.length ?? 0) }}>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">{/* empty cell */}</TableHead>
                            <TableHead className="w-[128px]">
                                <p>{allPlayers?.length} players</p>
                            </TableHead>
                            {sortedBosses?.map(boss => (
                                <TableHead className="w-[128px] h-[100px] whitespace-normal align-top" key={boss.id}>
                                    <img src={boss.image} width={128} height={64}/>
                                    <p className="">{boss.name}</p>
                                </TableHead>
                            ))}
                            <TableHead className="w-[198px] whitespace-pre-line">
                                <div className="flex flex-col">
                                    <p>Mass-override</p>
                                    <p className="text-xs">Updates the entire row for the player</p>
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="border border-accent">
                    {tankPlayers?.map((p,index) => {
                        const prefByBoss = new Map<number, PlayerPreference>(
                            ((p.player_preferences ?? []) as PlayerPreference[]).map((pref) => [
                                pref.boss_id,
                                pref,
                            ])
                        );
                        const base = p.classes_specializations?.classes.class_colour;
                        const colour = base ? `#${base}80` : undefined;

                        const upcomingAbsences = ((p.player_absences ?? []) as Absence[])
                            .filter((a) => a.start_date <= weekAheadStr && a.end_date >= todayStr)
                            .sort((a, b) => a.start_date.localeCompare(b.start_date));

                        const isAbsent = upcomingAbsences.length > 0;
                        const absence = upcomingAbsences[0];
                        return (
                            <TableRow key={p.id} className="border border-accent">
                                {index === 0 && (
                                    <TableCell rowSpan={tankPlayers?.length} className="bg-[#9bb9ee80] border border-accent">
                                        <div className="flex flex-row items-center gap-1">
                                            <img src="/tank.svg" width={30} height={30} alt=""/>
                                            Tank
                                        </div>
                                    </TableCell>
                                )}
                                <TableCell style={{ backgroundColor: colour }} className="flex flex-row gap-1">
                                    <img src={p.classes_specializations?.icon} width={20} height={20} alt="" className="shrink-0" />
                                    {p.name}
                                </TableCell>
                                {sortedBosses?.map((boss) => {
                                    const pref = prefByBoss.get(boss.id);
                                    const override = overrides[`${p.id}:${boss.id}`];

                                    const rosterId =
                                        override?.option ??
                                        pref?.preference_options?.roster_option ??
                                        defaultRoster?.id;
                                    const rosterOption = rosterId != null ? rosterById.get(rosterId) : undefined;
                                    const colour = rosterOption?.colour ? `#${rosterOption.colour}80` : undefined;

                                    const specValue = override?.spec ?? pref?.spec_preference ?? p.main_spec;

                                    const compactTrigger = "h-4 size-6 m-0 gap-1 px-1 py-0 text-xs shadow-none border-0 [&>svg]:hidden";
                                    const selectedSpec = specValue != null ? specById.get(specValue) : undefined;
                                    return (
                                    <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent p-0">
                                        <div className="flex flex-row justify-between">
                                            <div className="flex flex-row items-center gap-1 min-w-0 flex-1">
                                                <Select
                                                    value={specValue != null ? String(specValue) : ""}
                                                    onValueChange={(v) => overrideOption(boss.id, p.id, { spec: Number(v) })}
                                                    disabled={loading}
                                                    
                                                >
                                                    <SelectTrigger className={`${compactTrigger} w-8 min-w-8 shrink-0 justify-center [&>span]:flex [&>span]:items-center`} title={selectedSpec?.name}>
                                                        <SelectValue placeholder="?">
                                                        {selectedSpec && (
                                                            <img
                                                            src={selectedSpec.icon}
                                                            width={20}
                                                            height={20}
                                                            alt={selectedSpec.name}
                                                            className="shrink-0"
                                                            />
                                                        )}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                        {specs.map((item) => {
                                                            const base = item.classes?.class_colour;
                                                            return (
                                                            <SelectItem
                                                                key={item.id}
                                                                value={String(item.id)}
                                                                style={{ backgroundColor: base ? `#${base}80` : undefined }}
                                                            >
                                                                <span className="flex items-center gap-2 text-xs">
                                                                <img src={item.icon} width={20} height={20} alt="" className="shrink-0" />
                                                                {item.name}
                                                                </span>
                                                            </SelectItem>
                                                            );
                                                        })}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>

                                                <Select
                                                    value={String(rosterId)}
                                                    onValueChange={(v) => overrideOption(boss.id, p.id, { option: Number(v) })}
                                                    disabled={loading}
                                                >
                                                    <SelectTrigger
                                                        className={`${compactTrigger} w-20`}
                                                        style={{ backgroundColor: colour }}
                                                        >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                    <SelectGroup>
                                                        {rosterOptions.map((item) => {
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
                                            </div>
                                            <div className="flex flex-row items-center">
                                            {isAbsent && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Clock className="bg-yellow-500 rounded-xl shadow-md shadow-yellow-500" size={20}/>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <span className="flex flex-col">
                                                            {upcomingAbsences.map((a,index) => (
                                                                <span key={index} className="flex flex-row gap-1">
                                                                    <span>away</span>
                                                                    <span>{a.start_date}</span>
                                                                    <span>to</span>
                                                                    <span>{a.end_date}</span>
                                                                </span>
                                                            ))}
                                                        </span>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            {pref && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        {pref.preference_options?.id === 1 ? (
                                                            <Coins className="bg-fuchsia-500 rounded-xl shadow-md shadow-fuchsia-500" size={20}/>
                                                        ) : pref.preference_options?.id === 2 ? (
                                                            <Check className="bg-green-500 rounded-xl shadow-md shadow-green-500" size={20}/>
                                                        ) : pref.preference_options?.id === 4 ? (
                                                            <Sofa className="bg-red-500 rounded-xl shadow-md shadow-red-500" size={20}/>
                                                        ) : null}
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {pref.preference_options?.id === 1 ? (
                                                            <span>Will bonus roll</span>
                                                        ) : pref.preference_options?.id === 2 ? (
                                                            <span>Wants to play</span>
                                                        ) : pref.preference_options?.id === 4 ? (
                                                            <span>Wants to sit out</span>
                                                        ) : <span>No preference</span>}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            </div>
                                            
                                        </div>
                                    </TableCell>
                                    );
                                })}
                                <TableCell className="p-0">
                                    <div className='w-full flex flex-row '>
                                        <button type="button" className="bg-[#afe99080] hover:bg-[#afe99080]/80 cursor-pointer py-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 1)}>In</button>
                                        <button type="button" className="bg-[#e47d7d80] hover:bg-[#e47d7d80]/80 cursor-pointer p-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 2)}>Out</button>
                                        <button type="button" className="bg-[#e4cb7d80] hover:bg-[#e4cb7d80]/80 cursor-pointer p-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 3)}>Away</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {healerPlayers?.map((p,index) => {
                        const prefByBoss = new Map<number, PlayerPreference>(
                            ((p.player_preferences ?? []) as PlayerPreference[]).map((pref) => [
                                pref.boss_id,
                                pref,
                            ])
                        );
                        const base = p.classes_specializations?.classes.class_colour;
                        const colour = base ? `#${base}80` : undefined;

                        const upcomingAbsences = ((p.player_absences ?? []) as Absence[])
                            .filter((a) => a.start_date <= weekAheadStr && a.end_date >= todayStr)
                            .sort((a, b) => a.start_date.localeCompare(b.start_date));

                        const isAbsent = upcomingAbsences.length > 0;
                        const absence = upcomingAbsences[0];
                        return (
                            <TableRow key={p.id} className="border border-accent">
                                {index === 0 && (
                                    <TableCell rowSpan={healerPlayers?.length} className="bg-[#ade89980] border border-accent">
                                        <div className="flex flex-row items-center gap-1">
                                            <img src="/healer.svg" width={30} height={30} alt=""/>
                                            Healer
                                        </div>
                                    </TableCell>
                                )}
                                <TableCell style={{ backgroundColor: colour }} className="flex flex-row gap-1">
                                    <img src={p.classes_specializations?.icon} width={20} height={20} alt="" className="shrink-0" />
                                    {p.name}
                                </TableCell>
                                {sortedBosses?.map((boss) => {
                                    const pref = prefByBoss.get(boss.id);
                                    const override = overrides[`${p.id}:${boss.id}`];

                                    const rosterId =
                                        override?.option ??
                                        pref?.preference_options?.roster_option ??
                                        defaultRoster?.id;
                                    const rosterOption = rosterId != null ? rosterById.get(rosterId) : undefined;
                                    const colour = rosterOption?.colour ? `#${rosterOption.colour}80` : undefined;

                                    const specValue = override?.spec ?? pref?.spec_preference ?? p.main_spec;

                                    const compactTrigger = "h-4 size-6 m-0 gap-1 px-1 py-0 text-xs shadow-none border-0 [&>svg]:hidden";
                                    const selectedSpec = specValue != null ? specById.get(specValue) : undefined;
                                    return (
                                    <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent p-0">
                                        <div className="flex flex-row justify-between">
                                            <div className="flex flex-row items-center gap-1 min-w-0 flex-1">
                                                <Select
                                                    value={specValue != null ? String(specValue) : ""}
                                                    onValueChange={(v) => overrideOption(boss.id, p.id, { spec: Number(v) })}
                                                    disabled={loading}
                                                    
                                                >
                                                    <SelectTrigger className={`${compactTrigger} w-8 min-w-8 shrink-0 justify-center [&>span]:flex [&>span]:items-center`} title={selectedSpec?.name}>
                                                        <SelectValue placeholder="?">
                                                        {selectedSpec && (
                                                            <img
                                                            src={selectedSpec.icon}
                                                            width={20}
                                                            height={20}
                                                            alt={selectedSpec.name}
                                                            className="shrink-0"
                                                            />
                                                        )}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                        {specs.map((item) => {
                                                            const base = item.classes?.class_colour;
                                                            return (
                                                            <SelectItem
                                                                key={item.id}
                                                                value={String(item.id)}
                                                                style={{ backgroundColor: base ? `#${base}80` : undefined }}
                                                            >
                                                                <span className="flex items-center gap-2 text-xs">
                                                                <img src={item.icon} width={20} height={20} alt="" className="shrink-0" />
                                                                {item.name}
                                                                </span>
                                                            </SelectItem>
                                                            );
                                                        })}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>

                                                <Select
                                                    value={String(rosterId)}
                                                    onValueChange={(v) => overrideOption(boss.id, p.id, { option: Number(v) })}
                                                    disabled={loading}
                                                >
                                                    <SelectTrigger
                                                        className={`${compactTrigger} w-20`}
                                                        style={{ backgroundColor: colour }}
                                                        >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                    <SelectGroup>
                                                        {rosterOptions.map((item) => {
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
                                            </div>
                                            <div className="flex flex-row items-center">
                                            {isAbsent && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Clock className="bg-yellow-500 rounded-xl shadow-md shadow-yellow-500" size={20}/>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <span className="flex flex-col">
                                                            {upcomingAbsences.map((a,index) => (
                                                                <span key={index} className="flex flex-row gap-1">
                                                                    <span>away</span>
                                                                    <span>{a.start_date}</span>
                                                                    <span>to</span>
                                                                    <span>{a.end_date}</span>
                                                                </span>
                                                            ))}
                                                        </span>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            {pref && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        {pref.preference_options?.id === 1 ? (
                                                            <Coins className="bg-fuchsia-500 rounded-xl shadow-md shadow-fuchsia-500" size={20}/>
                                                        ) : pref.preference_options?.id === 2 ? (
                                                            <Check className="bg-green-500 rounded-xl shadow-md shadow-green-500" size={20}/>
                                                        ) : pref.preference_options?.id === 4 ? (
                                                            <Sofa className="bg-red-500 rounded-xl shadow-md shadow-red-500" size={20}/>
                                                        ) : null}
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {pref.preference_options?.id === 1 ? (
                                                            <span>Will bonus roll</span>
                                                        ) : pref.preference_options?.id === 2 ? (
                                                            <span>Wants to play</span>
                                                        ) : pref.preference_options?.id === 4 ? (
                                                            <span>Wants to sit out</span>
                                                        ) : <span>No preference</span>}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            </div>
                                            
                                        </div>
                                    </TableCell>
                                    );
                                })}
                                <TableCell className="p-0">
                                    <div className='w-full flex flex-row '>
                                        <button type="button" className="bg-[#afe99080] hover:bg-[#afe99080]/80 cursor-pointer py-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 1)}>In</button>
                                        <button type="button" className="bg-[#e47d7d80] hover:bg-[#e47d7d80]/80 cursor-pointer p-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 2)}>Out</button>
                                        <button type="button" className="bg-[#e4cb7d80] hover:bg-[#e4cb7d80]/80 cursor-pointer p-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 3)}>Away</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {meleePlayers?.map((p,index) => {
                        const prefByBoss = new Map<number, PlayerPreference>(
                            ((p.player_preferences ?? []) as PlayerPreference[]).map((pref) => [
                                pref.boss_id,
                                pref,
                            ])
                        );
                        const base = p.classes_specializations?.classes.class_colour;
                        const colour = base ? `#${base}80` : undefined;

                        const upcomingAbsences = ((p.player_absences ?? []) as Absence[])
                            .filter((a) => a.start_date <= weekAheadStr && a.end_date >= todayStr)
                            .sort((a, b) => a.start_date.localeCompare(b.start_date));

                        const isAbsent = upcomingAbsences.length > 0;
                        const absence = upcomingAbsences[0];
                        return (
                            <TableRow key={p.id} className="border border-accent">
                                {index === 0 && (
                                    <TableCell rowSpan={meleePlayers?.length} className="bg-[#e49e9080] border border-accent">
                                        <div className="flex flex-row items-center gap-1">
                                            <img src="/mdps.svg" width={30} height={30} alt=""/>
                                            Melee
                                        </div>
                                    </TableCell>
                                )}
                                <TableCell style={{ backgroundColor: colour }} className="flex flex-row gap-1">
                                    <img src={p.classes_specializations?.icon} width={20} height={20} alt="" className="shrink-0" />
                                    {p.name}
                                </TableCell>
                                {sortedBosses?.map((boss) => {
                                    const pref = prefByBoss.get(boss.id);
                                    const override = overrides[`${p.id}:${boss.id}`];

                                    const rosterId =
                                        override?.option ??
                                        pref?.preference_options?.roster_option ??
                                        defaultRoster?.id;
                                    const rosterOption = rosterId != null ? rosterById.get(rosterId) : undefined;
                                    const colour = rosterOption?.colour ? `#${rosterOption.colour}80` : undefined;

                                    const specValue = override?.spec ?? pref?.spec_preference ?? p.main_spec;

                                    const compactTrigger = "h-4 size-6 m-0 gap-1 px-1 py-0 text-xs shadow-none border-0 [&>svg]:hidden";
                                    const selectedSpec = specValue != null ? specById.get(specValue) : undefined;
                                    return (
                                    <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent p-0">
                                        <div className="flex flex-row justify-between">
                                            <div className="flex flex-row items-center gap-1 min-w-0 flex-1">
                                                <Select
                                                    value={specValue != null ? String(specValue) : ""}
                                                    onValueChange={(v) => overrideOption(boss.id, p.id, { spec: Number(v) })}
                                                    disabled={loading}
                                                    
                                                >
                                                    <SelectTrigger className={`${compactTrigger} w-8 min-w-8 shrink-0 justify-center [&>span]:flex [&>span]:items-center`} title={selectedSpec?.name}>
                                                        <SelectValue placeholder="?">
                                                        {selectedSpec && (
                                                            <img
                                                            src={selectedSpec.icon}
                                                            width={20}
                                                            height={20}
                                                            alt={selectedSpec.name}
                                                            className="shrink-0"
                                                            />
                                                        )}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                        {specs.map((item) => {
                                                            const base = item.classes?.class_colour;
                                                            return (
                                                            <SelectItem
                                                                key={item.id}
                                                                value={String(item.id)}
                                                                style={{ backgroundColor: base ? `#${base}80` : undefined }}
                                                            >
                                                                <span className="flex items-center gap-2 text-xs">
                                                                <img src={item.icon} width={20} height={20} alt="" className="shrink-0" />
                                                                {item.name}
                                                                </span>
                                                            </SelectItem>
                                                            );
                                                        })}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>

                                                <Select
                                                    value={String(rosterId)}
                                                    onValueChange={(v) => overrideOption(boss.id, p.id, { option: Number(v) })}
                                                    disabled={loading}
                                                >
                                                    <SelectTrigger
                                                        className={`${compactTrigger} w-20`}
                                                        style={{ backgroundColor: colour }}
                                                        >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                    <SelectGroup>
                                                        {rosterOptions.map((item) => {
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
                                            </div>
                                            <div className="flex flex-row items-center">
                                            {isAbsent && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Clock className="bg-yellow-500 rounded-xl shadow-md shadow-yellow-500" size={20}/>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <span className="flex flex-col">
                                                            {upcomingAbsences.map((a,index) => (
                                                                <span key={index} className="flex flex-row gap-1">
                                                                    <span>away</span>
                                                                    <span>{a.start_date}</span>
                                                                    <span>to</span>
                                                                    <span>{a.end_date}</span>
                                                                </span>
                                                            ))}
                                                        </span>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            {pref && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        {pref.preference_options?.id === 1 ? (
                                                            <Coins className="bg-fuchsia-500 rounded-xl shadow-md shadow-fuchsia-500" size={20}/>
                                                        ) : pref.preference_options?.id === 2 ? (
                                                            <Check className="bg-green-500 rounded-xl shadow-md shadow-green-500" size={20}/>
                                                        ) : pref.preference_options?.id === 4 ? (
                                                            <Sofa className="bg-red-500 rounded-xl shadow-md shadow-red-500" size={20}/>
                                                        ) : null}
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {pref.preference_options?.id === 1 ? (
                                                            <span>Will bonus roll</span>
                                                        ) : pref.preference_options?.id === 2 ? (
                                                            <span>Wants to play</span>
                                                        ) : pref.preference_options?.id === 4 ? (
                                                            <span>Wants to sit out</span>
                                                        ) : <span>No preference</span>}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            </div>
                                            
                                        </div>
                                    </TableCell>
                                    );
                                })}
                                <TableCell className="p-0">
                                    <div className='w-full flex flex-row '>
                                        <button type="button" className="bg-[#afe99080] hover:bg-[#afe99080]/80 cursor-pointer py-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 1)}>In</button>
                                        <button type="button" className="bg-[#e47d7d80] hover:bg-[#e47d7d80]/80 cursor-pointer p-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 2)}>Out</button>
                                        <button type="button" className="bg-[#e4cb7d80] hover:bg-[#e4cb7d80]/80 cursor-pointer p-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 3)}>Away</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {rangedPlayers?.map((p,index) => {
                        const prefByBoss = new Map<number, PlayerPreference>(
                            ((p.player_preferences ?? []) as PlayerPreference[]).map((pref) => [
                                pref.boss_id,
                                pref,
                            ])
                        );
                        const base = p.classes_specializations?.classes.class_colour;
                        const colour = base ? `#${base}80` : undefined;

                        const upcomingAbsences = ((p.player_absences ?? []) as Absence[])
                            .filter((a) => a.start_date <= weekAheadStr && a.end_date >= todayStr)
                            .sort((a, b) => a.start_date.localeCompare(b.start_date));

                        const isAbsent = upcomingAbsences.length > 0;
                        const absence = upcomingAbsences[0];
                        return (
                            <TableRow key={p.id} className="border border-accent">
                                {index === 0 && (
                                    <TableCell rowSpan={rangedPlayers?.length} className="bg-[#e693b880] border border-accent">
                                        <div className="flex flex-row items-center gap-1">
                                            <img src="/rdps.svg" width={30} height={30} alt=""/>
                                            Ranged
                                        </div>
                                    </TableCell>
                                )}
                                <TableCell style={{ backgroundColor: colour }} className="flex flex-row gap-1">
                                    <img src={p.classes_specializations?.icon} width={20} height={20} alt="" className="shrink-0" />
                                    {p.name}
                                </TableCell>
                                {sortedBosses?.map((boss) => {
                                    const pref = prefByBoss.get(boss.id);
                                    const override = overrides[`${p.id}:${boss.id}`];

                                    const rosterId =
                                        override?.option ??
                                        pref?.preference_options?.roster_option ??
                                        defaultRoster?.id;
                                    const rosterOption = rosterId != null ? rosterById.get(rosterId) : undefined;
                                    const colour = rosterOption?.colour ? `#${rosterOption.colour}80` : undefined;

                                    const specValue = override?.spec ?? pref?.spec_preference ?? p.main_spec;

                                    const compactTrigger = "h-4 size-6 m-0 gap-1 px-1 py-0 text-xs shadow-none border-0 [&>svg]:hidden";
                                    const selectedSpec = specValue != null ? specById.get(specValue) : undefined;
                                    return (
                                    <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent p-0">
                                        <div className="flex flex-row justify-between">
                                            <div className="flex flex-row items-center gap-1 min-w-0 flex-1">
                                                <Select
                                                    value={specValue != null ? String(specValue) : ""}
                                                    onValueChange={(v) => overrideOption(boss.id, p.id, { spec: Number(v) })}
                                                    disabled={loading}
                                                    
                                                >
                                                    <SelectTrigger className={`${compactTrigger} w-8 min-w-8 shrink-0 justify-center [&>span]:flex [&>span]:items-center`} title={selectedSpec?.name}>
                                                        <SelectValue placeholder="?">
                                                        {selectedSpec && (
                                                            <img
                                                            src={selectedSpec.icon}
                                                            width={20}
                                                            height={20}
                                                            alt={selectedSpec.name}
                                                            className="shrink-0"
                                                            />
                                                        )}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                        {specs.map((item) => {
                                                            const base = item.classes?.class_colour;
                                                            return (
                                                            <SelectItem
                                                                key={item.id}
                                                                value={String(item.id)}
                                                                style={{ backgroundColor: base ? `#${base}80` : undefined }}
                                                            >
                                                                <span className="flex items-center gap-2 text-xs">
                                                                <img src={item.icon} width={20} height={20} alt="" className="shrink-0" />
                                                                {item.name}
                                                                </span>
                                                            </SelectItem>
                                                            );
                                                        })}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>

                                                <Select
                                                    value={String(rosterId)}
                                                    onValueChange={(v) => overrideOption(boss.id, p.id, { option: Number(v) })}
                                                    disabled={loading}
                                                >
                                                    <SelectTrigger
                                                        className={`${compactTrigger} w-20`}
                                                        style={{ backgroundColor: colour }}
                                                        >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                    <SelectGroup>
                                                        {rosterOptions.map((item) => {
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
                                            </div>
                                            <div className="flex flex-row items-center">
                                            {isAbsent && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Clock className="bg-yellow-500 rounded-xl shadow-md shadow-yellow-500" size={20}/>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <span className="flex flex-col">
                                                            {upcomingAbsences.map((a,index) => (
                                                                <span key={index} className="flex flex-row gap-1">
                                                                    <span>away</span>
                                                                    <span>{a.start_date}</span>
                                                                    <span>to</span>
                                                                    <span>{a.end_date}</span>
                                                                </span>
                                                            ))}
                                                        </span>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            {pref && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        {pref.preference_options?.id === 1 ? (
                                                            <Coins className="bg-fuchsia-500 rounded-xl shadow-md shadow-fuchsia-500" size={20}/>
                                                        ) : pref.preference_options?.id === 2 ? (
                                                            <Check className="bg-green-500 rounded-xl shadow-md shadow-green-500" size={20}/>
                                                        ) : pref.preference_options?.id === 4 ? (
                                                            <Sofa className="bg-red-500 rounded-xl shadow-md shadow-red-500" size={20}/>
                                                        ) : null}
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {pref.preference_options?.id === 1 ? (
                                                            <span>Will bonus roll</span>
                                                        ) : pref.preference_options?.id === 2 ? (
                                                            <span>Wants to play</span>
                                                        ) : pref.preference_options?.id === 4 ? (
                                                            <span>Wants to sit out</span>
                                                        ) : <span>No preference</span>}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            </div>
                                            
                                        </div>
                                    </TableCell>
                                    );
                                })}
                                <TableCell className="p-0">
                                    <div className='w-full flex flex-row '>
                                        <button type="button" className="bg-[#afe99080] hover:bg-[#afe99080]/80 cursor-pointer py-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 1)}>In</button>
                                        <button type="button" className="bg-[#e47d7d80] hover:bg-[#e47d7d80]/80 cursor-pointer p-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 2)}>Out</button>
                                        <button type="button" className="bg-[#e4cb7d80] hover:bg-[#e4cb7d80]/80 cursor-pointer p-2 w-[66px] rounded-sm" onClick={() => massOverride(p.id, 3)}>Away</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}