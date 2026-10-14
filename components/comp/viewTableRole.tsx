import { TableCell, TableRow, } from "@/components/ui/table"
import { ROLES, type Role, type Player, type PlayerPreference, type RosterOption, type BossRosterRow } from "@/lib/roster";

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
    defaultRoster: RosterOption | undefined;
    rosterById: Map<number, {
        id: number;
        option: string;
        colour: string;
    }>;
    overrides: Record<string, BossRosterRow | undefined>;
}

export default function ViewRosterTableRole({players,role,raidbosses,specById,defaultRoster,rosterById,overrides }:Props){

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
                        <TableCell style={{ backgroundColor: classColour }} className="flex flex-row gap-1">
                            <img src={p.classes_specializations?.icon} width={20} height={20} alt="" className="shrink-0" />
                            {p.name}
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

                            const selectedSpec = specValue != null ? specById.get(specValue) : undefined;
                            return (
                            <TableCell key={boss.id} style={{ backgroundColor: cellColour }} className="border border-accent">
                                <div className="flex flex-row justify-between">
                                    <div className="flex flex-row items-center gap-1 min-w-0 flex-1">
                                        {selectedSpec && selectedSpec.id !== p.main_spec && (
                                            <img
                                            src={selectedSpec.icon}
                                            width={20}
                                            height={20}
                                            alt={selectedSpec.name}
                                            className="shrink-0"
                                            />
                                        )}

                                        <span className="truncate">{rosterOption?.option}</span>
                                    </div>
                                    <div className="flex flex-row items-center">
                                    
                                    </div>
                                    
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