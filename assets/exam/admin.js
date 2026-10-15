
(() => {
  "use strict";

  const SUPABASE_URL =
    "https://tlsrvyqyhonnrlcdmlzo.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_znUuYPAf3U-FQoUtp4JRcA_kGZOIvoh";

  const form = document.getElementById("adminLogin");
  const message = document.getElementById("adminMsg");
  const button = document.getElementById("adminSubmit");

  if (!form || !message || !button) {
    console.error("Admin login form elements are missing.");
    return;
  }

  if (!window.supabase?.createClient) {
    message.textContent =
      "Supabase library did not load. Please refresh and try again.";
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.textContent = "";
    button.disabled = true;
    button.textContent = "Signing in...";

    try {
      const email =
        document.getElementById("adminEmail").value.trim();

      const password =
        document.getElementById("adminPassword").value;

      const { error: loginError } =
        await client.auth.signInWithPassword({
          email,
          password
        });

      if (loginError) throw loginError;

      const { data: userData, error: userError } =
        await client.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Could not verify your login.");
      }

      const { data: profile, error: profileError } =
        await client
          .from("admin_profiles")
          .select("role")
          .eq("user_id", userData.user.id)
          .maybeSingle();

      if (profileError) {
        throw new Error(
          "Admin role verification failed. Check the database policy."
        );
      }

      if (
        !profile ||
        !["admin", "exam_manager"].includes(profile.role)
      ) {
        await client.auth.signOut();
        throw new Error("This account is not authorized as admin.");
      }

      location.href = "dashboard.html";
    } catch (error) {
      message.textContent =
        error.message || "Login failed.";

      button.disabled = false;
      button.textContent = "Sign in";
    }
  });
})();
