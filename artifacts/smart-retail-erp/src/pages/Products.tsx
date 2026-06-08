import {
  useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useListCategories, useListBrands, getListProductsQueryKey,
  useListPublisherSeries, useListBookClasses, useListBookSubjects,
  useListSubcategories, useListBranches,
} from "@workspace/api-client-react";
import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Search, Edit, Trash2, Barcode, RefreshCw, PackageX, Download, Upload, BookOpen, ImageIcon, X, Loader2 } from "lucide-react";
import { fmtPKR } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const UNITS = ["PCS", "Unit", "Box", "Carton", "Pack", "Dozen", "KG", "GM", "LTR", "ML", "Meter", "Foot"];

const COPY_PAGE_OPTIONS = ["20", "40", "60", "80", "96", "100", "120", "144", "160", "200"];
const REGISTER_PAGE_OPTIONS = ["60", "80", "100", "120", "150", "200", "250", "300", "350", "400", "500"];

function getCallNumberOptions(subCategoryName?: string): string[] | null {
  if (!subCategoryName) return null;
  if (subCategoryName === "Copies") return COPY_PAGE_OPTIONS;
  if (subCategoryName === "Registers") return REGISTER_PAGE_OPTIONS;
  return null;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  isbn: z.string().optional(),
  categoryId: z.coerce.number().min(1, "Category is required"),
  subCategoryId: z.coerce.number().optional(),
  branchId: z.coerce.number().optional(),
  callNumber: z.string().optional(),
  brandId: z.coerce.number().min(0),
  seriesId: z.coerce.number().optional(),
  classId: z.coerce.number().optional(),
  subjectId: z.coerce.number().optional(),
  author: z.string().optional(),
  edition: z.string().optional(),
  costPrice: z.coerce.number().min(0, "Must be >= 0"),
  salePrice: z.coerce.number().min(0, "Must be >= 0"),
  discountPrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0, "Must be >= 0"),
  lowStockLimit: z.coerce.number().min(0, "Must be >= 0"),
  unit: z.string().min(1, "Unit is required"),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  batchNumber: z.string().optional(),
  mfgDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof formSchema>;

function generateEan13(): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return [...digits, check].join("");
}

