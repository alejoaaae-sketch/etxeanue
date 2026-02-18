import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export type AppRole = "protegido" | "protector";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  phone: string;
  home_latitude: number | null;
  home_longitude: number | null;
}

export interface ProtectorLink {
  id: string;
  protegido_user_id: string;
  protector_phone: string;
  protector_user_id: string | null;
  is_confirmed: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [protectorLink, setProtectorLink] = useState<ProtectorLink | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetching
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setProtectorLink(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (roleData) {
        setRole(roleData.role as AppRole);
      }

      // If protegido, fetch protector link
      if (roleData?.role === "protegido") {
        const { data: linkData } = await supabase
          .from("protector_links")
          .select("*")
          .eq("protegido_user_id", userId)
          .single();

        if (linkData) {
          setProtectorLink(linkData as ProtectorLink);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    phone?: string,
    selectedRole?: AppRole,
    protectorPhone?: string
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    // Si el registro fue exitoso y tenemos phone y role, crear perfil y rol
    if (data.user && !error && phone && selectedRole) {
      try {
        // Crear perfil con el teléfono
        await supabase.from("profiles").insert({
          user_id: data.user.id,
          display_name: phone, // Usamos el teléfono como nombre por defecto
          phone: phone,
        });

        // Crear rol
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: selectedRole,
        });

        // Si es protegido, crear link con el protector (solo si no existe ya uno vinculado por el trigger)
        if (selectedRole === "protegido" && protectorPhone) {
          // Verificar si ya se vinculó automáticamente por una invitación del protector
          const { data: existingLink } = await supabase
            .from("protector_links")
            .select("id")
            .eq("protegido_user_id", data.user.id)
            .maybeSingle();

          if (!existingLink) {
            await supabase.from("protector_links").insert({
              protegido_user_id: data.user.id,
              protector_phone: protectorPhone,
            });
          }
        }

        // Auto-vincular si es protector y hay links pendientes (trigger lo hace automático)
        // Refetch user data para tener el perfil actualizado
        if (data.session) {
          setTimeout(() => {
            fetchUserData(data.user!.id);
          }, 0);
        }
      } catch (profileError) {
        console.error("Error creating profile/role:", profileError);
      }
    }

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const createProfile = async (
    displayName: string,
    phone: string,
    selectedRole: AppRole,
    protectorPhone?: string
  ) => {
    if (!user) throw new Error("No user logged in");

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: user.id,
      display_name: displayName,
      phone: phone,
    });

    if (profileError) throw profileError;

    // Create role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: user.id,
      role: selectedRole,
    });

    if (roleError) throw roleError;

    // If protegido, create protector link
    if (selectedRole === "protegido" && protectorPhone) {
      const { error: linkError } = await supabase
        .from("protector_links")
        .insert({
          protegido_user_id: user.id,
          protector_phone: protectorPhone,
        });

      if (linkError) throw linkError;
    }

    // Refresh user data
    await fetchUserData(user.id);
  };

  const updateHomeLocation = async (latitude: number, longitude: number) => {
    if (!user) throw new Error("No user logged in");

    const { error } = await supabase
      .from("profiles")
      .update({
        home_latitude: latitude,
        home_longitude: longitude,
      })
      .eq("user_id", user.id);

    if (error) throw error;

    // Refresh profile
    await fetchUserData(user.id);
  };

  const needsProfile = user && !profile;
  const needsHomeLocation = profile && role === "protegido" && !profile.home_latitude;

  return {
    user,
    session,
    profile,
    role,
    loading,
    protectorLink,
    needsProfile,
    needsHomeLocation,
    signUp,
    signIn,
    signOut,
    createProfile,
    updateHomeLocation,
    refetchUserData: () => user && fetchUserData(user.id),
  };
}
