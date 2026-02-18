import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Shield, ArrowLeft, Phone, Lock, Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Validación de teléfono español (9 dígitos, empieza por 6 o 7)
const phoneSchema = z.string()
  .regex(/^[67]\d{8}$/, "Introduce un móvil válido (9 dígitos)");
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres");
const emailSchema = z.string().email("Introduce un email válido");

type AuthMode = "login" | "signup";
type UserRole = "protector" | "protegido";

interface FormErrors {
  phone?: string;
  password?: string;
  role?: string;
  email?: string;
  protectorPhone?: string;
}

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [protectorPhone, setProtectorPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors: FormErrors = {};

    // Validar móvil propio
    const phoneResult = phoneSchema.safeParse(phone);
    if (!phoneResult.success) {
      newErrors.phone = phoneResult.error.errors[0].message;
    }

    // Validar contraseña
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (mode === "signup") {
      // Rol requerido
      if (!selectedRole) {
        newErrors.role = "Selecciona tu rol";
      }

      // Protector necesita email
      if (selectedRole === "protector") {
        const emailResult = emailSchema.safeParse(email);
        if (!emailResult.success) {
          newErrors.email = emailResult.error.errors[0].message;
        }
      }

      // Protegido necesita móvil del protector
      if (selectedRole === "protegido") {
        const protectorPhoneResult = phoneSchema.safeParse(protectorPhone);
        if (!protectorPhoneResult.success) {
          newErrors.protectorPhone = "Introduce el móvil de tu protector";
        }
        if (protectorPhone === phone) {
          newErrors.protectorPhone = "El móvil del protector debe ser diferente al tuyo";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      if (mode === "login") {
        // Login: usamos el teléfono como email ficticio
        const fakeEmail = `${phone}@safehome.app`;
        const { error } = await signIn(fakeEmail, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Error de acceso",
              description: "Móvil o contraseña incorrectos",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }
        navigate("/");
      } else {
        // Signup: todos usan teléfono como email ficticio
                const signupEmail = `${phone}@safehome.app`;
        
        const { data, error } = await signUp(
          signupEmail, 
          password, 
          phone, 
          selectedRole!,
          selectedRole === "protegido" ? protectorPhone : undefined
        );
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Usuario existente",
              description: "Este móvil ya está registrado. Intenta iniciar sesión.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error de registro",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        toast({
          title: "¡Bienvenido!",
          description: "Tu cuenta ha sido creada correctamente",
        });
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMode(mode === "login" ? "signup" : "login");
    setSelectedRole(null);
    setErrors({});
    setEmail("");
    setProtectorPhone("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center gap-2 px-6 py-4">
        <button onClick={() => navigate("/")} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Shield className="w-6 h-6 text-primary" />
        <span className="font-bold text-lg">SafeHome</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {mode === "login"
                ? "Accede con tu número de móvil"
                : "Regístrate como protector o protegido"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selector de rol solo en registro */}
            {mode === "signup" && (
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
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role}</p>
                )}
              </div>
            )}

            {/* Email solo para protector en registro */}
            {mode === "signup" && selectedRole === "protector" && (
              <div className="space-y-2">
                <Label htmlFor="email">Tu email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Tu número de móvil</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="612345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  className="pl-10"
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>

            {/* Móvil del protector solo para protegido en registro */}
            {mode === "signup" && selectedRole === "protegido" && (
              <div className="space-y-2">
                <Label htmlFor="protectorPhone">Móvil de tu protector</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="protectorPhone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Móvil de tu padre/madre/tutor"
                    value={protectorPhone}
                    onChange={(e) => setProtectorPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Se vinculará automáticamente cuando tu protector se registre
                </p>
                {errors.protectorPhone && (
                  <p className="text-sm text-destructive">{errors.protectorPhone}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full btn-safe text-primary-foreground"
              disabled={loading}
            >
              {loading
                ? "Cargando..."
                : mode === "login"
                ? "Entrar"
                : "Crear cuenta"}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={resetForm}
              className="text-primary hover:underline"
            >
              {mode === "login"
                ? "¿No tienes cuenta? Regístrate"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
