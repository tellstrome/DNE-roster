import { DiscordSignInButton } from "@/components/SignInWithDiscord";
import { createClient } from "@/lib/supabase/server";
import ClaimPlayerCharacter from "@/components/characterClaim/claimPlayerCharacter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { ROLES, type Role } from "@/lib/roster";
import ViewRosterTableRole from "@/components/comp/viewTableRole";

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

    const { data: player, error:playerError } = await supabase
        .from("players")
        .select("*")
        .eq("user_id", user.user.id)
        .maybeSingle();

    if (playerError) {
        return "Error fetching players"
    }

    if (!player) {
        return (
        <div className="flex flex-col items-center justify-center my-auto mx-auto gap-8">
            <ClaimPlayerCharacter userId={user.user.id}/>
        </div>
        )
    }

    if (player.role !== "officer"){
        return (
            <div className="flex flex-col items-center justify-center my-auto mx-auto gap-8">
                <h1 className="text-2xl">Forbidden</h1>
            </div>
        )
    }

    const {data: sortedBosses } = await supabase
        .from("raid_bosses")
        .select("*, raids!inner(*)")
        .eq("raids.active", true)
        .is("visible",true)
        .order("index", { ascending: true });

    const {data: allPlayers } = await supabase
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

    const specById = new Map((specs ?? []).map((s) => [s.id as number, s]));

    if (!specs || !allPlayers || !preferenceOptions || !rosterOptions) return (
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
                        {(Object.keys(ROLES) as Role[]).map((role) => (
                            <ViewRosterTableRole
                                key={role}
                                role={role}
                                players={sorted.filter((p) => p.classes_specializations?.role === role)}
                                raidbosses={sortedBosses ?? []}
                                specById={specById}
                                defaultRoster={defaultRoster}
                                rosterById={rosterById}
                                overrides={overrides}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
