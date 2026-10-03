import { DiscordSignInButton } from "@/components/SignInWithDiscord";
import { createClient } from "@/lib/supabase/server";
import ClaimPlayerCharacter from "@/components/characterClaim/claimPlayerCharacter";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger,} from "@/components/ui/tooltip"
import { Clock } from "lucide-react";

interface PreferenceOption {
  id: number;
  option: string;
  colour: string;
}

interface PlayerPreference {
  boss_id: number;
  preference: number;
  spec_preference: number | null;
  preference_options: PreferenceOption | null;
}

interface Absence {
  start_date: string;
  end_date: string;
}

export default async function Page() {
    const supabase = await createClient();
    const { data: user, error } = await supabase.auth.getUser();
    if (error || !user) {
        return (
            <div className="flex flex-col items-center justify-center my-auto mx-auto gap-8">
            <DiscordSignInButton />
            </div>
        );
    }

    const {data: player, error:playerError} = await supabase
        .from("players")
        .select("*")
        .eq("user_id", user.user.id)
        .single();

    if (!player) {
        return (
        <div className="flex flex-col items-center justify-center my-auto mx-auto gap-8">
            <ClaimPlayerCharacter userId={user.user.id}/>
        </div>
        )
    }
    if (playerError) {
        return "Error fetching players"
    }

    const {data: raidbosses, error:raidbossesError} = await supabase
        .from("raid_bosses")
        .select("*, raids!inner(*)")
        .eq("raids.active", true)
        .order("id", { ascending: true });

    const NO_PREFERENCE_ID = 3;

    const { data: preferenceOptions } = await supabase
    .from("preference_options")
    .select("*");

    const defaultOption = preferenceOptions?.find((o) => o.id === NO_PREFERENCE_ID);

    const {data: allPlayers, error:allPlayersError} = await supabase
        .from("players")
        .select("*, classes_specializations(*,classes(*)), player_preferences(*, preference_options(*)), player_absences(*)");

    const byClass = (a: any, b: any) =>
        (a.classes_specializations?.classes?.name ?? "").localeCompare(
            b.classes_specializations?.classes?.name ?? ""
        ) || a.name.localeCompare(b.name);

    const sorted = [...(allPlayers ?? [])].sort(byClass);

    const tankPlayers   = sorted.filter((p) => p.classes_specializations?.role === "tank");
    const healerPlayers = sorted.filter((p) => p.classes_specializations?.role === "healer");
    const meleePlayers  = sorted.filter((p) => p.classes_specializations?.role === "melee");
    const rangedPlayers = sorted.filter((p) => p.classes_specializations?.role === "ranged");

    const { data: specs } = await supabase
        .from("classes_specializations")
        .select("id, name, icon");

    const specById = new Map((specs ?? []).map((s) => [s.id as number, s]));

    const dateString = (d: Date) =>
        d.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });

    const today = new Date();
    const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayStr = dateString(today);
    const weekAheadStr = dateString(weekAhead);

    return (
        <div>
            <h1 className="text-2xl">Overview</h1>
            <Table className="table-fixed overflow-x-auto" style={{ width: 64 + 128 + 128 * (raidbosses?.length ?? 0) }}>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">{/* empty cell */}</TableHead>
                        <TableHead className="w-[128px]">
                            <p>{allPlayers?.length} players</p>
                        </TableHead>
                        {raidbosses?.map(boss => (
                            <TableHead className="w-[128px] h-[100px] whitespace-normal align-top" key={boss.id}>
                                <img src={boss.image} width={128} height={64}/>
                                <p className="">{boss.name}</p>
                            </TableHead>
                        ))}
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
                    const base = p.classes_specializations.classes.class_colour;
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
                                <img src={p.classes_specializations.icon} width={20} height={20} alt="" className="shrink-0" />
                                {p.name}
                            </TableCell>
                            {raidbosses?.map((boss) => {
                                const pref = prefByBoss.get(boss.id);
                                const option = prefByBoss.get(boss.id)?.preference_options ?? defaultOption;
                                const colour = option?.colour ? `#${option.colour}80` : undefined;

                                const specPref = pref?.spec_preference;
                                const altSpec = specPref != null && specPref !== p.main_spec ? specById.get(specPref) : undefined;

                                return (
                                <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent">
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
                {healerPlayers?.map((p,index) => {
                    const prefByBoss = new Map<number, PlayerPreference>(
                        ((p.player_preferences ?? []) as PlayerPreference[]).map((pref) => [
                            pref.boss_id,
                            pref,
                        ])
                    );
                    const base = p.classes_specializations.classes.class_colour;
                    const colour = base ? `#${base}80` : undefined;
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
                                <img src={p.classes_specializations.icon} width={20} height={20} alt="" className="shrink-0" />
                                {p.name}
                            </TableCell>
                            {raidbosses?.map((boss) => {
                                const pref = prefByBoss.get(boss.id);
                                const option = prefByBoss.get(boss.id)?.preference_options ?? defaultOption;
                                const colour = option?.colour ? `#${option.colour}80` : undefined;

                                const specPref = pref?.spec_preference;
                                const altSpec = specPref != null && specPref !== p.main_spec ? specById.get(specPref) : undefined;

                                return (
                                <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent">
                                    <div className="flex flex-row items-center gap-1">
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
                                        {option?.option}
                                    </div>
                                </TableCell>
                                );
                            })}
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
                    const base = p.classes_specializations.classes.class_colour;
                    const colour = base ? `#${base}80` : undefined;
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
                                <img src={p.classes_specializations.icon} width={20} height={20} alt="" className="shrink-0" />
                                {p.name}
                            </TableCell>
                            {raidbosses?.map((boss) => {
                                const pref = prefByBoss.get(boss.id);
                                const option = prefByBoss.get(boss.id)?.preference_options ?? defaultOption;
                                const colour = option?.colour ? `#${option.colour}80` : undefined;

                                const specPref = pref?.spec_preference;
                                const altSpec = specPref != null && specPref !== p.main_spec ? specById.get(specPref) : undefined;

                                return (
                                <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent">
                                    <div className="flex flex-row items-center gap-1">
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
                                        {option?.option}
                                    </div>
                                </TableCell>
                                );
                            })}
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
                    const base = p.classes_specializations.classes.class_colour;
                    const colour = base ? `#${base}80` : undefined;
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
                                <img src={p.classes_specializations.icon} width={20} height={20} alt="" className="shrink-0" />
                                {p.name}
                            </TableCell>
                            {raidbosses?.map((boss) => {
                                const pref = prefByBoss.get(boss.id);
                                const option = prefByBoss.get(boss.id)?.preference_options ?? defaultOption;
                                const colour = option?.colour ? `#${option.colour}80` : undefined;

                                const specPref = pref?.spec_preference;
                                const altSpec = specPref != null && specPref !== p.main_spec ? specById.get(specPref) : undefined;

                                return (
                                <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent">
                                    <div className="flex flex-row items-center gap-1">
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
                                        {option?.option}
                                    </div>
                                </TableCell>
                                );
                            })}
                        </TableRow>
                    );
                })}
                </TableBody>
            </Table>
        </div>
    );
}
