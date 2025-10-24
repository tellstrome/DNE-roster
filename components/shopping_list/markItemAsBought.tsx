"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { MarkAsBought } from "@/app/lists/actions";
import ErrorMessage from "../error-message";
import { Input } from "../ui/input";
import { useRouter } from "next/navigation";
import { Loader2,SquareCheckBig,Square  } from "lucide-react";

interface Props{
    itemId: string,
    isBought: boolean,
}

export default function MarkItemAsBought({itemId, isBought}:Props){
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        setLoading(true);
        event.preventDefault();

        const result = await MarkAsBought(itemId);

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
            {isBought ? ( 
                <Button className="size-8 p-0 bg-green-500 hover:bg-green-400 active:bg-green-600"><SquareCheckBig className="shrink-0"/></Button>
            ) : (
                <form onSubmit={handleSubmit}>
                    <Button className="size-8 p-0 bg-slate-500 hover:bg-slate-400 active:bg-slate-600" type="submit" disabled={loading} >
                        {loading ? (<Loader2 className="animate-spin shrink-0" />): (<Square className="shrink-0"/>)}
                    </Button>
                </form>
            )
            }
            <ErrorMessage error={error} />
        </div>
    )
}