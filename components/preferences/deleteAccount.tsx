"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { DefaultModal, DefaultModalPopup, ModalBackdrop } from "../ui/modals";
import { deleteAccountAction } from "@/app/actions";

export default function DeleteAccount(){
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const startDelete = async () => {
        setLoading(true);
        try {
            const result = await deleteAccountAction();

            if (result && !result.success) {
                setError(result.error ?? "Something went wrong.");
                return;
            }
        } finally {
            setLoading(false);
        }
    }
    return (
        <>  
            <div className="flex flex-col gap-4">
                <h2 className="text-2xl">Delete account</h2>
                <Button variant="destructive" onClick={() => setIsOpen(true)} className="mr-auto">
                    Delete account
                </Button>
            </div>
            {isOpen && (
                <ModalBackdrop onClose={() => setIsOpen(false)}>
                    <DefaultModalPopup onClose={() => setIsOpen(false)}>
                        <h1 className="text-2xl">Confirm account deletion</h1>
                        <p>Your data will be permanently removed and you will no longer be able to manage your roster preferences.</p>

                        <div className="flex flex-row gap-1 items-center ml-auto mt-2">
                            <Button onClick={()=>setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={()=>startDelete()} disabled={loading}>
                                Delete my account
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