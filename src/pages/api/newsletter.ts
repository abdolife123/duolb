import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const email = body?.email?.toLowerCase().trim();

        // Basic validation
        if (!email || typeof email !== "string" || !email.includes("@")) {
            return new Response(
                JSON.stringify({ error: "Eine gültige E-Mail-Adresse ist erforderlich." }),
                { status: 400 }
            );
        }

        // Insert into correct table
        const { error } = await supabase
            .from("subscribers") // ✅ your real table name
            .insert([{ email }]);

        if (error) {
            console.error("Supabase insert error:", error);

            // Unique constraint (duplicate email)
            if (error.code === "23505") {
                return new Response(
                    JSON.stringify({ error: "Diese E-Mail ist bereits abonniert." }),
                    { status: 409 }
                );
            }

            return new Response(
                JSON.stringify({ error: "Database error." }),
                { status: 500 }
            );
        }

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200 }
        );
    } catch (err) {
        console.error("Newsletter API error:", err);

        return new Response(
            JSON.stringify({ error: "Server error." }),
            { status: 500 }
        );
    }
};
