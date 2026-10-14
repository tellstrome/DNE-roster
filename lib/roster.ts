export type Role = "tank" | "healer" | "melee" | "ranged";

export const ROLES: Record<Role, { bg: string; icon: string }> = {
    tank:   { bg: "bg-[#9bb9ee80]", icon: "/tank.svg" },
    healer: { bg: "bg-[#ade89980]", icon: "/healer.svg" },
    melee:  { bg: "bg-[#e49e9080]", icon: "/mdps.svg" },
    ranged: { bg: "bg-[#e693b880]", icon: "/rdps.svg" },
};

export interface PreferenceOption {
    id: number;
    option: string;
    colour: string;
    roster_option: number | null;
}

export interface PlayerPreference {
    id: number;
    boss_id: number;
    user_id: string;
    preference: number;
    spec_preference: number | null;
    preference_options: PreferenceOption | null;
}

export interface Absence {
    id: number;
    user_id: string;
    start_date: string;
    end_date: string;
    player_id: number;
    players: Player;
}

export interface RosterOption {
    id: number;
    option: string;
    colour: string;
}

export interface BossRosterRow {
    player_id: number;
    boss_id: number;
    spec: number | null;
    option: number | null;
}

export interface ClassSpec {
    id: number;
    class_id: number;
    name: string;
    role: string;
    icon: string;
    classes: { 
        id: number; 
        name: string; 
        class_colour: string };
}

export interface Player {
    id: number;
    name: string;
    main_spec: number | null;
    user_id: string | null;
    role: string;
    classes_specializations: ClassSpec | null;
    player_preferences: PlayerPreference[];
    player_absences: Absence[];
    boss_rosters: BossRosterRow[];
}

export interface Bosses {
    id: number;
    raid_id: number; 
    name: string;
    image: string;
    index: number | null;
    visible: boolean;
}

export interface Raids {
    id: number;
    name: string;
    colour: string;
    background: string;
    raid_bosses: Bosses[];
}