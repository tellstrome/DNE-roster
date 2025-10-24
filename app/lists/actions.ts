"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function CreateNewList(){
    const supabase = await createClient();
    const { data: user, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { success: false, error: "You need to be logged in." };
    }

    const { data:list, error: insertError } = await supabase
    .from("shopping_lists")
    .insert({
        created_by: user.user.id
    })
    .select("*")
    .single();

    if (insertError) {
        return { success: false, error: "Error creating list." };
    }

    return redirect (`/lists/${list.id}`)
}

export async function AddNewItem(
    formData: FormData,
    listId: string,
){
    const inputItem = formData.get("inputItem") as String;
    const supabase = await createClient();
    const { data: user, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { success: false, error: "You need to be logged in." };
    }

    const { error: insertError } = await supabase
    .from("shopping_list_items")
    .insert({
        list_id: listId,
        item: inputItem
    });

    if (insertError) {
        return { success: false, error: "Error creating list." };
    }
}

export async function MarkAsBought(
    itemId: string,
){
    const supabase = await createClient();
    const { data: user, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { success: false, error: "You need to be logged in." };
    }

    console.log(itemId)
    const { error: updateError } = await supabase
    .from("shopping_list_items")
    .update({
        is_bought: true,
    })
    .eq("id", itemId)
    .single();

    if (updateError) {
        return { success: false, error: "Error updating list." };
    }
}

export async function MarkAsClosed(
    listId: string,
){
    const supabase = await createClient();
    const { data: user, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { success: false, error: "You need to be logged in." };
    }

    console.log(listId)
    const { error: updateError } = await supabase
    .from("shopping_lists")
    .update({
        is_open: false,
    })
    .eq("id", listId)
    .single();

    if (updateError) {
        return { success: false, error: "Error updating list." };
    }
}