import { DiscordSignInButton } from "@/components/SignInWithDiscord";
import { createClient } from "@/lib/supabase/server";
import ClaimPlayerCharacter from "@/components/characterClaim/claimPlayerCharacter";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"

interface PreferenceOption {
  id: number;
  option: string;
  colour: string;
  roster_option: number | null;
}

interface PlayerPreference {
  boss_id: number;
  preference: number;
  spec_preference: number | null;
  preference_options: PreferenceOption | null;
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
        .maybeSingle();

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

    if (player.role !== "officer"){
        return (
            <div className="flex flex-col items-center justify-center my-auto mx-auto gap-8">
                <h1 className="text-2xl">Forbidden</h1>
            </div>
        )
    }

    const {data: sortedBosses, error:raidbossesError} = await supabase
        .from("raid_bosses")
        .select("*, raids!inner(*)")
        .eq("raids.active", true)
        .is("visible",true)
        .order("index", { ascending: true });

    const {data: allPlayers, error:allPlayersError} = await supabase
        .from("players")
        .select("*, classes_specializations(*,classes(*)), player_preferences(*, preference_options(*)), player_absences(*),boss_rosters(*)");

    const { data: specs } = await supabase
        .from("classes_specializations")
        .select("*,classes(*)")
        .order("id", { ascending: true });

    const { data: preferenceOptions } = await supabase
        .from("preference_options")
        .select("*, roster_options(*)")
        .order("id", { ascending: true });

    const { data: rosterOptions } = await supabase
        .from("roster_options")
        .select("*")
        .order("id", { ascending: true });

    const byClass = (a: any, b: any) =>
        (a.classes_specializations?.classes?.name ?? "").localeCompare(
            b.classes_specializations?.classes?.name ?? ""
        ) || a.name.localeCompare(b.name);
    const sorted = [...(allPlayers ?? [])].sort(byClass);

    
    const tankPlayers   = sorted.filter((p) => p.classes_specializations?.role === "tank");
    const healerPlayers = sorted.filter((p) => p.classes_specializations?.role === "healer");
    const meleePlayers  = sorted.filter((p) => p.classes_specializations?.role === "melee");
    const rangedPlayers = sorted.filter((p) => p.classes_specializations?.role === "ranged");

    const specById = new Map((specs ?? []).map((s) => [s.id as number, s]));

    if (!allPlayers || !preferenceOptions || !rosterOptions) return (
        <div>
            <h1 className="text-2xl">Comp</h1>
            <p>Failed to load</p>
        </div>
    )

    const overrides = Object.fromEntries(
        allPlayers.flatMap((p) =>
        (p.boss_rosters ?? []).map((r:any) => [`${r.player_id}:${r.boss_id}`, r])
        )
    )
    const NO_PREFERENCE_ID = 3;
    const rosterById = new Map(rosterOptions.map((r) => [r.id, r]));
    const defaultRoster = (() => {
    const pref = preferenceOptions.find((o) => o.id === NO_PREFERENCE_ID);
    return pref?.roster_option != null ? rosterById.get(pref.roster_option) : undefined;
    })();
    return (
        <div>
            <h1 className="text-2xl">Comp</h1>
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
                                    <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent">
                                        <div className="flex flex-row justify-between">
                                            <div className="flex flex-row items-center gap-1 min-w-0 flex-1">
                                                {selectedSpec.id !== p.main_spec && (
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
                    {healerPlayers?.map((p,index) => {
                        const prefByBoss = new Map<number, PlayerPreference>(
                            ((p.player_preferences ?? []) as PlayerPreference[]).map((pref) => [
                                pref.boss_id,
                                pref,
                            ])
                        );
                        const base = p.classes_specializations?.classes.class_colour;
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
                                    <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent">
                                        <div className="flex flex-row justify-between">
                                            <div className="flex flex-row items-center gap-1 min-w-0 flex-1">
                                                {selectedSpec.id !== p.main_spec && (
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
                    {meleePlayers?.map((p,index) => {
                        const prefByBoss = new Map<number, PlayerPreference>(
                            ((p.player_preferences ?? []) as PlayerPreference[]).map((pref) => [
                                pref.boss_id,
                                pref,
                            ])
                        );
                        const base = p.classes_specializations?.classes.class_colour;
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
                                    <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent">
                                        <div className="flex flex-row justify-between">
                                            <div className="flex flex-row items-center gap-1 min-w-0 flex-1">
                                                {selectedSpec.id !== p.main_spec && (
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
                    {rangedPlayers?.map((p,index) => {
                        const prefByBoss = new Map<number, PlayerPreference>(
                            ((p.player_preferences ?? []) as PlayerPreference[]).map((pref) => [
                                pref.boss_id,
                                pref,
                            ])
                        );
                        const base = p.classes_specializations?.classes.class_colour;
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
                                    <TableCell key={boss.id} style={{ backgroundColor: colour }} className="border border-accent">
                                        <div className="flex flex-row justify-between">
                                            <div className="flex flex-row items-center gap-1 min-w-0 flex-1">
                                                {selectedSpec.id !== p.main_spec && (
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
                    
                    
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
