"use server";

import supabaseAdmin from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const deleteAccountAction = async () => {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return { success: false, error: "You must be logged in to delete your account."}
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
  if (error) {
    return { success: false, error: "Failed to delete account: " + error.message}
  }
  return { reload: true };
};