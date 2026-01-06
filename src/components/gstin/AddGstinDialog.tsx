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
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAddGstin } from "@/hooks/useGstins";

const gstinSchema = z.object({
    gstin: z
        .string()
        .min(15, "GSTIN must be 15 characters")
        .max(15, "GSTIN must be 15 characters")
        .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
    trade_name: z.string().optional(),
    legal_name: z.string().optional(),
    username: z.string().min(1, "Username is required for portal access"),
    password: z.string().min(1, "Password is required for portal access"),
    filing_frequency: z.enum(["monthly", "quarterly"]).default("monthly"),
});

type GstinFormValues = z.infer<typeof gstinSchema>;

interface AddGstinDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerUuid: string;
}

export function AddGstinDialog({ open, onOpenChange, customerUuid }: AddGstinDialogProps) {
    const addGstinMutation = useAddGstin(customerUuid);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<GstinFormValues>({
        resolver: zodResolver(gstinSchema),
        defaultValues: {
            gstin: "",
            trade_name: "",
            legal_name: "",
            username: "",
            password: "",
            filing_frequency: "monthly",
        },
    });

    const onSubmit = async (data: GstinFormValues) => {
        setIsSubmitting(true);
        try {
            await addGstinMutation.mutateAsync(data as any);
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to add GSTIN:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Add GSTIN</DialogTitle>
                    <DialogDescription>
                        Enter your GSTIN details and portal credentials to enable GSTR1 downloads
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="gstin"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>GSTIN *</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="09AABCT9875M1Z0"
                                            className="font-mono uppercase"
                                            maxLength={15}
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        15-character GST Identification Number
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="trade_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Trade Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter trade name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="legal_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Legal Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter legal name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="border-t pt-4 mt-4">
                            <h3 className="text-sm font-medium mb-3">GST Portal Credentials</h3>

                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Portal Username *</FormLabel>
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
                                            <FormLabel>Portal Password *</FormLabel>
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

                                <FormField
                                    control={form.control}
                                    name="filing_frequency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Filing Frequency</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select filing frequency" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="monthly">Monthly</SelectItem>
                                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Adding..." : "Add GSTIN"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
