import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LogOut, Users, MapPin, Home, CheckCircle2, Clock, UserPlus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const phoneSchema = z.string().regex(/^[67]\d{8}$/, "Introduce un móvil válido (9 dígitos)");
const nameSchema = z.string().trim().min(2, "Nombre demasiado corto").max(50, "Nombre demasiado largo");

interface ProtegidoInfo {
  id: string;
  display_name: string;
  phone: string;
  home_latitude: number | null;
  home_longitude: number | null;
  link_confirmed: boolean;
}

interface PendingInvite {
  id: string;
  protegido_phone: string;
  protegido_display_name: string;
}

type ProtegidoStatus = "en_casa" | "en_camino" | "sin_ubicacion";

const ProtectorDashboard = () => {
  const { user, profile, signOut, updateHomeLocation } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [protegidos, setProtegidos] = useState<ProtegidoInfo[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string }>({});
  const [settingLocationFor, setSettingLocationFor] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    fetchProtegidos();
  }, []);

  const fetchProtegidos = async () => {
    try {
      const { data: links, error: linksError } = await supabase
        .from("protector_links")
        .select("*");

      if (linksError) throw linksError;
      if (!links || links.length === 0) {
        setProtegidos([]);
        setPendingInvites([]);
        setLoading(false);
        return;
      }

      // Separar vinculados de pendientes
      const linkedLinks = links.filter((l) => l.protegido_user_id);
      const pendingLinks = links.filter((l) => !l.protegido_user_id);

      // Invitaciones pendientes
      setPendingInvites(
        pendingLinks.map((l) => ({
          id: l.id,
          protegido_phone: (l as any).protegido_phone || "",
          protegido_display_name: (l as any).protegido_display_name || "Sin nombre",
        }))
      );

      // Protegidos vinculados
      if (linkedLinks.length > 0) {
        const protegidoIds = linkedLinks.map((l) => l.protegido_user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", protegidoIds);

        if (profilesError) throw profilesError;

        const protegidosList: ProtegidoInfo[] = (profiles || []).map((p) => {
          const link = linkedLinks.find((l) => l.protegido_user_id === p.user_id);
          return {
            id: p.user_id,
            display_name: p.display_name,
            phone: p.phone,
            home_latitude: p.home_latitude,
            home_longitude: p.home_longitude,
            link_confirmed: link?.is_confirmed || false,
          };
        });
        setProtegidos(protegidosList);
      } else {
        setProtegidos([]);
      }
    } catch (error) {
      console.error("Error fetching protegidos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los protegidos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProtegido = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; phone?: string } = {};

    const nameResult = nameSchema.safeParse(newName);
    if (!nameResult.success) errors.name = nameResult.error.errors[0].message;

    const phoneResult = phoneSchema.safeParse(newPhone);
    if (!phoneResult.success) errors.phone = phoneResult.error.errors[0].message;

    if (newPhone === profile?.phone) errors.phone = "No puedes añadirte a ti mismo";

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAddLoading(true);
    try {
      const { error } = await supabase.from("protector_links").insert({
        protector_user_id: user!.id,
        protector_phone: profile!.phone,
        protegido_phone: newPhone,
        protegido_display_name: newName.trim(),
      } as any);

      if (error) throw error;

      toast({
        title: "✅ Protegido añadido",
        description: `Cuando ${newName.trim()} se registre con el teléfono ${newPhone}, se vinculará automáticamente`,
      });

      setNewName("");
      setNewPhone("");
      setShowAddForm(false);
      setFormErrors({});
      fetchProtegidos();
    } catch (error) {
      console.error("Error adding protegido:", error);
      toast({
        title: "Error",
        description: "No se pudo añadir el protegido",
        variant: "destructive",
      });
    } finally {
      setAddLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleSetOwnHomeLocation = async () => {
    setLocationLoading(true);
    setSettingLocationFor("self");
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      await updateHomeLocation(position.coords.latitude, position.coords.longitude);

      toast({
        title: "📍 Ubicación guardada",
        description: "Tu ubicación de casa se ha configurado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof GeolocationPositionError
          ? "No se pudo obtener la ubicación GPS"
          : "No se pudo guardar la ubicación",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
      setSettingLocationFor(null);
    }
  };

  const handleSetHomeLocation = async (protegidoUserId: string) => {
    setLocationLoading(true);
    setSettingLocationFor(protegidoUserId);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { error } = await supabase
        .from("profiles")
        .update({
          home_latitude: position.coords.latitude,
          home_longitude: position.coords.longitude,
        })
        .eq("user_id", protegidoUserId);

      if (error) throw error;

      toast({
        title: "📍 Ubicación guardada",
        description: "La ubicación de casa se ha configurado correctamente",
      });
      fetchProtegidos();
    } catch (error) {
      console.error("Error setting location:", error);
      toast({
        title: "Error",
        description: error instanceof GeolocationPositionError
          ? "No se pudo obtener la ubicación GPS"
          : "No se pudo guardar la ubicación",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
      setSettingLocationFor(null);
    }
  };

  const getStatus = (p: ProtegidoInfo): ProtegidoStatus => {
    if (!p.home_latitude) return "sin_ubicacion";
    return "en_casa";
  };

  const getStatusDisplay = (status: ProtegidoStatus) => {
    switch (status) {
      case "en_casa":
        return { label: "En casa", icon: Home, className: "bg-success/10 text-success" };
      case "en_camino":
        return { label: "Volviendo a casa", icon: Clock, className: "bg-warning/10 text-warning" };
      case "sin_ubicacion":
        return { label: "Pendiente de configurar", icon: MapPin, className: "bg-muted text-muted-foreground" };
    }
  };

  const hasAny = protegidos.length > 0 || pendingInvites.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">SafeHome</span>
        </div>
        <button onClick={handleLogout} className="text-muted-foreground">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Hola, {profile?.display_name}</h1>
            <p className="text-muted-foreground">Panel de protector</p>
          </div>

          {/* Ubicación de casa del protector */}
          <div className="p-5 rounded-2xl border-2 bg-card space-y-3">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Mi ubicación de casa</h2>
            </div>
            {profile?.home_latitude ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Ubicación configurada</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aún no has configurado tu ubicación de casa</p>
            )}
            <Button
              onClick={handleSetOwnHomeLocation}
              disabled={locationLoading && settingLocationFor === "self"}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {locationLoading && settingLocationFor === "self"
                ? "Obteniendo ubicación..."
                : profile?.home_latitude
                  ? "Cambiar ubicación de casa"
                  : "Configurar ubicación de casa"}
            </Button>
          </div>

          {/* Botón para añadir protegido */}
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            variant={showAddForm ? "secondary" : "default"}
            className={showAddForm ? "" : "btn-safe text-primary-foreground"}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            {showAddForm ? "Cancelar" : "Dar de alta protegido"}
          </Button>

          {/* Formulario de alta */}
          {showAddForm && (
            <form onSubmit={handleAddProtegido} className="p-5 rounded-2xl border-2 bg-card space-y-4 animate-fade-in">
              <h3 className="font-semibold">Nuevo protegido</h3>
              <div className="space-y-2">
                <Label htmlFor="newName">Nombre</Label>
                <Input
                  id="newName"
                  placeholder="Nombre del protegido"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={50}
                />
                {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPhone">Teléfono móvil</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="newPhone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="612345678"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    className="pl-10"
                  />
                </div>
                {formErrors.phone && <p className="text-sm text-destructive">{formErrors.phone}</p>}
              </div>
              <Button type="submit" className="w-full btn-safe text-primary-foreground" disabled={addLoading}>
                {addLoading ? "Añadiendo..." : "Añadir protegido"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Se vinculará automáticamente cuando se registre con ese teléfono
              </p>
            </form>
          )}

          {/* Lista de protegidos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Mis protegidos</h2>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : !hasAny ? (
              <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-border">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">Sin protegidos</h3>
                <p className="text-sm text-muted-foreground">
                  Pulsa "Dar de alta protegido" para añadir uno
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {protegidos.map((p) => {
                  const status = getStatus(p);
                  const statusInfo = getStatusDisplay(status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div key={p.id} className="p-5 rounded-2xl border-2 bg-card">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${statusInfo.className}`}>
                          <StatusIcon className="w-7 h-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{p.display_name}</h3>
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium ${statusInfo.className}`}>
                            {statusInfo.label}
                          </div>
                        </div>
                      </div>
                      {status === "en_casa" && (
                        <div className="mt-4 space-y-3">
                          <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                            <div className="flex items-center gap-2 text-success">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-medium">Todo está bien</span>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleSetHomeLocation(p.id)}
                            disabled={locationLoading && settingLocationFor === p.id}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            {locationLoading && settingLocationFor === p.id
                              ? "Obteniendo ubicación..."
                              : "Cambiar ubicación de casa"}
                          </Button>
                        </div>
                      )}
                      {status === "sin_ubicacion" && (
                        <div className="mt-4 space-y-3">
                          <p className="text-sm text-muted-foreground px-3">
                            {p.display_name} aún no ha configurado la ubicación de casa
                          </p>
                          <Button
                            onClick={() => handleSetHomeLocation(p.id)}
                            disabled={locationLoading && settingLocationFor === p.id}
                            variant="outline"
                            className="w-full"
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            {locationLoading && settingLocationFor === p.id
                              ? "Obteniendo ubicación..."
                              : "Configurar ubicación de casa"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Invitaciones pendientes */}
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="p-5 rounded-2xl border-2 border-dashed bg-card/50">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                        <Clock className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{inv.protegido_display_name}</h3>
                        <p className="text-sm text-muted-foreground">{inv.protegido_phone}</p>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium bg-muted text-muted-foreground mt-1">
                          Pendiente de registro
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProtectorDashboard;
