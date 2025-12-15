import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { apiFetch } from "@/lib/api";

export function useBirthdayMode() {
  const [birthdayMode, setBirthdayMode] = useState(false);
  const { user } = useAuth();

  const setBirthdayModeForCurrentUser = async (enabled: boolean) => {
    if (!user) return;

    // Update local state and theme immediately for snappy UI
    setBirthdayMode(enabled);
    if (enabled) {
      document.documentElement.classList.add("birthday-mode");
    } else {
      document.documentElement.classList.remove("birthday-mode");
    }

    // Persist preference without relying on ON CONFLICT
    await apiFetch("/preferences/birthday-mode", {
      method: "POST",
      body: JSON.stringify({ user_id: user.id, birthday_mode: enabled }),
    }).catch((err) => console.error("Failed to update birthday mode", err));
  };
 
  useEffect(() => {
    if (!user) return;

    const fetchBirthdayMode = async () => {
      const res = await apiFetch<{ birthday_mode: boolean }>("/preferences/birthday-mode");
      const isEnabled = res.birthday_mode || false;
      setBirthdayMode(isEnabled);
      if (isEnabled) document.documentElement.classList.add("birthday-mode");
      else document.documentElement.classList.remove("birthday-mode");
    };

    fetchBirthdayMode();
  }, [user]);

  return { birthdayMode, setBirthdayModeForCurrentUser };
}
