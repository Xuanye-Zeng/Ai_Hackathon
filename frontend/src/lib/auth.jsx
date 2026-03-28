import { createContext, useContext, useEffect, useState } from "react";
import { insforge } from "./insforge";

const AuthContext = createContext(null);

// Fetch role from user_roles table
async function fetchRoleFromDB(email) {
  try {
    const { data } = await insforge.database
      .from("user_roles")
      .select("role")
      .eq("email", email)
      .single();
    return data?.role || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insforge.auth.getCurrentUser().then(async ({ data }) => {
      if (data?.user) {
        setUser(data.user);
        const email = data.user.email;
        // Get role from DB (source of truth)
        const dbRole = await fetchRoleFromDB(email);
        setRole(dbRole || "patient");
      }
      setLoading(false);
    });
  }, []);

  async function signUp(email, password, name, selectedRole) {
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name,
      metadata: { role: selectedRole },
    });
    if (error) throw error;

    // Save role to DB (source of truth)
    try {
      await insforge.database.from("user_roles").insert({ email, role: selectedRole });
    } catch {
      // Might already exist if re-registering
      await insforge.database.from("user_roles").update({ role: selectedRole }).eq("email", email);
    }

    if (data?.user) {
      setUser(data.user);
      setRole(selectedRole);
    }
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await insforge.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Get role from DB (source of truth)
    const dbRole = await fetchRoleFromDB(email);
    const actualRole = dbRole || "patient";

    if (data?.user) {
      setUser(data.user);
      setRole(actualRole);
    }
    return { ...data, role: actualRole };
  }

  async function signOut() {
    await insforge.auth.signOut();
    setUser(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
