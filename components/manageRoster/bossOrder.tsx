"use client";

import { useSortable } from '@dnd-kit/react/sortable';
import { DragDropProvider } from '@dnd-kit/react';
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { move } from "@dnd-kit/helpers";
import { Button } from '../ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { Table, TableBody, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { ROLES, type Role, type PreferenceOption, type PlayerPreference, type Absence, type RosterOption, type BossRosterRow, type Bosses } from "@/lib/roster";
import ManageRosterTableRole from "./manageRosterTableRole";
import AddNewPlayer from "./addNewPlayer";
import { DefaultModalPopup, ModalBackdrop } from "../ui/modals";

interface SortableProps{
    id:number,
    index:number,
    boss: Bosses,
    toggleVisibility: (item: any) => void;
}

function Sortable({id,index,boss,toggleVisibility}:SortableProps) {
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

interface Props {
    allPlayers: {
        id: number;
        name: string;
        main_spec: number | null;
        main_role: Role;
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
    onUpdate: () => void;
}

export default function BossOrder({allPlayers,specs,preferenceOptions,rosterOptions,onUpdate}:Props){
    const supabase = createClient();
    const [bosses, setBosses] = useState<Bosses[]>([])
    const [error, setError] = useState<string | null>();
    const [loading, setLoading] = useState(true);
    const [savingChanges, setSavingChanges] = useState<boolean>(false);
    const [confirmReset, setConfirmReset] = useState<boolean>(false);

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

    const removeAllBossRosters = async () => {
        setError(null);
        const { error } = await supabase
            .from("boss_rosters")
            .delete()
            .neq("id", 0); 

        if (error) {
            setError(error.message);
        } else {
            setOverrides({});  
            onUpdate();
            setConfirmReset(false);
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

    const specById = new Map((specs ?? []).map((s) => [s.id as number, s]));

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
        <div className="flex flex-col gap-4">
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
                <p>Click on a player's name to edit their nickname and main spec.</p>
                <p>Click on a player's spec icon under each boss to override their spec preference.</p>
                <p>Click on the roster status (in/out) to override roster preferences.</p>
            </div>
            <Button className="mr-auto" variant={"secondary"} onClick={()=>setConfirmReset(true)}>
                Reset table
            </Button>
            {confirmReset && (
                <ModalBackdrop onClose={()=>setConfirmReset(false)}>
                    <DefaultModalPopup onClose={()=>setConfirmReset(false)}>
                        <h2 className="text-xl">Confirm resetting table</h2>
                        <p>Removes the current boss comps and shows only player preferences.</p>
                        <div className="flex flex-row gap-1 items-center ml-auto mt-2">
                            <Button onClick={()=>setConfirmReset(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={()=>removeAllBossRosters()} disabled={loading}>
                                Confirm
                            </Button>
                        </div>
                    </DefaultModalPopup>
                </ModalBackdrop>
            )}
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
                        {(Object.keys(ROLES) as Role[]).map((role) => (
                            <ManageRosterTableRole
                                key={role}
                                role={role}
                                players={sorted.filter((p) => p.classes_specializations?.role === role)}
                                raidbosses={sortedBosses ?? []}
                                specById={specById}
                                specs={specs}
                                rosterOptions={rosterOptions}
                                loading={loading}
                                defaultRoster={defaultRoster}
                                rosterById={rosterById}
                                overrides={overrides}
                                overrideOption={overrideOption}
                                massOverride={massOverride}
                                onUpdate={onUpdate}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}