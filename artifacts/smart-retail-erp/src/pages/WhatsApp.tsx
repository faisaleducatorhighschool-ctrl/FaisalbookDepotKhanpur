import { useState, useCallback } from "react";
import {
  useListWhatsappTemplates, useCreateWhatsappTemplate,
  useUpdateWhatsappTemplate, useDeleteWhatsappTemplate,
  getListWhatsappTemplatesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, Eye, Send, Search, Settings2,
  Download, CheckCircle2, Circle, Smartphone, Copy, RefreshCw, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Category & variable definitions ──────────────────────────────────────────

const CATEGORIES = [
  { key: "all", label: "All Templates", color: "bg-gray-500" },
  { key: "sales", label: "Sales & POS", color: "bg-blue-500" },
  { key: "orders", label: "Orders", color: "bg-violet-500" },
  { key: "customers", label: "Customers", color: "bg-green-500" },
  { key: "purchases", label: "Purchases", color: "bg-orange-500" },
  { key: "suppliers", label: "Suppliers", color: "bg-amber-500" },
  { key: "employees", label: "Employees", color: "bg-cyan-500" },
  { key: "delivery", label: "Delivery", color: "bg-emerald-500" },
  { key: "accounts", label: "Accounts", color: "bg-pink-500" },
  { key: "system", label: "System", color: "bg-red-500" },
];

const TRIGGER_CATEGORY_MAP: Record<string, string> = {
  sales_invoice: "sales", counter_sale_invoice: "sales", credit_sale_invoice: "sales",
  payment_received_sales: "sales", due_payment_reminder: "sales", sales_return: "sales",
  order_confirmed: "orders", order_approved: "orders", order_processing: "orders",
  order_packed: "orders", order_out_for_delivery: "orders", order_delivered: "orders",
  order_cancelled: "orders", order_returned: "orders",
  customer_registered: "customers", customer_welcome: "customers", customer_birthday: "customers",
  customer_loyalty: "customers", customer_promo: "customers", customer_new_product: "customers",
  purchase_order_sent: "purchases", purchase_received: "purchases", purchase_return: "purchases",
  supplier_registered: "suppliers", supplier_payment: "suppliers", supplier_outstanding: "suppliers",
  employee_account_created: "employees", employee_credentials: "employees", employee_salary: "employees",
  employee_attendance: "employees", employee_task: "employees", employee_delivery: "employees",
  delivery_route_assigned: "delivery", delivery_assigned: "delivery", delivery_completed: "delivery",
  delivery_failed: "delivery", delivery_cash_reminder: "delivery", delivery_cash_submitted: "delivery",
  payment_received: "accounts", payment_confirmed: "accounts", expense_approved: "accounts",
  cash_report: "accounts",
  password_reset: "system", login_verification: "system", security_alert: "system",
  backup_completed: "system", system_notification: "system",
};

const VARIABLES = [
  { key: "{customer_name}", label: "Customer Name", sample: "John Ahmed" },
  { key: "{supplier_name}", label: "Supplier Name", sample: "ABC Traders" },
  { key: "{employee_name}", label: "Employee Name", sample: "Ali Hassan" },
  { key: "{driver_name}", label: "Driver Name", sample: "Kamran Shah" },
  { key: "{invoice_no}", label: "Invoice Number", sample: "INV-1001" },
  { key: "{order_no}", label: "Order Number", sample: "ORD-2024" },
  { key: "{amount}", label: "Amount", sample: "PKR 5,500" },
  { key: "{due_amount}", label: "Due Amount", sample: "PKR 1,200" },
  { key: "{company_name}", label: "Company Name", sample: "Smart Retail" },
  { key: "{branch_name}", label: "Branch Name", sample: "Main Branch" },
  { key: "{product_name}", label: "Product Name", sample: "Coca-Cola 1L" },
  { key: "{quantity}", label: "Quantity", sample: "12" },
  { key: "{payment_method}", label: "Payment Method", sample: "Cash" },
  { key: "{route_name}", label: "Route Name", sample: "City Route A" },
  { key: "{delivery_address}", label: "Delivery Address", sample: "123 Main St, Karachi" },
  { key: "{date}", label: "Date", sample: new Date().toLocaleDateString("en-PK") },
  { key: "{time}", label: "Time", sample: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) },
];

