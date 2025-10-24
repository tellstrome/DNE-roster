"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { AddNewItem } from "@/app/lists/actions";
import ErrorMessage from "../error-message";
import { Input } from "../ui/input";
import { useRouter } from "next/navigation";
interface Props{
    listId: string
}
export default function AddNewListItem({listId}:Props){
    const [open, setOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
            setLoading(true);
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            const result = await AddNewItem(formData,listId);
    
            if (result && !result.success) {
                setError(result.error);
                setLoading(false);
            } else {
                setLoading(false);
                router.refresh();
            }
        };

    return (
        <div className="flex flex-col">
            {open ? (
                <form onSubmit={handleSubmit} className="flex flex-row gap-1 w-full">
                    <Input type="text" name="inputItem" id="inputItem" className="bg-accent border border-green-500 flex-1 flex-grow" />
                    <Button type="submit">Add</Button>
                    <Button type="button" onClick={() =>setOpen(false)}>X</Button>
                </form>
            ) : (
                <Button onClick={() =>setOpen(true)}>New shopping item</Button>
            )}
            <ErrorMessage error={error} />
        </div>
    )
}