
import { createClient } from "@/lib/clients/supabase/server";
import { cookies } from "next/headers";

export default async function getUser() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error } = await supabase.auth.getUser()

    return { data: user, error };
}
    