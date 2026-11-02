"use client";
import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
    children: React.ReactNode,
    onClose: () => void;
    width?: string | null;
    closable?: boolean;
}

// call as <ModalBackdrop onClick={() => setIsOpen(false)}>
export function ModalBackdrop({ children, onClose, closable = true }: ModalProps) {
  useEffect(() => {
    // Save current overflow + measure scrollbar width so page doesn't jump
    const originalOverflow = document.body.style.overflow;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = "";
    };
  }, []);

  return createPortal(
    <div
      className="fixed top-0 left-0 w-full h-full bg-gray-600/70 flex justify-center items-center z-50"
      onClick={closable ? onClose : undefined}
    >
      {children}
    </div>,
    document.body
  );
}

export function DefaultModal({children,onClose,width = null}:ModalProps){
    return(
        <div className={`bg-background m-6 flex flex-col rounded-sm p-6 bg-muted border border-accent drop-shadow-lg z-20 gap-2 overflow-y-auto max-h-[90vh] ${width ? width : `w-full max-w-xl`}`} onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose} className="text-red-500 hover:text-red-700 px-1 fixed top-1 right-0" title="Close">
                <X size={20} />
            </button>
            {children}
        </div>
    )
}

export function DefaultModalPopup({children,onClose,width = null}:ModalProps){
    return(
        <div className={`bg-background m-6 flex flex-col rounded-sm p-6 bg-muted border border-accent drop-shadow-lg z-20 gap-2 overflow-y-auto max-h-[90vh] ${width ? width : `w-full max-w-96`}`} onClick={(e) => e.stopPropagation()}>
            {children}
        </div>
    )
}

                    
                        