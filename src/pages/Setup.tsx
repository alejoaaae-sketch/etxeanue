import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Shield, MapPin, Phone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const phoneSchema = z.string().regex(/^[67]\d{8}$/, "Introduce un móvil válido (9 dígitos)");

type UserRole = "protector" | "protegido";

const Setup = () => {
  const { user, profile, role, needsProfile, needsHomeLocation, createProfile, updateHomeLocation, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [locationLoading, setLocationLoading] = useState(false);
  
  // Profile creation state
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [phone, setPhone] = useState("");
  const [protectorPhone, setProtectorPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ phone?: string; role?: string; protectorPhone?: string }>({});

  // Si el usuario ya tiene todo completo, redirigir según rol
  if (user && profile && role && !needsProfile) {
    if (role === "protector") {
      navigate("/protector");
    } else {
      navigate("/");
    }
    return null;
  }

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { phone?: string; role?: string; protectorPhone?: string } = {};

    if (!selectedRole) errors.role = "Selecciona tu rol";
    const phoneResult = phoneSchema.safeParse(phone);
    if (!phoneResult.success) errors.phone = phoneResult.error.errors[0].message;

    if (selectedRole === "protegido") {
      const protResult = phoneSchema.safeParse(protectorPhone);
      if (!protResult.success) errors.protectorPhone = "Introduce el móvil de tu protector";
      if (protectorPhone === phone) errors.protectorPhone = "Debe ser diferente al tuyo";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setProfileLoading(true);
    try {
      await createProfile(
        phone,
        phone,
        selectedRole!,
        selectedRole === "protegido" ? protectorPhone : undefined
      );

      toast({
        title: "✅ Perfil creado",
        description: "Tu cuenta está lista",
      });

      if (selectedRole === "protector") {
        navigate("/protector");
      } else {
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el perfil",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  // Show profile creation if no profile exists
  if (needsProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">SafeHome</span>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground text-sm">
            Salir
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm space-y-8 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Completa tu perfil</h1>
              <p className="text-muted-foreground mt-2">Necesitamos algunos datos para continuar</p>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>¿Quién eres?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("protector")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedRole === "protector"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-2xl mb-1">👨‍👩‍👧</div>
                    <div className="font-medium">Protector</div>
                    <div className="text-xs text-muted-foreground">Padre/madre/tutor</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("protegido")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedRole === "protegido"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-2xl mb-1">🧒</div>
                    <div className="font-medium">Protegido</div>
                    <div className="text-xs text-muted-foreground">Hijo/menor</div>
                  </button>
                </div>
                {formErrors.role && <p className="text-sm text-destructive">{formErrors.role}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="setupPhone">Tu número de móvil</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="setupPhone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="612345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    className="pl-10"
                  />
                </div>
                {formErrors.phone && <p className="text-sm text-destructive">{formErrors.phone}</p>}
              </div>

              {selectedRole === "protegido" && (
                <div className="space-y-2">
                  <Label htmlFor="setupProtectorPhone">Móvil de tu protector</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="setupProtectorPhone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="Móvil de tu padre/madre/tutor"
                      value={protectorPhone}
                      onChange={(e) => setProtectorPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                      className="pl-10"
                    />
                  </div>
                  {formErrors.protectorPhone && <p className="text-sm text-destructive">{formErrors.protectorPhone}</p>}
                </div>
              )}

              <Button type="submit" className="w-full btn-safe text-primary-foreground" disabled={profileLoading}>
                {profileLoading ? "Guardando..." : "Continuar"}
              </Button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // This shouldn't be reached now (location is handled in Index/ProtectorDashboard)
  // but keep as fallback
  const handleSetLocation = async () => {
    setLocationLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      await updateHomeLocation(position.coords.latitude, position.coords.longitude);

      toast({
        title: "🏠 Ubicación guardada",
        description: "Tu casa ha sido configurada correctamente",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error de ubicación",
        description: "No se pudo obtener tu ubicación. Activa el GPS.",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">SafeHome</span>
        </div>
        <button onClick={handleLogout} className="text-muted-foreground text-sm">
          Salir
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">¿Dónde está tu casa?</h1>
            <p className="text-muted-foreground mt-2">
              Ve a tu casa y pulsa el botón para guardar la ubicación
            </p>
          </div>

          <Button
            onClick={handleSetLocation}
            className="w-full btn-safe text-primary-foreground py-6 text-lg"
            disabled={locationLoading}
          >
            {locationLoading ? (
              "Obteniendo ubicación..."
            ) : (
              <>
                <MapPin className="w-5 h-5 mr-2" />
                Estoy en casa, guardar ubicación
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Asegúrate de estar en casa cuando pulses este botón
          </p>
        </div>
      </main>
    </div>
  );
};

export default Setup;
