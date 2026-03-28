import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (username === "family_documents" && password === "familydocuments") {
      setError("");
      onLogin();
    } else {
      setError("Incorrect username or password");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <span className="text-4xl">📁</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Family Documents
          </CardTitle>
          <p className="text-muted-foreground mt-1">
            Sign in to access your family files
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-14 text-lg px-4"
                autoComplete="username"
                data-ocid="login.input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 text-lg px-4"
                autoComplete="current-password"
                data-ocid="login.textarea"
              />
            </div>
            {error && (
              <p
                className="text-destructive text-sm font-medium"
                data-ocid="login.error_state"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold mt-2"
              data-ocid="login.submit_button"
            >
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