function renderPreview(message: string): string {
  let out = message;
  for (const v of VARIABLES) {
    out = out.replaceAll(v.key, `<b>${v.sample}</b>`);
  }
  return out;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function WhatsApp() {
  const { data: templates, isLoading } = useListWhatsappTemplates({ query: { queryKey: getListWhatsappTemplatesQueryKey() } });
  const createTemplate = useCreateWhatsappTemplate();
  const updateTemplate = useUpdateWhatsappTemplate();
  const deleteTemplate = useDeleteWhatsappTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [testSendTemplate, setTestSendTemplate] = useState<any>(null);
  const [testPhone, setTestPhone] = useState("");
  const [seeding, setSeeding] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTrigger, setFormTrigger] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [messageRef, setMessageRef] = useState<HTMLTextAreaElement | null>(null);

  // WhatsApp API settings (stored in localStorage)
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem("wa_api_url") || "");
  const [apiToken, setApiToken] = useState(() => localStorage.getItem("wa_api_token") || "");
  const [instanceId, setInstanceId] = useState(() => localStorage.getItem("wa_instance_id") || "");
  const [businessNumber, setBusinessNumber] = useState(() => localStorage.getItem("wa_business_number") || "");
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem("wa_webhook_url") || "");

  const saveApiSettings = () => {
    localStorage.setItem("wa_api_url", apiUrl);
    localStorage.setItem("wa_api_token", apiToken);
    localStorage.setItem("wa_instance_id", instanceId);
    localStorage.setItem("wa_business_number", businessNumber);
    localStorage.setItem("wa_webhook_url", webhookUrl);
    toast({ title: "API settings saved locally", description: "Ready for future integration" });
  };

  // Derived
  const getCategory = (trigger: string) => TRIGGER_CATEGORY_MAP[trigger] ?? "system";

  const filtered = templates?.filter(t => {
    const cat = getCategory(t.trigger);
    const matchCat = activeCategory === "all" || cat === activeCategory;
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.trigger.toLowerCase().includes(search.toLowerCase()) ||
      t.message.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const categoryCount = (key: string) =>
    key === "all"
      ? (templates?.length ?? 0)
      : (templates?.filter(t => getCategory(t.trigger) === key).length ?? 0);

  const activeCount = templates?.filter(t => t.isActive).length ?? 0;

  // Form helpers
  const openCreate = () => {
    setEditingId(null);
    setFormName(""); setFormTrigger(""); setFormMessage(""); setFormActive(true);
    setFormOpen(true);
  };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setFormName(t.name); setFormTrigger(t.trigger); setFormMessage(t.message); setFormActive(t.isActive ?? true);
    setFormOpen(true);
  };

  const insertVariable = useCallback((key: string) => {
    if (!messageRef) {
      setFormMessage(prev => prev + key);
      return;
    }
    const start = messageRef.selectionStart ?? formMessage.length;
    const end = messageRef.selectionEnd ?? formMessage.length;
    const newMsg = formMessage.slice(0, start) + key + formMessage.slice(end);
    setFormMessage(newMsg);
    setTimeout(() => {
      messageRef.focus();
      messageRef.setSelectionRange(start + key.length, start + key.length);
    }, 10);
  }, [messageRef, formMessage]);

  const handleSubmit = () => {
    if (!formName.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!formTrigger.trim()) { toast({ title: "Trigger is required", variant: "destructive" }); return; }
    if (!formMessage.trim()) { toast({ title: "Message is required", variant: "destructive" }); return; }

    const data = { name: formName, trigger: formTrigger, message: formMessage, isActive: formActive };

    if (editingId) {
      updateTemplate.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWhatsappTemplatesQueryKey() });
          setFormOpen(false);
          toast({ title: "Template updated" });
        }
      });
    } else {
      createTemplate.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWhatsappTemplatesQueryKey() });
          setFormOpen(false);
          toast({ title: "Template created" });
        }
      });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteTemplate.mutate({ id: deletingId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWhatsappTemplatesQueryKey() });
        setDeletingId(null);
        toast({ title: "Template deleted" });
      }
    });
  };

  const toggleActive = (id: number, current: boolean) => {
    updateTemplate.mutate({ id, data: { isActive: !current } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListWhatsappTemplatesQueryKey() })
    });
  };

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      const token = localStorage.getItem("erp_token");
      const res = await fetch("/api/whatsapp/templates/seed-defaults", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: getListWhatsappTemplatesQueryKey() });
      toast({ title: "Default templates loaded", description: data.message });
    } catch {
      toast({ title: "Failed to seed templates", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const copyMessage = (msg: string) => {
    navigator.clipboard.writeText(msg);
    toast({ title: "Message copied to clipboard" });
  };

  const handleTestSend = () => {
    if (!testPhone.trim()) { toast({ title: "Enter a phone number", variant: "destructive" }); return; }
    toast({
      title: "Test message queued",
      description: `Would send to +${testPhone.replace(/\D/g, "")} — connect API in Settings to enable real sending.`,
    });
    setTestSendTemplate(null);
    setTestPhone("");
  };

  const getCategoryMeta = (trigger: string) => {
    const key = getCategory(trigger);
    return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[0];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Template Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {templates?.length ?? 0} templates · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding} className="flex items-center gap-1.5">
            <RefreshCw className={cn("w-4 h-4", seeding && "animate-spin")} />
            {seeding ? "Loading..." : "Load Default Templates"}
          </Button>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />New Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4" />Templates
          </TabsTrigger>
          <TabsTrigger value="api-settings" className="flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" />API Settings
          </TabsTrigger>
        </TabsList>

        {/* ── TEMPLATES TAB ── */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex flex-col lg:flex-row gap-4">

            {/* Category sidebar */}
            <div className="lg:w-52 shrink-0 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Categories</p>
              {CATEGORIES.map(cat => {
                const count = categoryCount(cat.key);
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                      activeCategory === cat.key
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", cat.color)} />
                      {cat.label}
                    </div>
                    <span className={cn(
                      "text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
                      activeCategory === cat.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Template list */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates by name, trigger, or message..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Templates", value: templates?.length ?? 0 },
                  { label: "Active", value: activeCount, color: "text-green-500" },
                  { label: "Inactive", value: (templates?.length ?? 0) - activeCount, color: "text-muted-foreground" },
                  { label: "Categories", value: 9 },
                ].map(s => (
                  <Card key={s.label}>
                    <CardContent className="p-3">
                      <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Message Preview</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered?.map(t => {
                        const cat = getCategoryMeta(t.trigger);
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium whitespace-nowrap">{t.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[11px] whitespace-nowrap">
                                <span className={cn("w-2 h-2 rounded-full mr-1.5 inline-block", cat.color)} />
                                {cat.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-secondary px-1.5 py-0.5 rounded whitespace-nowrap">{t.trigger}</code>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm text-muted-foreground line-clamp-2">{t.message}</p>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={t.isActive ?? false}
                                onCheckedChange={() => toggleActive(t.id, t.isActive ?? false)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Preview"
                                  onClick={() => setPreviewTemplate(t)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Test Send"
                                  onClick={() => setTestSendTemplate(t)}>
                                  <Send className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit"
                                  onClick={() => openEdit(t)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete"
                                  onClick={() => setDeletingId(t.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {isLoading && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading templates...</TableCell>
                        </TableRow>
                      )}
                      {!isLoading && !filtered?.length && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            <div className="flex flex-col items-center gap-3">
                              <Smartphone className="w-10 h-10 opacity-20" />
                              {(templates?.length ?? 0) === 0 ? (
                                <>
                                  <p className="font-medium">No templates yet</p>
                                  <p className="text-sm">Click "Load Default Templates" to add 40+ ready-to-use templates, or create your own.</p>
                                  <Button onClick={seedDefaults} disabled={seeding} size="sm">
                                    <Download className="w-4 h-4 mr-1" />Load Default Templates
                                  </Button>
                                </>
                              ) : (
                                <p>No templates match your search</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Variable Reference */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />Available Variables (Placeholders)
                  </CardTitle>
                  <CardDescription>These variables are automatically replaced with real values when messages are sent</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {VARIABLES.map(v => (
                      <div key={v.key} className="group flex items-center gap-1 bg-secondary rounded-md px-2 py-1 text-xs">
                        <code className="font-mono text-primary">{v.key}</code>
                        <span className="text-muted-foreground hidden group-hover:inline">→ {v.label}</span>
                        <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100"
                          onClick={() => navigator.clipboard.writeText(v.key).then(() => toast({ title: `Copied ${v.key}` }))}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── API SETTINGS TAB ── */}
        <TabsContent value="api-settings" className="mt-4">
          <div className="max-w-2xl space-y-6">
            <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30">
              <CardContent className="pt-4 flex items-start gap-3">
                <div className="mt-0.5 text-yellow-600 shrink-0">⚠️</div>
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  <p className="font-semibold">API Integration Not Connected</p>
                  <p className="mt-0.5">
                    Enter your WhatsApp API credentials below to prepare for integration.
                    Settings are saved locally. Actual message sending will be enabled once the API connection is activated.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-green-500" />WhatsApp API Configuration
                </CardTitle>
                <CardDescription>Configure your WhatsApp Business API credentials for future integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API URL</Label>
                  <Input
                    placeholder="https://api.whatsapp-provider.com/v1"
                    value={apiUrl} onChange={e => setApiUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">The base URL of your WhatsApp API provider</p>
                </div>
                <div className="space-y-2">
                  <Label>API Token / Secret Key</Label>
                  <Input
                    type="password"
                    placeholder="••••••••••••••••••••"
                    value={apiToken} onChange={e => setApiToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Authentication token provided by your WhatsApp API provider</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Instance ID</Label>
                    <Input placeholder="instance_123456" value={instanceId} onChange={e => setInstanceId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Phone Number</Label>
                    <Input placeholder="+92 300 0000000" value={businessNumber} onChange={e => setBusinessNumber(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    placeholder="https://yourdomain.com/api/whatsapp/webhook"
                    value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">URL where WhatsApp will send delivery status updates</p>
                </div>
                <Button onClick={saveApiSettings} className="w-full">
                  <Settings2 className="w-4 h-4 mr-2" />Save API Settings
                </Button>
              </CardContent>
            </Card>

            {/* Connection status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Connection Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "API URL", value: apiUrl, ok: !!apiUrl },
                  { label: "API Token", value: apiToken ? "••••••••" : "", ok: !!apiToken },
                  { label: "Instance ID", value: instanceId, ok: !!instanceId },
                  { label: "Business Number", value: businessNumber, ok: !!businessNumber },
                  { label: "Webhook URL", value: webhookUrl, ok: !!webhookUrl },
                ].map(field => (
                  <div key={field.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{field.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono truncate max-w-[200px]">{field.value || "—"}</span>
                      {field.ok
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Overall Status</span>
                    <Badge variant={[apiUrl, apiToken, instanceId, businessNumber].every(Boolean) ? "default" : "outline"}>
                      {[apiUrl, apiToken, instanceId, businessNumber].every(Boolean) ? "Ready to Connect" : "Not Configured"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Future integration guide */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Supported API Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {[
                    "WhatsApp Business API (Meta)",
                    "Twilio WhatsApp",
                    "MessageBird",
                    "WATI",
                    "AiSensy",
                    "Interakt",
                    "360dialog",
                    "Gupshup",
                  ].map(p => (
                    <div key={p} className="flex items-center gap-1.5">
                      <Circle className="w-2 h-2 shrink-0" />{p}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── CREATE / EDIT TEMPLATE DIALOG ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Template" : "New WhatsApp Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Sales Invoice" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Trigger Event <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. sales_invoice" value={formTrigger} onChange={e => setFormTrigger(e.target.value)} />
                <p className="text-xs text-muted-foreground">Unique key used to identify this template in the system</p>
              </div>
            </div>

            {/* Variable helper */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-500" />Click to insert variable
              </Label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-secondary/50 rounded-lg border border-border">
                {VARIABLES.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="text-xs bg-background border border-border rounded px-2 py-0.5 font-mono text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    title={`Insert ${v.label}`}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Message <span className="text-destructive">*</span></Label>
              <Textarea
                ref={el => setMessageRef(el)}
                rows={8}
                placeholder={"Dear {customer_name},\n\nThank you for shopping with {company_name}..."}
                value={formMessage}
                onChange={e => setFormMessage(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {formMessage.length} characters · Variables in {"{ }"} will be replaced with real values when sent
              </p>
            </div>

            {/* Live preview */}
            {formMessage && (
              <div className="space-y-2">
                <Label>Live Preview</Label>
                <div className="bg-[#dcf8c6] dark:bg-green-900/30 rounded-2xl rounded-tl-sm p-4 text-sm text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto border border-green-200 dark:border-green-800"
                  dangerouslySetInnerHTML={{ __html: renderPreview(formMessage) }} />
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Active Status</Label>
                <p className="text-xs text-muted-foreground">Template will be available for sending when active</p>
              </div>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createTemplate.isPending || updateTemplate.isPending}>
              {editingId ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PREVIEW DIALOG ── */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />{previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">
                  <span className={cn("w-2 h-2 rounded-full mr-1.5 inline-block", getCategoryMeta(previewTemplate.trigger).color)} />
                  {getCategoryMeta(previewTemplate.trigger).label}
                </Badge>
                <code className="text-xs bg-secondary px-2 py-0.5 rounded">{previewTemplate.trigger}</code>
                <Badge variant={previewTemplate.isActive ? "default" : "secondary"}>
                  {previewTemplate.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* WhatsApp chat bubble */}
              <div className="bg-[#e5ddd5] dark:bg-zinc-800 rounded-xl p-4">
                <div className="bg-[#dcf8c6] dark:bg-green-900/40 rounded-2xl rounded-tl-sm p-3 text-sm whitespace-pre-wrap max-h-72 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: renderPreview(previewTemplate.message) }} />
                <p className="text-right text-[10px] text-muted-foreground mt-1">
                  {new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })} ✓✓
                </p>
              </div>

              <p className="text-xs text-muted-foreground italic">
                Bold values are sample data — real values will be filled in when sent.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => copyMessage(previewTemplate?.message ?? "")} className="flex items-center gap-2">
              <Copy className="w-4 h-4" />Copy Message
            </Button>
            <Button onClick={() => { setTestSendTemplate(previewTemplate); setPreviewTemplate(null); }} className="flex items-center gap-2">
              <Send className="w-4 h-4" />Test Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TEST SEND DIALOG ── */}
      <Dialog open={!!testSendTemplate} onOpenChange={() => setTestSendTemplate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-green-500" />Test Send
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a test message using the "<span className="font-medium text-foreground">{testSendTemplate?.name}</span>" template.
            </p>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                placeholder="923001234567 (without + sign)"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Enter number with country code, e.g. 923001234567</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-300">
              ⚠️ WhatsApp API is not connected. Configure API settings to enable real message delivery.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestSendTemplate(null)}>Cancel</Button>
            <Button onClick={handleTestSend} className="flex items-center gap-2">
              <Send className="w-4 h-4" />Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ── */}
      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
