import { useState } from "react";
import { useListExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, getListExpensesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fmtPKR } from "@/lib/format";
import { format } from "date-fns";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().min(1, "Amount must be > 0"),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export default function Expenses() {
  const { data: expenses } = useListExpenses({ query: { queryKey: getListExpensesQueryKey() } });
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", amount: 0, category: "", date: new Date().toISOString().slice(0, 10), notes: "" }
  });

  const openAdd = () => {
    setEditingId(null);
    form.reset({ title: "", amount: 0, category: "", date: new Date().toISOString().slice(0, 10), notes: "" });
    setIsFormOpen(true);
  };

  const openEdit = (exp: any) => {
    setEditingId(exp.id);
    form.reset({ 
      title: exp.title, 
      amount: Number(exp.amount), 
      category: exp.category, 
      date: new Date(exp.date).toISOString().slice(0, 10),
      notes: exp.notes || ""
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingId) {
      updateExpense.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          setIsFormOpen(false);
          toast({ title: "Expense updated" });
        }
      });
    } else {
      createExpense.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          setIsFormOpen(false);
          toast({ title: "Expense created" });
        }
      });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteExpense.mutate({ id: deletingId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        setDeletingId(null);
        toast({ title: "Expense deleted" });
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Expense</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{format(new Date(e.date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">{e.category}</span></TableCell>
                  <TableCell>{fmtPKR(e.amount)}</TableCell>
                  <TableCell>{e.notes}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeletingId(e.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!expenses?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No expenses found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the expense.</AlertDialogDescription>
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
