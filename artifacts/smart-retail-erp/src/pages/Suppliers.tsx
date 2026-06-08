import { useState } from "react";
import { useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, getListSuppliersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fmtPKR } from "@/lib/format";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export default function Suppliers() {
  const { data: suppliers } = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", company: "", phone: "", email: "", address: "" }
  });

  const openAdd = () => {
    setEditingId(null);
    form.reset({ name: "", company: "", phone: "", email: "", address: "" });
    setIsFormOpen(true);
  };

  const openEdit = (supplier: any) => {
    setEditingId(supplier.id);
    form.reset({ name: supplier.name, company: supplier.company || "", phone: supplier.phone || "", email: supplier.email || "", address: supplier.address || "" });
    setIsFormOpen(true);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingId) {
      updateSupplier.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
          setIsFormOpen(false);
          toast({ title: "Supplier updated" });
        }
      });
    } else {
      createSupplier.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
          setIsFormOpen(false);
          toast({ title: "Supplier created" });
        }
      });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteSupplier.mutate({ id: deletingId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        setDeletingId(null);
        toast({ title: "Supplier deleted" });
      }
    });
  };

  const filtered = suppliers?.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Supplier</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name or company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.company}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell className={Number(c.balance) > 0 ? "text-red-500 font-medium" : ""}>{fmtPKR(c.balance)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeletingId(c.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">No suppliers found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="company" render={({ field }) => (
                <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the supplier.</AlertDialogDescription>
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
