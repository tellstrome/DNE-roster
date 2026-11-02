import { TableCell, TableRow, } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger,} from "@/components/ui/tooltip"
import { ROLES, type Role, type Player, type ClassSpec, type PlayerPreference, type Absence, type RosterOption, type BossRosterRow } from "@/lib/roster";
import { Check, Clock, Coins, Sofa } from 'lucide-react';
import {Select,SelectContent,SelectGroup,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select"
import ManageSinglePlayer from "./manageSinglePlayer";

interface Props {
    players: Player[];
    role: Role;
    raidbosses: {
        id: number;
    }[];
    specById: Map<number, {
        id: number;
        name: string;
        icon: string;
    }>;
    specs: ClassSpec[];
    rosterOptions: RosterOption[];
    loading: boolean;
    defaultRoster: RosterOption | undefined;
    rosterById: Map<number, {
        id: number;
        option: string;
        colour: string;
    }>;
    overrides: Record<string, BossRosterRow | undefined>;
    overrideOption: (
        bossId: number,
        playerId: number,
        patch: Partial<Pick<BossRosterRow, "spec" | "option">>
    ) => void;
    massOverride: (
        playerId: number, 
        rosterOptionId: number
    ) => void;
    onUpdate: () => void;
}

export default function ManageRosterTableRole({players,role,raidbosses,specById,specs,rosterOptions,loading,defaultRoster,rosterById,overrides,overrideOption,massOverride,onUpdate }:Props){

    const dateString = (d: Date) =>
        d.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });

    const today = new Date();
    const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayStr = dateString(today);
    const weekAheadStr = dateString(weekAhead);

    const { bg: columnBgColour, icon: columnSvg } = ROLES[role];

    return (
        <>
            {players?.map((p,index) => {
                const prefByBoss = new Map<number, PlayerPreference>(
                    ((p.player_preferences ?? []) as PlayerPreference[]).map((pref) => [
                        pref.boss_id,
                        pref,
                    ])
                );
                const base = p.classes_specializations?.classes.class_colour;
                const classColour = base ? `#${base}80` : undefined;

                const upcomingAbsences = ((p.player_absences ?? []) as Absence[])
                    .filter((a) => a.start_date <= weekAheadStr && a.end_date >= todayStr)
                    .sort((a, b) => a.start_date.localeCompare(b.start_date));

                const isAbsent = upcomingAbsences.length > 0;
                
                return (
                    <TableRow key={p.id} className="border border-accent">
                        {index === 0 && (
                            <TableCell rowSpan={players?.length} className={`${columnBgColour} border border-accent`}>
                                <div className="flex flex-row items-center gap-1">
                                    <img src={columnSvg} width={30} height={30} alt=""/>
                                    <p className="capitalize">{role}</p>
                                </div>
                            </TableCell>
                        )}
                        <TableCell style={{ backgroundColor: classColour }} className="flex flex-row gap-1 p-0">                            
                            <ManageSinglePlayer classSpecs={specs} onUpdate={onUpdate} player={p} specById={specById}/>
                        </TableCell>
                        {raidbosses?.map((boss) => {
                            const pref = prefByBoss.get(boss.id);
                            const override = overrides[`${p.id}:${boss.id}`];

                            const rosterId =
                                override?.option ??
                                pref?.preference_options?.roster_option ??
                                defaultRoster?.id;
                            const rosterOption = rosterId != null ? rosterById.get(rosterId) : undefined;
                            const cellColour = rosterOption?.colour ? `#${rosterOption.colour}80` : undefined;

                            const specValue = override?.spec ?? pref?.spec_preference ?? p.main_spec;

                            const compactTrigger = "h-4 size-6 m-0 gap-1 px-1 py-0 text-xs shadow-none border-0 [&>svg]:hidden";
                            const selectedSpec = specValue != null ? specById.get(specValue) : undefined;
                            return (
                            <TableCell key={boss.id} style={{ backgroundColor: cellColour }} className="border border-accent p-0">
                                <div className="flex flex-row justify-between">
                                    <div className="flex flex-row items-center gap-1 min-w-0 flex-1">
                                        <Select
                                            value={specValue != null ? String(specValue) : ""}
                                            onValueChange={(v) => overrideOption(boss.id, p.id, { spec: Number(v) })}
                                            disabled={loading}
                                            
                                        >
                                            <SelectTrigger 
                                            className={`${compactTrigger} w-8 min-w-8 shrink-0 justify-center [&>span]:flex [&>span]:items-center`} 
                                            title={selectedSpec?.name}
                                            style={{ backgroundColor: "transparent" }}>
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
                                                style={{ backgroundColor: "transparent" }}
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
        </>
    )
}