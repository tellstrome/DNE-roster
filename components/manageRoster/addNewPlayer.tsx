"use client";

import { Input } from "../ui/input";
import {Select,SelectContent,SelectGroup,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select"
import { ROLES, type Role, type ClassSpec } from "@/lib/roster";
import { Button } from "../ui/button";
import { useState } from "react";
import { DefaultModalPopup, ModalBackdrop } from "../ui/modals";
import { createClient } from "@/lib/supabase/client";

interface Props{
    classSpecs: ClassSpec[];
    onUpdate: () => void;
}

export default function AddNewPlayer({classSpecs, onUpdate}:Props){
    const supabase = createClient();
    const [error, setError] = useState<string | null>();
    const [loading, setLoading] = useState(false);

    const addNewPlayerProfile = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const name = (formData.get("playerNickname") as string | null)?.trim();
        const mainSpec = formData.get("mainSpec") as number | null;
        const mainRole = formData.get("mainRole") as string | null;

        if (!name || !mainSpec || !mainRole) {
            setError("Please fill in nickname, spec and role.");
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from("players")
            .insert({
                name: name,
                main_spec: mainSpec,
                main_role: mainRole,
            });
        setLoading(false);

        if (error) {
            setError(error.code === "23505" ? "A player with that nickname already exists." : error.message);
            return;
        }

        form.reset();
        onUpdate();
    };

    return(
        <>
            <div className="w-full flex flex-col gap-4">
                <h2 className="text-2xl">Add new players</h2>
                <form className="w-full flex flex-row flex-wrap gap-2" onSubmit={addNewPlayerProfile}>
                    <Input type="text" name="playerNickname" placeholder="Player nickname" className="max-w-48" />
                    <div className="flex flex-row gap-2 items-center">
                        <Select name="mainSpec">
                            <SelectTrigger className="w-56">
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
                                                {item.classes.name} - {item.name}
                                            </span>
                                        </SelectItem>
                                    )
                                })}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Select name="mainRole">
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
                        <Button type="submit" disabled={loading} className="w-24">
                            {loading ? "Adding..." : "Add"}
                        </Button>
                    </div>
                </form>
            </div>
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