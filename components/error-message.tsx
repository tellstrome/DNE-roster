interface Props{
    error: string | null
}

export default function ErrorMessage({error}:Props){

    if (error) {
        return (
            <div className="text-red-500 border-l-2 border-destructive px-4">
                <p className="items-center flex h-full">{error}</p>
            </div>
        )
    }
}