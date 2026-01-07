import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useUpdateGstinCredentials, useTestGstinConnection } from "@/hooks/useGstins";
import type { Gstin } from "@/types/gstzen";

const credentialsSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

interface GstinCredentialsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    gstin: Gstin;
}

export function GstinCredentialsDialog({
    open,
    onOpenChange,
    gstin,
}: GstinCredentialsDialogProps) {
    const updateMutation = useUpdateGstinCredentials();
    const testMutation = useTestGstinConnection();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const form = useForm<CredentialsFormValues>({
        resolver: zodResolver(credentialsSchema),
        defaultValues: {
            username: gstin.metadata?.gstn?.credentials?.username || "",
            password: "",
        },
    });

    const onSubmit = async (data: CredentialsFormValues) => {
        setIsSubmitting(true);
        try {
            await updateMutation.mutateAsync({
                gstin_uuid: gstin.uuid,
                username: data.username,
                password: data.password,
            });
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update credentials:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        try {
            await testMutation.mutateAsync(gstin.uuid);
        } catch (error) {
            console.error("Connection test failed:", error);
        } finally {
            setIsTesting(false);
        }
    };

    const getSessionStatus = () => {
        const session = gstin.metadata?.gstn?.session;
        if (session?.authtoken) {
            const now = Date.now() / 1000;
            const expiryTime = session.expiry_time || 0;

            if (now < expiryTime) {
                return {
                    status: "active",
                    label: "Active Session",
                    icon: <CheckCircle className="w-4 h-4" />,
                    variant: "default" as const,
                };
            } else if (now < (expiryTime + 18 * 3600)) {
                return {
                    status: "dormant",
                    label: "Session Dormant",
                    icon: <AlertCircle className="w-4 h-4" />,
                    variant: "secondary" as const,
                };
            }
        }

        return {
            status: "inactive",
            label: "No Active Session",
            icon: <XCircle className="w-4 h-4" />,
            variant: "destructive" as const,
        };
    };

    const sessionStatus = getSessionStatus();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Configure GSTIN Credentials</DialogTitle>
                    <DialogDescription>
                        Update GST portal credentials for {gstin.gstin}
                    </DialogDescription>
                </DialogHeader>

                <div className="mb-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium">Portal Session Status</span>
                        <Badge variant={sessionStatus.variant} className="flex items-center gap-1">
                            {sessionStatus.icon}
                            {sessionStatus.label}
                        </Badge>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Portal Username</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter GST portal username" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Portal Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="Enter GST portal password"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleTestConnection}
                                disabled={isTesting || !gstin.metadata?.gstn?.credentials?.username}
                            >
                                {isTesting ? "Testing..." : "Test Connection"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save Credentials"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
