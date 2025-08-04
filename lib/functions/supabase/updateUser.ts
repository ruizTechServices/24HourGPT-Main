
import { createClient } from "@/lib/clients/supabase/client";

export default async function updateUser(email: string, password: string, data: any) {
    const supabase = createClient();
    const { data: user, error } = await supabase.auth.updateUser({
        email,
        password,
        data
      })

    return { user, error };
}