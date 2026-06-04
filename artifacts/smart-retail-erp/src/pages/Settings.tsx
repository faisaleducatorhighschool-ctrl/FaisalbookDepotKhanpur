import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Switch } from "@/components/ui/switch";
import { useEffect, useRef, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Palette, CreditCard, Upload, ImageOff } from "lucide-react";

const formSchema = z.object({
  storeName: z.string().min(1, "Required"),
  companyName: z.string().optional(),
  ownerName: z.string().optional(),
  branchName: z.string().optional(),
  storePhone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  storeEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  storeAddress: z.string().optional(),
  currency: z.string().min(1, "Required"),
  taxRate: z.coerce.number().min(0),
  invoicePrefix: z.string().optional(),
  darkMode: z.boolean(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  stampUrl: z.string().optional(),
  signatureUrl: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountTitle: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIban: z.string().optional(),
  bankBranchCode: z.string().optional(),
  jazzcashNumber: z.string().optional(),
  easypaisaNumber: z.string().optional(),
  qrCodeUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function ImageUploadField({ label, value, onChange, placeholder, description }: {
  label: string; value?: string; onChange: (v: string) => void; placeholder?: string; description?: string;
}) {
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target?.result as string ?? "");
    reader.readAsDataURL(file);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium leading-none">{label}</p>
      <div className="flex items-start gap-3">
        <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 shrink-0 overflow-hidden">
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-contain" />
          ) : (
            <ImageOff className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="cursor-pointer">
            <Button type="button" variant="outline" size="sm" className="w-full" asChild>
              <span><Upload className="w-3.5 h-3.5 mr-1.5" />Upload Image</span>
            </Button>
            <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
          </label>
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Or paste image URL"}
            className="text-xs"
          />
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateSettings = useUpdateSettings();
  const initializedRef = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeName: "", companyName: "", ownerName: "", branchName: "",
      storePhone: "", whatsappNumber: "", storeEmail: "", storeAddress: "",
      currency: "PKR", taxRate: 0, invoicePrefix: "INV", darkMode: true,
      logoUrl: "", faviconUrl: "", stampUrl: "", signatureUrl: "",
      bankName: "", bankAccountTitle: "", bankAccount: "", bankIban: "", bankBranchCode: "",
      jazzcashNumber: "", easypaisaNumber: "", qrCodeUrl: "",
    }
  });

  const s = settings as any;

  useEffect(() => {
    if (settings && !initializedRef.current) {
      form.reset({
        storeName: settings.storeName || "",
        companyName: s.companyName || "",
        ownerName: s.ownerName || "",
        branchName: s.branchName || "",
        storePhone: settings.storePhone || "",
        whatsappNumber: s.whatsappNumber || "",
        storeEmail: settings.storeEmail || "",
        storeAddress: settings.storeAddress || "",
        currency: settings.currency || "PKR",
        taxRate: Number(settings.taxRate) || 0,
        invoicePrefix: settings.invoicePrefix || "INV",
        darkMode: settings.darkMode ?? true,
        logoUrl: settings.logoUrl || "",
        faviconUrl: s.faviconUrl || "",
        stampUrl: s.stampUrl || "",
        signatureUrl: s.signatureUrl || "",
        bankName: s.bankName || "",
        bankAccountTitle: s.bankAccountTitle || "",
        bankAccount: s.bankAccount || "",
        bankIban: s.bankIban || "",
        bankBranchCode: s.bankBranchCode || "",
        jazzcashNumber: s.jazzcashNumber || "",
        easypaisaNumber: s.easypaisaNumber || "",
        qrCodeUrl: s.qrCodeUrl || "",
      });
      initializedRef.current = true;
    }
  }, [settings, form, s]);

  const onSubmit = (data: FormValues) => {
    updateSettings.mutate({ data: data as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings saved successfully" });
      }
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your store preferences and system configuration.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Business Information ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Business Information</CardTitle>
              <CardDescription>Details that appear on invoices, receipts, and reports.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <FormField control={form.control} name="storeName" render={({ field }) => (
                <FormItem><FormLabel>Shop / Store Name *</FormLabel><FormControl><Input {...field} placeholder="Your store name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} placeholder="Registered company name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ownerName" render={({ field }) => (
                <FormItem><FormLabel>Owner Name</FormLabel><FormControl><Input {...field} placeholder="Business owner's name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="branchName" render={({ field }) => (
                <FormItem><FormLabel>Branch Name</FormLabel><FormControl><Input {...field} placeholder="e.g. Main Branch, North Branch" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="storePhone" render={({ field }) => (
                <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} placeholder="+92-300-0000000" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
                <FormItem><FormLabel>WhatsApp Number</FormLabel><FormControl><Input {...field} placeholder="+92-300-0000000" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="storeEmail" render={({ field }) => (
                <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} placeholder="store@example.com" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="storeAddress" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} placeholder="Full business address" /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* ── Branding ────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" />Branding</CardTitle>
              <CardDescription>Images that appear on printed invoices and reports.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField control={form.control} name="logoUrl" render={({ field }) => (
                <FormItem>
                  <ImageUploadField label="Company Logo" value={field.value} onChange={field.onChange} placeholder="https://..." description="Printed top-left on invoices" />
                </FormItem>
              )} />
              <FormField control={form.control} name="faviconUrl" render={({ field }) => (
                <FormItem>
                  <ImageUploadField label="Favicon / App Icon" value={field.value} onChange={field.onChange} placeholder="https://..." description="Small icon for the browser tab" />
                </FormItem>
              )} />
              <FormField control={form.control} name="stampUrl" render={({ field }) => (
                <FormItem>
                  <ImageUploadField label="Company Stamp" value={field.value} onChange={field.onChange} placeholder="https://..." description="Printed at document bottom" />
                </FormItem>
              )} />
              <FormField control={form.control} name="signatureUrl" render={({ field }) => (
                <FormItem>
                  <ImageUploadField label="Authorized Signature" value={field.value} onChange={field.onChange} placeholder="https://..." description="Printed next to stamp" />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* ── Payment Details ──────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Payment Details</CardTitle>
              <CardDescription>Bank and mobile payment info shown at the bottom of invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bank Transfer */}
              <div>
                <p className="text-sm font-semibold mb-3 text-muted-foreground">Bank Transfer</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="bankName" render={({ field }) => (
                    <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} placeholder="e.g. HBL, MCB, UBL" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bankAccountTitle" render={({ field }) => (
                    <FormItem><FormLabel>Account Title</FormLabel><FormControl><Input {...field} placeholder="Account holder name" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bankAccount" render={({ field }) => (
                    <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} placeholder="1234567890123" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bankIban" render={({ field }) => (
                    <FormItem><FormLabel>IBAN</FormLabel><FormControl><Input {...field} placeholder="PK00XXXX0000000000000000" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bankBranchCode" render={({ field }) => (
                    <FormItem><FormLabel>Branch Code</FormLabel><FormControl><Input {...field} placeholder="e.g. 0001" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              {/* Mobile Payments */}
              <div>
                <p className="text-sm font-semibold mb-3 text-muted-foreground">Mobile Payments</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="jazzcashNumber" render={({ field }) => (
                    <FormItem><FormLabel>JazzCash Number</FormLabel><FormControl><Input {...field} placeholder="+92-300-0000000" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="easypaisaNumber" render={({ field }) => (
                    <FormItem><FormLabel>EasyPaisa Number</FormLabel><FormControl><Input {...field} placeholder="+92-300-0000000" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              {/* QR Code */}
              <div className="max-w-sm">
                <p className="text-sm font-semibold mb-3 text-muted-foreground">QR Code</p>
                <FormField control={form.control} name="qrCodeUrl" render={({ field }) => (
                  <FormItem>
                    <ImageUploadField label="Payment QR Code" value={field.value} onChange={field.onChange} placeholder="https://..." description="Printed on invoices for quick payment scanning" />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* ── System Settings ──────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Regional and operational configuration.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="PKR">Pakistani Rupee (PKR)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                      <SelectItem value="AED">UAE Dirham (AED)</SelectItem>
                      <SelectItem value="SAR">Saudi Riyal (SAR)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="taxRate" render={({ field }) => (
                <FormItem><FormLabel>Default Tax Rate (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="invoicePrefix" render={({ field }) => (
                <FormItem><FormLabel>Invoice Prefix</FormLabel><FormControl><Input {...field} placeholder="INV" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="darkMode" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4 shadow-sm mt-2">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Dark Mode</FormLabel>
                    <FormDescription>Default theme for the application.</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="border-t bg-muted/20 px-6 py-4">
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save All Settings"}
              </Button>
            </CardFooter>
          </Card>

        </form>
      </Form>
    </div>
  );
}
