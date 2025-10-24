"use client";
import { CreateNewList } from "@/app/lists/actions";
import { useState, useEffect } from "react";
import ErrorMessage from "../error-message";
import { Button } from "../ui/button";

export default function CreateNewListButton(){
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        setLoading(true);
        event.preventDefault();

        const result = await CreateNewList();

        if (result && !result.success) {
        setError(result.error);
        setLoading(false);
        } else {
            setLoading(false);
        // Optional: clear form or redirect
        }
    };

    return (
        <form onSubmit={handleCreate}>
            <Button disabled={loading} type="submit">{loading ? "Loading" : "Create new shopping list"}</Button>
        <ErrorMessage error={error} />
        </form>
    )
}