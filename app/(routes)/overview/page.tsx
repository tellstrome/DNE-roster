import { DiscordSignInButton } from "@/components/SignInWithDiscord";
import { createClient } from "@/lib/supabase/server";
import ClaimPlayerCharacter from "@/components/characterClaim/claimPlayerCharacter";
import { Table, TableBody, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import RosterTableRole from "@/components/overview/rosterTableRole";
import { ROLES, type Role } from "@/lib/roster";

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

    const { data: raidbosses } = await supabase
        .from("raid_bosses")
        .select("*, raids!inner(*)")
        .eq("raids.active", true)
        .order("id", { ascending: true });

    const NO_PREFERENCE_ID = 3;

    const { data: preferenceOptions } = await supabase
        .from("preference_options")
        .select("*");

    const defaultOption = preferenceOptions?.find((o) => o.id === NO_PREFERENCE_ID);

    const {data: allPlayers} = await supabase
        .from("players")
        .select("*, classes_specializations(*,classes(*)), player_preferences(*, preference_options(*)), player_absences(*)");

    const byClass = (a: any, b: any) =>
        (a.classes_specializations?.classes?.name ?? "").localeCompare(
            b.classes_specializations?.classes?.name ?? ""
        ) || a.name.localeCompare(b.name);

    const sorted = [...(allPlayers ?? [])].sort(byClass);

    const { data: specs } = await supabase
        .from("classes_specializations")
        .select("id, name, icon");

    const specById = new Map((specs ?? []).map((s) => [s.id as number, s]));

    return (
        <div>
            <h1 className="text-2xl">Overview</h1>
            <p>This is an overview of everyone's preferences, it does not necessarily represent the final comp.</p>
            <Table className="table-fixed overflow-x-auto mt-8" style={{ width: 64 + 128 + 128 * (raidbosses?.length ?? 0) }}>
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
                    {(Object.keys(ROLES) as Role[]).map((role) => (
                        <RosterTableRole
                            key={role}
                            role={role}
                            players={sorted.filter((p) => p.classes_specializations?.role === role)}
                            raidbosses={raidbosses ?? []}
                            defaultOption={defaultOption}
                            specById={specById}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
