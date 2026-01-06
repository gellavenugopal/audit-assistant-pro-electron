import { useState, useEffect } from "react";
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
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGenerateOtp, useEstablishSession } from "@/hooks/useGstins";
import { Loader2 } from "lucide-react";
import type { Gstin } from "@/types/gstzen";

const otpSchema = z.object({
    username: z.string().min(1, "Username is required"),
    otp: z.string().optional(),
});

type OtpFormValues = z.infer<typeof otpSchema>;

interface GstnLoginDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    gstin: Gstin | null;
    onSuccess?: () => void;
}

export function GstnLoginDialog({ open, onOpenChange, gstin, onSuccess }: GstnLoginDialogProps) {
    const [step, setStep] = useState<"username" | "otp">("username");
    const [otpSent, setOtpSent] = useState(false);

    const generateOtpMutation = useGenerateOtp();
    const establishSessionMutation = useEstablishSession();

    const form = useForm<OtpFormValues>({
        resolver: zodResolver(otpSchema),
        defaultValues: {
            username: "",
            otp: "",
        },
    });

    useEffect(() => {
        if (gstin) {
            form.setValue("username", gstin.metadata?.gstn?.credentials?.username || "");
        }
    }, [gstin, form]);

    const handleSendOtp = async (data: OtpFormValues) => {
        console.log("handleSendOtp called with:", data);
        if (!gstin) {
            console.error("No GSTIN selected");
            return;
        }

        try {
            console.log("Calling generateOtpMutation...");
            await generateOtpMutation.mutateAsync({
                gstin: gstin.gstin,
                username: data.username,
            });
            console.log("generateOtpMutation success, switching step");
            setStep("otp");
            setOtpSent(true);
        } catch (error) {
            console.error("handleSendOtp error:", error);
        }
    };

    const handleVerifyOtp = async (data: OtpFormValues) => {
        if (!gstin) return;

        if (!data.otp || data.otp.length < 1) {
            form.setError("otp", { message: "OTP is required" });
            return;
        }

        try {
            const result = await establishSessionMutation.mutateAsync({
                gstin: gstin.gstin,
                otp: data.otp,
            });

            if (result && result.message && result.message.status_cd === "1") {
                onOpenChange(false);
                if (onSuccess) onSuccess();
                // Reset flow
                setStep("username");
                setOtpSent(false);
                form.reset();
            } else if (result && result.status_cd === "1") {
                // Fallback if structure is flat
                onOpenChange(false);
                if (onSuccess) onSuccess();
                setStep("username");
                setOtpSent(false);
                form.reset();
            } else {
                form.setError("otp", { message: "Login failed. Check OTP." });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const onSubmit = (data: OtpFormValues) => {
        console.log("Form submitted. Step:", step, "Data:", data);
        if (step === "username") {
            handleSendOtp(data);
        } else {
            handleVerifyOtp(data);
        }
    };

    const isSubmitting = generateOtpMutation.isPending || establishSessionMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>GST Portal Login</DialogTitle>
                    <DialogDescription>
                        {step === "username"
                            ? "Verify username to request OTP from GST Portal"
                            : "Enter the OTP received on registered mobile/email"}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Portal Username</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter username"
                                                {...field}
                                                disabled={step === "otp" || isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {step === "otp" && (
                                <FormField
                                    control={form.control}
                                    name="otp"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Enter OTP</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="123456"
                                                    maxLength={6}
                                                    {...field}
                                                    disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                OTP sent to registered mobile number
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <DialogFooter>
                                {step === "otp" && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setStep("username")}
                                        disabled={isSubmitting}
                                    >
                                        Back
                                    </Button>
                                )}
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {step === "username" ? "Request OTP" : "Login"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
