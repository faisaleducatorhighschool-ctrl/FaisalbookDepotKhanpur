import { useState, useCallback, useEffect } from "react";
import {
  useListWhatsappTemplates, useCreateWhatsappTemplate,
  useUpdateWhatsappTemplate, useDeleteWhatsappTemplate,
  getListWhatsappTemplatesQueryKey,
  useGetWhatsappStatus, getGetWhatsappStatusQueryKey,
  useSendWhatsappMessage,
  useGetWhatsappConfig, getGetWhatsappConfigQueryKey,
  useUpdateWhatsappConfig,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, Eye, Send, Search, Settings2,
  Download, CheckCircle2, Circle, Smartphone, Copy, RefreshCw, Zap, Save, Power,
  ScrollText, Megaphone, Languages
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

// Plain-text substitution used when actually sending a test message.
function renderPlain(message: string): string {
  let out = message;
  for (const v of VARIABLES) {
    out = out.replaceAll(v.key, v.sample);
  }
  return out;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function WhatsApp() {
  const { data: templates, isLoading } = useListWhatsappTemplates({ query: { queryKey: getListWhatsappTemplatesQueryKey() } });
  const createTemplate = useCreateWhatsappTemplate();
  const updateTemplate = useUpdateWhatsappTemplate();
  const deleteTemplate = useDeleteWhatsappTemplate();
  const { data: waStatus } = useGetWhatsappStatus({ query: { queryKey: getGetWhatsappStatusQueryKey() } });
  const sendMessage = useSendWhatsappMessage();
  const isConnected = waStatus?.configured ?? false;
  const { data: waConfig } = useGetWhatsappConfig({ query: { queryKey: getGetWhatsappConfigQueryKey() } });
  const updateConfig = useUpdateWhatsappConfig();
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
  const [formLanguage, setFormLanguage] = useState<"en" | "ur">("en");
  const [formBusinessType, setFormBusinessType] = useState("");
  const [messageRef, setMessageRef] = useState<HTMLTextAreaElement | null>(null);

  // ── Logs tab state ──
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logStatus, setLogStatus] = useState<"all" | "sent" | "failed">("all");
  const [logEntity, setLogEntity] = useState<"all" | "customer" | "supplier" | "manual">("all");
  const [logSearch, setLogSearch] = useState("");
  const [logStart, setLogStart] = useState("");
  const [logEnd, setLogEnd] = useState("");
  const [resendingId, setResendingId] = useState<number | null>(null);

  // ── Bulk reminders state ──
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAudience, setBulkAudience] = useState<"customer" | "supplier">("customer");
  const [bulkScope, setBulkScope] = useState<"outstanding" | "overdue">("outstanding");
  const [bulkSending, setBulkSending] = useState(false);

  // ── Default language config ──
  const [cfgDefaultLang, setCfgDefaultLang] = useState<"en" | "ur">("en");

  // ── Provider/automation config form ──
  const [cfgProvider, setCfgProvider] = useState<"meta" | "wasms" | "custom">("wasms");
  const [cfgMetaToken, setCfgMetaToken] = useState("");
  const [cfgMetaPhoneId, setCfgMetaPhoneId] = useState("");
  const [cfgMetaVersion, setCfgMetaVersion] = useState("v22.0");
  const [cfgWasmsKey, setCfgWasmsKey] = useState("");
  const [cfgWasmsId, setCfgWasmsId] = useState("");
  const [cfgCustomUrl, setCfgCustomUrl] = useState("");
  const [cfgCustomMethod, setCfgCustomMethod] = useState("POST");
  const [cfgCustomAuth, setCfgCustomAuth] = useState("");
  const [cfgCustomType, setCfgCustomType] = useState("application/json");
  const [cfgCustomBody, setCfgCustomBody] = useState('{"to":"{{to}}","message":"{{message}}"}');

  // Hydrate the form from the server config (non-secret fields only).
  useEffect(() => {
    if (!waConfig) return;
    setCfgProvider((waConfig.provider as "meta" | "wasms" | "custom") ?? "wasms");
    setCfgMetaPhoneId(waConfig.metaPhoneNumberId ?? "");
    setCfgMetaVersion(waConfig.metaApiVersion ?? "v22.0");
    setCfgWasmsId(waConfig.wasmsWhatsappId ?? "");
    setCfgCustomUrl(waConfig.customApiUrl ?? "");
    setCfgCustomMethod(waConfig.customApiMethod ?? "POST");
    setCfgCustomType(waConfig.customContentType ?? "application/json");
    setCfgCustomBody(waConfig.customBodyTemplate ?? '{"to":"{{to}}","message":"{{message}}"}');
    setCfgDefaultLang((((waConfig as any).defaultLanguage) as "en" | "ur") ?? "en");
  }, [waConfig]);

  const invalidateConfig = () => {
    queryClient.invalidateQueries({ queryKey: getGetWhatsappConfigQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetWhatsappStatusQueryKey() });
  };

  // Toggle the master automation switch (saves immediately).
  const toggleAutomation = (enabled: boolean) => {
    updateConfig.mutate({ data: { automationEnabled: enabled } }, {
      onSuccess: () => {
        invalidateConfig();
        toast({ title: enabled ? "Automation enabled" : "Automation disabled" });
      },
      onError: () => toast({ title: "Could not update automation", variant: "destructive" }),
    });
  };

  // Save provider selection + credentials. Secret fields are only sent when the
  // admin actually typed a new value, so blanks never wipe stored secrets.
  const saveConfig = () => {
    const data: Record<string, unknown> = {
      provider: cfgProvider,
      metaPhoneNumberId: cfgMetaPhoneId,
      metaApiVersion: cfgMetaVersion,
      wasmsWhatsappId: cfgWasmsId,
      customApiUrl: cfgCustomUrl,
      customApiMethod: cfgCustomMethod,
      customContentType: cfgCustomType,
      customBodyTemplate: cfgCustomBody,
      defaultLanguage: cfgDefaultLang,
    };
    if (cfgMetaToken.trim()) data.metaAccessToken = cfgMetaToken.trim();
    if (cfgWasmsKey.trim()) data.wasmsApiKey = cfgWasmsKey.trim();
    if (cfgCustomAuth.trim()) data.customAuthHeader = cfgCustomAuth.trim();
    updateConfig.mutate({ data: data as any }, {
      onSuccess: () => {
        invalidateConfig();
        setCfgMetaToken(""); setCfgWasmsKey(""); setCfgCustomAuth("");
        toast({ title: "WhatsApp settings saved" });
      },
      onError: () => toast({ title: "Could not save settings", variant: "destructive" }),
    });
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
    setFormLanguage("en"); setFormBusinessType("");
    setFormOpen(true);
  };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setFormName(t.name); setFormTrigger(t.trigger); setFormMessage(t.message); setFormActive(t.isActive ?? true);
    setFormLanguage(((t as any).language as "en" | "ur") ?? "en");
    setFormBusinessType((t as any).businessType ?? "");
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

    const data = {
      name: formName,
      trigger: formTrigger,
      message: formMessage,
      isActive: formActive,
      language: formLanguage,
      businessType: formBusinessType.trim() || null,
    } as any;

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

  // ── WhatsApp send logs ──
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const token = localStorage.getItem("erp_token");
      const params = new URLSearchParams();
      if (logStatus !== "all") params.set("status", logStatus);
      if (logEntity !== "all") params.set("entityType", logEntity);
      if (logSearch.trim()) params.set("search", logSearch.trim());
      if (logStart) params.set("startDate", logStart);
      if (logEnd) params.set("endDate", logEnd);
      params.set("limit", "200");
      const res = await fetch(`/api/whatsapp/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Failed to load logs", variant: "destructive" });
    } finally {
      setLogsLoading(false);
    }
  }, [logStatus, logEntity, logSearch, logStart, logEnd, toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const resendLog = async (id: number) => {
    setResendingId(id);
    try {
      const token = localStorage.getItem("erp_token");
      const res = await fetch(`/api/whatsapp/logs/${id}/resend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Message resent ✓", description: data.message });
      } else {
        toast({ title: "Resend failed", description: data.message, variant: "destructive" });
      }
      fetchLogs();
    } catch {
      toast({ title: "Resend failed", variant: "destructive" });
    } finally {
      setResendingId(null);
    }
  };

  // ── Bulk reminders ──
  const sendBulkReminders = async () => {
    setBulkSending(true);
    try {
      const token = localStorage.getItem("erp_token");
      const res = await fetch("/api/whatsapp/bulk-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ audience: bulkAudience, scope: bulkScope }),
      });
      const data = await res.json();
      toast({
        title: "Bulk reminders processed",
        description: `Total ${data.total ?? 0} · Sent ${data.sent ?? 0} · Failed ${data.failed ?? 0} · Skipped ${data.skipped ?? 0}`,
      });
      setBulkOpen(false);
      fetchLogs();
    } catch {
      toast({ title: "Bulk reminders failed", variant: "destructive" });
    } finally {
      setBulkSending(false);
    }
  };

  const copyMessage = (msg: string) => {
    navigator.clipboard.writeText(msg);
    toast({ title: "Message copied to clipboard" });
  };

  const handleTestSend = () => {
    if (!testPhone.trim()) { toast({ title: "Enter a phone number", variant: "destructive" }); return; }
    if (!isConnected) {
      toast({
        title: "WhatsApp not connected",
        description: "Choose a provider and enter its credentials in API Settings to enable real sending.",
        variant: "destructive",
      });
      return;
    }
    const message = renderPlain(testSendTemplate?.message ?? "");
    sendMessage.mutate(
      { data: { phone: testPhone, message } },
      {
        onSuccess: (res) => {
          if (res.success) {
            toast({ title: "Message sent ✓", description: res.message || `Sent to ${testPhone}` });
            setTestSendTemplate(null);
            setTestPhone("");
          } else {
            toast({ title: "Send failed", description: res.message || "The gateway rejected the message.", variant: "destructive" });
          }
        },
        onError: () => {
          toast({ title: "Send failed", description: "Could not reach the WhatsApp gateway. Check your credentials and that your number is connected on WaSMS.", variant: "destructive" });
        },
      },
    );
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
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} className="flex items-center gap-1.5">
            <Megaphone className="w-4 h-4" />Bulk Reminders
          </Button>
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
          <TabsTrigger value="logs" className="flex items-center gap-1.5">
            <ScrollText className="w-4 h-4" />Logs
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
                        <TableHead>Lang</TableHead>
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
                              <Badge variant="secondary" className="text-[10px] uppercase">
                                {((t as any).language as string) ?? "en"}
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
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading templates...</TableCell>
                        </TableRow>
                      )}
                      {!isLoading && !filtered?.length && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
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

        {/* ── LOGS TAB ── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          {/* Bulk reminders card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />Bulk Reminders
              </CardTitle>
              <CardDescription>
                Send outstanding / overdue reminders to all customers or suppliers in one click.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Audience</Label>
                  <Select value={bulkAudience} onValueChange={(v) => setBulkAudience(v as "customer" | "supplier")}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="supplier">Suppliers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Scope</Label>
                  <Select value={bulkScope} onValueChange={(v) => setBulkScope(v as "outstanding" | "overdue")}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outstanding">Outstanding</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={sendBulkReminders} disabled={bulkSending} className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4" />{bulkSending ? "Sending..." : "Send Reminders"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={logStatus} onValueChange={(v) => setLogStatus(v as "all" | "sent" | "failed")}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Entity</Label>
                  <Select value={logEntity} onValueChange={(v) => setLogEntity(v as "all" | "customer" | "supplier" | "manual")}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <Label className="text-xs">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search recipient, phone, message..."
                      value={logSearch}
                      onChange={e => setLogSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={logStart} onChange={e => setLogStart(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={logEnd} onChange={e => setLogEnd(e.target.value)} className="w-40" />
                </div>
                <Button variant="outline" size="icon" onClick={() => fetchLogs()} title="Refresh">
                  <RefreshCw className={cn("w-4 h-4", logsLoading && "animate-spin")} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logs table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString("en-PK") : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{log.recipientName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{log.phone}</div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-secondary px-1.5 py-0.5 rounded whitespace-nowrap">{log.trigger}</code>
                      </TableCell>
                      <TableCell className="text-sm">{log.templateName || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "whitespace-nowrap",
                          log.status === "sent"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-100"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-100"
                        )}>
                          {log.status}
                        </Badge>
                        {log.status === "failed" && log.error && (
                          <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px] truncate" title={log.error}>
                            {log.error}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{log.provider || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Resend"
                          disabled={resendingId === log.id}
                          onClick={() => resendLog(log.id)}
                        >
                          <RefreshCw className={cn("w-4 h-4", resendingId === log.id && "animate-spin")} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {logsLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading logs...</TableCell>
                    </TableRow>
                  )}
                  {!logsLoading && !logs.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <ScrollText className="w-10 h-10 opacity-20" />
                          <p>No WhatsApp logs match your filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── API SETTINGS TAB ── */}
        <TabsContent value="api-settings" className="mt-4">
          <div className="max-w-2xl space-y-6">
            {/* Master automation switch */}
            <Card className={cn(
              "border-2",
              waConfig?.automationEnabled
                ? "border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                : "border-border"
            )}>
              <CardContent className="pt-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Power className={cn("w-5 h-5 mt-0.5 shrink-0", waConfig?.automationEnabled ? "text-green-600" : "text-muted-foreground")} />
                  <div>
                    <p className="font-semibold text-sm">Automatic WhatsApp Notifications</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      When ON, the system automatically sends WhatsApp messages for business events
                      (new sale, order updates, returns, customer registration) — only to
                      <span className="font-medium text-foreground"> registered customers who have a mobile number</span>.
                      Walk-in customers are never messaged. Each event can be turned on/off individually in the Templates tab.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={waConfig?.automationEnabled ?? false}
                  onCheckedChange={toggleAutomation}
                  disabled={updateConfig.isPending}
                />
              </CardContent>
            </Card>

            {/* Live connection status */}
            <Card className={isConnected
              ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
              : "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30"}>
              <CardContent className="pt-4 flex items-start gap-3">
                {isConnected
                  ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  : <div className="mt-0.5 text-yellow-600 shrink-0">⚠️</div>}
                <div className={cn("text-sm", isConnected ? "text-green-800 dark:text-green-300" : "text-yellow-800 dark:text-yellow-300")}>
                  <p className="font-semibold">
                    {isConnected ? `WhatsApp Connected via ${waStatus?.provider}` : "WhatsApp Not Connected"}
                  </p>
                  <p className="mt-0.5">
                    {isConnected
                      ? "Your gateway is configured. Use Test Send on any template to deliver real WhatsApp messages."
                      : "Real sending is disabled until you select a provider and enter its credentials below."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Provider configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />WhatsApp Provider
                </CardTitle>
                <CardDescription>
                  Choose how messages are delivered and enter the credentials. Everything is configured here — no code changes needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={cfgProvider} onValueChange={(v) => setCfgProvider(v as "meta" | "wasms" | "custom")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta">Meta WhatsApp Cloud API (recommended)</SelectItem>
                      <SelectItem value="wasms">WaSMS Gateway</SelectItem>
                      <SelectItem value="custom">Custom API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-muted-foreground" />Default Language
                  </Label>
                  <Select value={cfgDefaultLang} onValueChange={(v) => setCfgDefaultLang(v as "en" | "ur")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ur">Urdu</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Used to pick the right template language when sending automatic messages.
                  </p>
                </div>

                {/* META fields */}
                {cfgProvider === "meta" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Access Token <span className="text-destructive">*</span></Label>
                      <Input
                        type="password"
                        placeholder={waConfig?.metaTokenConfigured ? "•••••••• (saved — leave blank to keep)" : "Permanent access token from Meta"}
                        value={cfgMetaToken}
                        onChange={e => setCfgMetaToken(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone Number ID <span className="text-destructive">*</span></Label>
                        <Input placeholder="e.g. 123456789012345" value={cfgMetaPhoneId} onChange={e => setCfgMetaPhoneId(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>API Version</Label>
                        <Input placeholder="v22.0" value={cfgMetaVersion} onChange={e => setCfgMetaVersion(e.target.value)} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get these from Meta → Business → WhatsApp → API Setup. Use a permanent (System User) token for production.
                    </p>
                  </div>
                )}

                {/* WASMS fields */}
                {cfgProvider === "wasms" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>API Key <span className="text-destructive">*</span></Label>
                      <Input
                        type="password"
                        placeholder={waConfig?.wasmsKeyConfigured ? "•••••••• (saved — leave blank to keep)" : "WaSMS API key"}
                        value={cfgWasmsKey}
                        onChange={e => setCfgWasmsKey(e.target.value)}
                      />
                      {waConfig?.envFallbackActive && (
                        <p className="text-xs text-muted-foreground">A server-side WASMS_API_KEY is also present and will be used as a fallback.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp Account ID (optional)</Label>
                      <Input placeholder="Leave empty to use your default connected number" value={cfgWasmsId} onChange={e => setCfgWasmsId(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Log in to wasms.net, connect your number (QR), then create an API key with the "Send Messages" scope.
                    </p>
                  </div>
                )}

                {/* CUSTOM fields */}
                {cfgProvider === "custom" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label>API URL <span className="text-destructive">*</span></Label>
                        <Input placeholder="https://api.example.com/send" value={cfgCustomUrl} onChange={e => setCfgCustomUrl(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Method</Label>
                        <Select value={cfgCustomMethod} onValueChange={setCfgCustomMethod}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="GET">GET</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Authorization Header (optional)</Label>
                      <Input
                        type="password"
                        placeholder={waConfig?.customAuthConfigured ? "•••••••• (saved — leave blank to keep)" : "e.g. Bearer your-token"}
                        value={cfgCustomAuth}
                        onChange={e => setCfgCustomAuth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Content-Type</Label>
                      <Input placeholder="application/json" value={cfgCustomType} onChange={e => setCfgCustomType(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Request Body Template</Label>
                      <Textarea
                        rows={4}
                        className="font-mono text-xs"
                        value={cfgCustomBody}
                        onChange={e => setCfgCustomBody(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use <code className="bg-secondary px-1 rounded">{"{{to}}"}</code> for the phone number and
                        <code className="bg-secondary px-1 rounded ml-1">{"{{message}}"}</code> for the message text.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-border">
                  <Button onClick={saveConfig} disabled={updateConfig.isPending} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />{updateConfig.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Status detail */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Connection Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Provider</span>
                  <span className="text-xs font-mono">{waStatus?.provider ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Credentials</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{isConnected ? "Configured" : "Not set"}</span>
                    {isConnected
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Automation</span>
                  <Badge variant={waConfig?.automationEnabled ? "default" : "outline"}>
                    {waConfig?.automationEnabled ? "ON" : "OFF"}
                  </Badge>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Overall Status</span>
                    <Badge variant={isConnected ? "default" : "outline"}>
                      {isConnected ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-muted-foreground" />Language
                </Label>
                <Select value={formLanguage} onValueChange={(v) => setFormLanguage(v as "en" | "ur")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ur">Urdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Business Type <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input placeholder="e.g. retail, pharmacy" value={formBusinessType} onChange={e => setFormBusinessType(e.target.value)} />
              </div>
            </div>

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
            {isConnected ? (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-xs text-green-800 dark:text-green-300">
                ✅ WhatsApp is connected via WaSMS. A real message will be sent. Variables are filled with sample values for the test.
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-300">
                ⚠️ WhatsApp is not connected. Add your WaSMS API key in API Settings to enable real message delivery.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestSendTemplate(null)}>Cancel</Button>
            <Button onClick={handleTestSend} disabled={sendMessage.isPending} className="flex items-center gap-2">
              <Send className="w-4 h-4" />{sendMessage.isPending ? "Sending..." : "Send Test"}
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

      {/* ── BULK REMINDERS DIALOG ── */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />Bulk Reminders
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send outstanding / overdue reminders to all customers or suppliers in one click.
            </p>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={bulkAudience} onValueChange={(v) => setBulkAudience(v as "customer" | "supplier")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="supplier">Suppliers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={bulkScope} onValueChange={(v) => setBulkScope(v as "outstanding" | "overdue")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outstanding">Outstanding</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={sendBulkReminders} disabled={bulkSending} className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />{bulkSending ? "Sending..." : "Send Reminders"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
