import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Loader2, Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GstzenLogin() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [credentials, setCredentials] = useState({
        username: "",
        password: "",
    });
    const [error, setError] = useState("");

    // Check if running in Electron
    const isElectron = typeof window !== 'undefined' && window.electronAPI;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            let result;

            if (isElectron) {
                // Use Electron IPC (no CORS!)
                result = await window.electronAPI.gstzen.login(credentials);
            } else {
                // Fallback to direct fetch (requires CORS)
                const apiUrl = (import.meta as any).env.VITE_GSTZEN_API_URL || 'http://localhost:9001';
                const response = await fetch(`${apiUrl}/accounts/api/login/token/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(credentials),
                });
                const data = await response.json();
                result = { ok: response.ok, status: response.status, data };
            }

            if (result.ok && result.data.access) {
                // Store the access and refresh tokens
                localStorage.setItem("gstzen_token", result.data.access);
                localStorage.setItem("gstzen_refresh_token", result.data.refresh || "");
                localStorage.setItem("gstzen_user", JSON.stringify({ username: credentials.username }));
                localStorage.setItem("gstzen_email", credentials.username); // Store email for customer lookup

                toast({
                    title: "Success",
                    description: "Successfully logged into GSTZen",
                });

                navigate("/gstr1-integration");
            } else {
                setError(result.data.detail || result.data.message || "Login failed. Please check your credentials.");
            }
        } catch (err) {
            console.error("Login error:", err);
            setError("Unable to connect to GSTZen server. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-3 text-center">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">GSTZen Login</CardTitle>
                    <CardDescription>
                        Sign in to access GSTR1 reports and GST portal integration
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="username">Username or Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    className="pl-10"
                                    value={credentials.username}
                                    onChange={(e) =>
                                        setCredentials({ ...credentials, username: e.target.value })
                                    }
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    className="pl-10"
                                    value={credentials.password}
                                    onChange={(e) =>
                                        setCredentials({ ...credentials, password: e.target.value })
                                    }
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading || !credentials.username || !credentials.password}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground pt-2">
                            {isElectron ? (
                                <p className="text-green-600 dark:text-green-400 font-medium">
                                    ✓ Running in Electron (No CORS required)
                                </p>
                            ) : (
                                <p className="text-amber-600 dark:text-amber-400 font-medium">
                                    ⚠ Running in browser (CORS must be configured)
                                </p>
                            )}
                            <a
                                href="https://app.gstzen.in/signup"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline mt-2 block"
                            >
                                Don't have an account? Sign up
                            </a>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
