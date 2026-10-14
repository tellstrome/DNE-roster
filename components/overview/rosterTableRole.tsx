import { TableCell, TableRow, } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger,} from "@/components/ui/tooltip"
import { ROLES, type Role, type Player, type ClassSpec, type PlayerPreference, type Absence, type RosterOption, type BossRosterRow } from "@/lib/roster";
import { Clock } from "lucide-react";

interface Props {
    players: Player[];
    role: Role;
    raidbosses: {
        id: number;
    }[];
    defaultOption: {
        id: number;
        option: string;
        colour: string;
    };
    specById: Map<number, {
        id: number;
        name: string;
        icon: string;
    }>;
}

export default function RosterTableRole({players,role,raidbosses,defaultOption,specById}:Props){

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
                        <TableCell style={{ backgroundColor: classColour }}>
                            <div className="flex flex-row items-center gap-1">
                                <img src={p.classes_specializations?.icon} width={20} height={20} alt="" className="shrink-0" />
                                {p.name}
                            </div>
                        </TableCell>
                        {raidbosses?.map((boss) => {
                            const pref = prefByBoss.get(boss.id);
                            const option = prefByBoss.get(boss.id)?.preference_options ?? defaultOption;
                            const cellColour = option?.colour ? `#${option.colour}80` : undefined;

                            const specPref = pref?.spec_preference;
                            const altSpec = specPref != null && specPref !== p.main_spec ? specById.get(specPref) : undefined;

                            return (
                            <TableCell key={boss.id} style={{ backgroundColor: cellColour }} className="border border-accent">
                                <div className="flex flex-row justify-between">
                                    <div className="flex flex-row items-center gap-1 truncate">
                                        {altSpec && (
                                            <img
                                                src={altSpec.icon}
                                                width={20}
                                                height={20}
                                                alt={altSpec.name}
                                                title={altSpec.name}
                                                className="shrink-0"
                                            />
                                        )}

                                        <p className="truncate">{option?.option}</p>
                                    </div>
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
                                </div>
                            </TableCell>
                            );
                        })}
                    </TableRow>
                );
            })}
        </>
    )
}