"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { loginPasswordGrant, setAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const data = await loginPasswordGrant(user.trim(), password);

      setAuth({
        accessToken: data.access_token,
        apiKey: data.api_key,
        tokenType: data.token_type ?? "bearer",
      });

      toast.success("Login realizado!", {
        description: "Redirecionando para a home...",
        duration: 1500,
      });

      router.push("/home");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Usuário ou senha incorretos.";
      toast.error("Erro no login", {
        description: String(msg),
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = user.trim().length > 0 && password.length > 0 && !loading;

  return (
    <div className="bg-primaria/10 min-h-screen flex overflow-hidden">
      <Card className="w-full h-full rounded-t-none rounded-xl shadow-lg max-w-xl mx-auto my-10">
        <CardHeader>
          <CardTitle className="text-primaria">Acesse sua conta</CardTitle>
          <CardDescription className="text-secundaria">
            Informe seus dados abaixo para acessar sua conta.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="user" className="text-primaria">
                Usuário
              </Label>
              <Input
                id="user"
                type="text"
                autoComplete="username"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2 relative">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-primaria">
                  Senha
                </Label>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-[32px] text-muted-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <CardFooter className="p-0">
              <Button
                type="submit"
                className="w-full bg-primaria hover:bg-primaria/80"
                disabled={!canSubmit}
              >
                {loading ? "Entrando..." : "Login"}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
