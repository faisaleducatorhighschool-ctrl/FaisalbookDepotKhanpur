import { useState } from "react";
import { useListInventoryMovements, useCreateInventoryMovement, useGetInventorySummary, useListProducts, getListInventoryMovementsQueryKey, getGetInventorySummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Barcode } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";

const formSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  type: z.enum(["stock_in", "stock_out", "adjustment", "transfer"]),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

export default function Inventory() {
  const { data: movements } = useListInventoryMovements({}, { query: { queryKey: getListInventoryMovementsQueryKey() } });
  const { data: summary } = useGetInventorySummary({ query: { queryKey: getGetInventorySummaryQueryKey() } });
  const { data: products } = useListProducts();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [summarySearch, setSummarySearch] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMovement = useCreateInventoryMovement();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { productId: 0, type: "stock_in", quantity: 1, notes: "" }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createMovement.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
        setIsFormOpen(false);
        toast({ title: "Movement recorded" });
      }
    });
  };

  const filteredMovements = movements?.filter(m => filterType === "all" || m.type === filterType);

  const filteredSummary = products?.filter(p => {
    if (!summarySearch) return true;
    const q = summarySearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <Button onClick={() => { form.reset(); setIsFormOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Add Movement</Button>
      </div>

      <Tabs defaultValue="movements">
        <TabsList>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="summary">Stock Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="movements">
          <Card>
            <CardHeader className="pb-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="stock_in">Stock In</SelectItem>
                  <SelectItem value="stock_out">Stock Out</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements?.map((m) => {
                    const prod = products?.find(p => p.id === m.productId);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>{format(new Date(m.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                        <TableCell className="font-medium">
                          <div>{prod?.name || `Product #${m.productId}`}</div>
                          {prod?.barcode && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono mt-0.5">
                              <Barcode className="w-3 h-3" />{prod.barcode}
                            </div>
                          )}
                        </TableCell>
                        <TableCell><StatusBadge status={m.type} /></TableCell>
                        <TableCell className={m.type === 'stock_out' ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}>
                          {m.type === 'stock_out' ? '-' : '+'}{m.quantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{m.notes}</TableCell>
                      </TableRow>
                    );
                  })}
                  {!filteredMovements?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">No movements found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, SKU or barcode..."
                  value={summarySearch}
                  onChange={e => setSummarySearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummary?.map((p) => {
                    const stockStatus = p.stock === 0 ? "out_of_stock" : (p.stock <= (p.lowStockLimit || 5) ? "low_stock" : "in_stock");
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell>
                          {p.barcode
                            ? <span className="inline-flex items-center gap-1 font-mono text-xs bg-secondary px-2 py-0.5 rounded"><Barcode className="w-3 h-3" />{p.barcode}</span>
                            : <span className="text-muted-foreground text-xs">—</span>
                          }
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.categoryName || p.categoryId || "—"}</TableCell>
                        <TableCell className="font-medium">{p.stock}</TableCell>
                        <TableCell><StatusBadge status={stockStatus} /></TableCell>
                      </TableRow>
                    );
                  })}
                  {!filteredSummary?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">No products found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Inventory Movement</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="productId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select value={field.value ? field.value.toString() : ""} onValueChange={(val) => field.onChange(Number(val))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {products?.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} ({p.stock} in stock){p.barcode ? ` · ${p.barcode}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="stock_in">Stock In (+)</SelectItem>
                      <SelectItem value="stock_out">Stock Out (-)</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createMovement.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