function expiryBadge(expiryDate?: string | null) {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  const days = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (days < 0) return <Badge variant="destructive" className="text-[10px] px-1.5">Expired</Badge>;
  if (days <= 7)  return <Badge className="text-[10px] px-1.5 bg-orange-500 hover:bg-orange-600">≤7d</Badge>;
  if (days <= 30) return <Badge className="text-[10px] px-1.5 bg-yellow-500 hover:bg-yellow-600 text-white">≤30d</Badge>;
  return <Badge variant="secondary" className="text-[10px] px-1.5">{days}d</Badge>;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

function ImageUploadField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError("File size must be 5 MB or less.");
      return;
    }
    setIsUploading(true);
    try {
      const token = localStorage.getItem("erp_token");
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadURL, objectPath } = await res.json();
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");
      onChange(`/api/storage${objectPath}`);
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed");
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [onChange, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileRef.current?.click()}
        className={[
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
          isUploading ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs">Uploading…</span>
          </div>
        ) : value ? (
          <div className="flex items-center gap-3">
            <img src={value} alt="Preview" className="h-16 w-16 rounded object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div className="text-xs text-muted-foreground">
              <p>Click or drag to replace image</p>
              <p className="text-[10px] mt-0.5">JPEG, PNG, WebP · max 5 MB</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <ImageIcon className="h-7 w-7 opacity-40" />
            <p className="text-xs font-medium">Drop image here or click to browse</p>
            <p className="text-[10px]">JPEG, PNG, WebP · max 5 MB</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
      </div>
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      {/* URL fallback */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">or paste URL</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="flex gap-2 items-center">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/product-image.jpg"
          className="text-xs"
        />
        {value && (
          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => onChange("")}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Products() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [tab, setTab] = useState<"all" | "books">("all");
  const { data: products } = useListProducts({}, { query: { queryKey: getListProductsQueryKey() } });
  const { data: categories } = useListCategories();
  const { data: brands } = useListBrands();
  const { data: publisherSeries } = useListPublisherSeries({});
  const { data: bookClasses } = useListBookClasses();
  const { data: bookSubjects } = useListBookSubjects();
  const { data: subcategories } = useListSubcategories({});
  const { data: branches } = useListBranches();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const defaultValues: FormValues = {
    name: "", sku: "", barcode: "", isbn: "", categoryId: 0, brandId: 0,
    subCategoryId: undefined, branchId: undefined, callNumber: "",
    seriesId: undefined, classId: undefined, subjectId: undefined,
    author: "", edition: "", costPrice: 0, salePrice: 0, discountPrice: undefined,
    stock: 0, lowStockLimit: 0, unit: "PCS", imageUrl: "", description: "",
    batchNumber: "", mfgDate: "", expiryDate: "", status: "active",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const selectedBrandId = form.watch("brandId");
  const filteredSeries = publisherSeries?.filter(s => !selectedBrandId || s.brandId === selectedBrandId);

  const selectedCategoryId = form.watch("categoryId");
  const filteredSubcategories = subcategories?.filter(s => !selectedCategoryId || s.categoryId === selectedCategoryId);
  const selectedSubCategoryId = form.watch("subCategoryId");
  const selectedSubCategoryName = subcategories?.find(s => s.id === selectedSubCategoryId)?.name;
  const callNumberOptions = getCallNumberOptions(selectedSubCategoryName);

  const openAdd = () => {
    setEditingId(null);
    form.reset(defaultValues);
    setIsFormOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingId(product.id);
    form.reset({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || "",
      isbn: product.isbn || "",
      categoryId: product.categoryId || 0,
      subCategoryId: product.subCategoryId || undefined,
      branchId: product.branchId || undefined,
      callNumber: product.callNumber || "",
      brandId: product.brandId || 0,
      seriesId: product.seriesId || undefined,
      classId: product.classId || undefined,
      subjectId: product.subjectId || undefined,
      author: product.author || "",
      edition: product.edition || "",
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      discountPrice: product.discountPrice ? Number(product.discountPrice) : undefined,
      stock: product.stock,
      lowStockLimit: product.lowStockLimit || 0,
      unit: product.unit || "PCS",
      imageUrl: product.imageUrl || "",
      description: product.description || "",
      batchNumber: product.batchNumber || "",
      mfgDate: product.mfgDate || "",
      expiryDate: product.expiryDate || "",
      status: product.status as "active" | "inactive",
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const duplicate = products?.find(p =>
      data.barcode && p.barcode === data.barcode && p.id !== editingId
    );
    if (duplicate) {
      toast({ title: "Duplicate barcode", description: `Barcode already used by "${duplicate.name}"`, variant: "destructive" });
      return;
    }

    const sharedFields = {
      ...data,
      barcode: data.barcode || undefined,
      isbn: data.isbn || undefined,
      author: data.author || undefined,
      edition: data.edition || undefined,
      seriesId: data.seriesId || undefined,
      classId: data.classId || undefined,
      subjectId: data.subjectId || undefined,
      subCategoryId: data.subCategoryId || undefined,
      branchId: data.branchId || undefined,
      callNumber: data.callNumber || undefined,
      brandId: data.brandId || undefined,
      batchNumber: data.batchNumber || undefined,
      mfgDate: data.mfgDate || undefined,
      expiryDate: data.expiryDate || undefined,
      description: data.description || undefined,
      discountPrice: data.discountPrice ?? undefined,
    };

    if (editingId) {
      const updatePayload = {
        ...sharedFields,
        imageUrl: data.imageUrl,
        // Send null (not undefined) so cleared master-data fields are removed on PATCH
        subCategoryId: data.subCategoryId ?? null,
        branchId: data.branchId ?? null,
        callNumber: data.callNumber ? data.callNumber : null,
      };
      updateProduct.mutate({ id: editingId, data: updatePayload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setIsFormOpen(false);
          toast({ title: "Product updated" });
        }
      });
    } else {
      const createPayload = {
        ...sharedFields,
        imageUrl: data.imageUrl || undefined,
      };
      createProduct.mutate({ data: createPayload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setIsFormOpen(false);
          toast({ title: "Product created" });
        }
      });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteProduct.mutate({ id: deletingId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDeletingId(null);
        toast({ title: "Product deleted" });
      }
    });
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("erp_token");
      const res = await fetch("/api/products/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const token = localStorage.getItem("erp_token");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Import failed");
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      toast({
        title: `Import complete — ${result.imported} imported, ${result.skipped} skipped`,
        description: result.errors?.length ? result.errors.slice(0, 3).join("; ") : undefined,
      });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const filtered = products?.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      ((p as any).isbn && (p as any).isbn.toLowerCase().includes(q)) ||
      ((p as any).author && (p as any).author.toLowerCase().includes(q));
    const matchCategory = categoryId === "all" || (p.categoryId?.toString() ?? "") === categoryId;
    const matchStatus = status === "all" || p.status === status;
    const matchTab = tab === "all" || (tab === "books" && ((p as any).classId || (p as any).isbn || (p as any).author));
    return matchSearch && matchCategory && matchStatus && matchTab;
  });

  const isBook = (p: any) => p.classId || p.isbn || p.author || p.seriesId;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" /> Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => importRef.current?.click()} disabled={isImporting}>
            <Upload className="w-4 h-4 mr-1.5" /> {isImporting ? "Importing..." : "Import Excel"}
          </Button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "books")}>
            <TabsList>
              <TabsTrigger value="all">All Products</TabsTrigger>
              <TabsTrigger value="books"><BookOpen className="w-3.5 h-3.5 mr-1.5" />Books / Textbooks</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, SKU, barcode, ISBN, author…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Book Info</TableHead>
                <TableHead>SKU / Barcode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((p) => {
                const cat = categories?.find((c) => c.id === p.categoryId)?.name;
                const stockStatus = p.stock === 0 ? "out_of_stock" : (p.stock <= (p.lowStockLimit || 5) ? "low_stock" : "in_stock");
                const pa = p as any;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span>{p.name}</span>
                        {isBook(pa) && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {pa.className && <Badge variant="secondary" className="text-[10px] px-1.5">{pa.className}</Badge>}
                            {pa.subjectName && <Badge variant="outline" className="text-[10px] px-1.5">{pa.subjectName}</Badge>}
                            {pa.author && <span className="text-xs text-muted-foreground">by {pa.author}</span>}
                            {pa.edition && <span className="text-xs text-muted-foreground">{pa.edition}</span>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs">{p.sku}</span>
                        {p.barcode && (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                            <Barcode className="w-3 h-3" />{p.barcode}
                          </span>
                        )}
                        {pa.isbn && (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                            <BookOpen className="w-3 h-3" />{pa.isbn}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{cat}</span>
                        {pa.subCategoryName && <span className="text-xs text-muted-foreground">{pa.subCategoryName}{pa.callNumber ? ` · ${pa.callNumber}` : ""}</span>}
                        {pa.branchName && <span className="text-xs text-muted-foreground">{pa.branchName}</span>}
                        {pa.brandName && <span className="text-xs text-muted-foreground">{pa.brandName}</span>}
                        {pa.seriesName && <span className="text-xs text-muted-foreground italic">{pa.seriesName}</span>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{(p as any).unit || "PCS"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{fmtPKR(p.salePrice)}</span>
                        <span className="text-xs text-muted-foreground">Cost: {fmtPKR(p.costPrice)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{p.stock}</span>
                        <StatusBadge status={stockStatus} />
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeletingId(p.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!filtered?.length && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">No products found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* Basic Info */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="sku" render={({ field }) => (
                    <FormItem><FormLabel>SKU *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="barcode" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Barcode className="w-3.5 h-3.5" /> Barcode <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">Optional</Badge>
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input {...field} placeholder="Enter or scan barcode" className="font-mono" />
                        </FormControl>
                        <Button type="button" variant="outline" size="icon" title="Auto-generate EAN-13" onClick={() => field.onChange(generateEan13())}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select value={field.value ? field.value.toString() : ""} onValueChange={(val) => { field.onChange(Number(val)); form.setValue("subCategoryId", undefined); form.setValue("callNumber", ""); }}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {categories?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="subCategoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Category</FormLabel>
                      <Select
                        value={field.value ? field.value.toString() : "0"}
                        onValueChange={(val) => { field.onChange(val === "0" ? undefined : Number(val)); form.setValue("callNumber", ""); }}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Select sub category..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          {filteredSubcategories?.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="branchId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select
                        value={field.value ? field.value.toString() : "0"}
                        onValueChange={(val) => field.onChange(val === "0" ? undefined : Number(val))}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Select branch..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          {branches?.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="callNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Call Number <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">Optional</Badge>
                      </FormLabel>
                      {callNumberOptions ? (
                        <Select value={field.value || "0"} onValueChange={(val) => field.onChange(val === "0" ? "" : val)}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select pages..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            {callNumberOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt} pages</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <FormControl><Input {...field} placeholder="e.g. shelf / call number" /></FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="brandId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publisher / Brand</FormLabel>
                      <Select value={field.value ? field.value.toString() : "0"} onValueChange={(val) => { field.onChange(Number(val)); form.setValue("seriesId", undefined); }}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          {brands?.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="seriesId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Series</FormLabel>
                      <Select
                        value={field.value ? field.value.toString() : "0"}
                        onValueChange={(val) => field.onChange(val === "0" ? undefined : Number(val))}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Select series..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          {filteredSeries?.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Book Info */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />Book / Textbook Fields
                  <Badge variant="secondary" className="text-[10px] px-1.5 font-normal">Optional — leave blank for non-books</Badge>
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="classId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select
                        value={field.value ? field.value.toString() : "0"}
                        onValueChange={(val) => field.onChange(val === "0" ? undefined : Number(val))}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Select class..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          {bookClasses?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="subjectId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select
                        value={field.value ? field.value.toString() : "0"}
                        onValueChange={(val) => field.onChange(val === "0" ? undefined : Number(val))}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Select subject..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          {bookSubjects?.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isbn" render={({ field }) => (
                    <FormItem><FormLabel>ISBN</FormLabel><FormControl><Input {...field} placeholder="e.g. 978-0-19-..." className="font-mono" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="edition" render={({ field }) => (
                    <FormItem><FormLabel>Edition</FormLabel><FormControl><Input {...field} placeholder="e.g. 2024 Edition" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="author" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Author(s)</FormLabel><FormControl><Input {...field} placeholder="e.g. Dr. A. Hamid Naseem" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Pricing & Stock */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pricing & Stock</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="costPrice" render={({ field }) => (
                    <FormItem><FormLabel>Cost Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="salePrice" render={({ field }) => (
                    <FormItem><FormLabel>Sale Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="discountPrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Discount Price <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">Optional</Badge>
                      </FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="Leave blank for no discount" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="stock" render={({ field }) => (
                    <FormItem><FormLabel>Initial Stock</FormLabel><FormControl><Input type="number" {...field} disabled={!!editingId} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="lowStockLimit" render={({ field }) => (
                    <FormItem><FormLabel>Low Stock Limit</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="unit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Image & Description */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Store Listing</p>
                <div className="space-y-4">
                  <FormField control={form.control} name="imageUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Product Image <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">Optional</Badge>
                      </FormLabel>
                      <FormControl>
                        <ImageUploadField value={field.value ?? ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Description <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">Optional</Badge>
                      </FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={3}
                          placeholder="Brief product description shown in the online store..."
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Batch & Expiry */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <PackageX className="w-3.5 h-3.5" />Batch & Expiry Management
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="batchNumber" render={({ field }) => (
                    <FormItem><FormLabel>Batch Number</FormLabel><FormControl><Input {...field} placeholder="e.g. B2024-001" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="mfgDate" render={({ field }) => (
                    <FormItem><FormLabel>Mfg. Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="expiryDate" render={({ field }) => (
                    <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                  {(createProduct.isPending || updateProduct.isPending) ? "Saving..." : "Save Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the product.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
