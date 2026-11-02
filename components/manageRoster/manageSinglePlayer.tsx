"use client";

import { useState } from "react";
import { DefaultModal, DefaultModalPopup, ModalBackdrop } from "../ui/modals";
import { createClient } from "@/lib/supabase/client";
import { Button } from "../ui/button";
import {Select,SelectContent,SelectGroup,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select"
import { Input } from "../ui/input";
import { ROLES, type Role, type ClassSpec, Player } from "@/lib/roster";

interface Props{
    classSpecs: ClassSpec[];
    onUpdate: () => void;
    player: Player;
    specById: Map<number, {
        id: number;
        name: string;
        icon: string;
    }>;
}


export default function ManageSinglePlayer({classSpecs, onUpdate, player, specById}:Props){
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [deleteIsOpen, setDeleteIsOpen] = useState<boolean>(false);
    const [error, setError] = useState<string | null>();
    const [loading, setLoading] = useState(false);

    const [playerName, setPlayerName] = useState<string>(player.name)
    const [playerSpec, setPlayerSpec] = useState<number | null>(player.main_spec)
    const [playerRole, setPlayerRole] = useState<Role | null>(player.main_role)

    const addNewPlayerProfile = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        
        const name = playerName.trim();
        if (!name || playerSpec == null || !playerRole) {
            setError("Please fill in nickname, spec and role.");
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from("players")
            .update({
                name: name,
                main_spec: playerSpec,
                main_role: playerRole,
            })
            .eq("id", player.id);
        setLoading(false);

        if (error) {
            setError(error.code === "23505" ? "A player with that nickname already exists." : error.message);
            return;
        }

        form.reset();
        setIsOpen(false);
        onUpdate();
    };

    const deletePlayer = async () => {
        setLoading(true);
        const { error } = await supabase
            .from("players")
            .delete()
            .eq("id", player.id);
        setLoading(false);
        if (error) {
            setError(error.message);
            return;
        }
        setIsOpen(false);
        setDeleteIsOpen(false);
        onUpdate();
    }
    
    return (
        <>
            <button onClick={() => setIsOpen(true)} className="h-[36px] w-full flex flex-row items-center justify-start gap-1">
                <img src={player.classes_specializations?.icon} width={30} height={30} alt="" className="shrink-0 pl-[4px]" />
                <span className="truncate">{player.name}</span>
            </button>

            {isOpen && (
                <ModalBackdrop onClose={() => setIsOpen(false)} closable={false}>
                    <DefaultModal onClose={() => setIsOpen(false)}>
                        <h1 className="text-2xl">Editing {player.name}</h1>
                        <form className="w-full flex flex-col gap-2 items-start" onSubmit={addNewPlayerProfile}>
                            <Input type="text" name="playerNickname" placeholder="Player nickname" className="max-w-56" value={playerName} onChange={(e) => setPlayerName(e.target.value)}/>
                            <div className="flex flex-col gap-2 items-start justify-start">
                                <Select
                                    name="mainSpec"
                                    value={playerSpec != null ? String(playerSpec) : undefined}
                                    onValueChange={(v) => setPlayerSpec(Number(v))}
                                >
                                    <SelectTrigger className="w-56 truncate">
                                        <SelectValue placeholder="Select main spec" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                        {classSpecs.map((item) => {
                                            const base = item.classes?.class_colour;
                                            const colour = base ? `#${base}80` : undefined;

                                            return (
                                                <SelectItem key={item.id} value={String(item.id)} style={{ backgroundColor: colour }}>
                                                    <span className="flex items-center gap-2" >
                                                        <img src={item.icon} width={20} height={20} alt="" className="shrink-0" />
                                                        <span className="truncate">{item.classes.name} - {item.name}</span>
                                                    </span>
                                                </SelectItem>
                                            )
                                        })}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <Select
                                    name="mainRole"
                                    value={playerRole ?? undefined}
                                    onValueChange={(v) => setPlayerRole(v as Role)}
                                >
                                    <SelectTrigger className="w-56">
                                        <SelectValue placeholder="Select main role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {(Object.keys(ROLES) as Role[]).map((role) => {
                                                const { bg: columnBgColour, icon: columnSvg } = ROLES[role];
                                                return (
                                                <SelectItem key={role} value={role} style={{ backgroundColor: columnBgColour }}>
                                                    <span className="flex items-center gap-2" >
                                                        <img src={columnSvg} width={20} height={20} alt="" className="shrink-0" />
                                                        {role}
                                                    </span>
                                                </SelectItem>
                                            )})}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <Button type="submit" disabled={loading} className="w-36">
                                    {loading ? "Updating..." : "Update"}
                                </Button>
                            </div>
                        </form>

                        <h2 className="text-xl mt-8">Delete player</h2>
                        <Button variant={"destructive"} onClick={() => setDeleteIsOpen(true)} className="mr-auto">
                            Delete player
                        </Button>
                    </DefaultModal>
                </ModalBackdrop>
            )}

            {deleteIsOpen && (
                <ModalBackdrop onClose={() => setDeleteIsOpen(false)}>
                    <DefaultModalPopup onClose={() => setDeleteIsOpen(false)}>
                        <h1 className="text-2xl">Confirm deleting player</h1>
                        <div className="flex flex-row gap-1 items-center ml-auto mt-2">
                            <Button onClick={()=>setDeleteIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={()=>deletePlayer()} disabled={loading}>
                                Delete player
                            </Button>
                        </div>
                    </DefaultModalPopup>
                </ModalBackdrop>
            )}

            {error && (
                <ModalBackdrop onClose={() => setError(null)}>
                    <DefaultModalPopup onClose={() => setError(null)}>
                        <h1 className="text-2xl">Error</h1>
                        <p>{error}</p>

                        <div className="flex flex-row gap-1 items-center ml-auto mt-2">
                            <Button onClick={() => setError(null)}>
                                Close
                            </Button>
                        </div>
                        
                    </DefaultModalPopup>
                </ModalBackdrop>
            )}
        </>
    )
}