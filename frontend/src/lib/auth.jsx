import { createContext, useContext, useEffect, useState } from "react";
import { insforge } from "./insforge";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // "doctor" | "patient"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insforge.auth.getCurrentUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        setRole(data.user.user_metadata?.role || "patient");
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
    if (data?.user) {
      setUser(data.user);
      setRole(data.user.user_metadata?.role || "patient");
    }
    return data;
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
