import { useState } from "react";
import { useListCashCollections, useCreateCashCollection, useUpdateCashCollection, getListCashCollectionsQueryKey, useListEmployees } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { StatusBadge } from "@/components/ui/status-badge";
import { fmtPKR } from "@/lib/format";
import { format } from "date-fns";

const formSchema = z.object({
  employeeId: z.coerce.number().min(1, "Employee is required"),
  amount: z.coerce.number().min(1, "Amount must be > 0"),
  type: z.enum(["collected", "submitted"]),
  notes: z.string().optional(),
});

export default function CashCollections() {
  const { data: collections } = useListCashCollections({ query: { queryKey: getListCashCollectionsQueryKey() } });
  const { data: employees } = useListEmployees();

  const [isFormOpen, setIsFormOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createCollection = useCreateCashCollection();
  const updateCollection = useUpdateCashCollection();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { employeeId: 0, amount: 0, type: "collected", notes: "" }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createCollection.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCashCollectionsQueryKey() });
        setIsFormOpen(false);
        toast({ title: "Collection recorded" });
      }
    });
  };

  const handleSettle = (id: number) => {
    updateCollection.mutate({ id, data: { status: "settled" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCashCollectionsQueryKey() });
        toast({ title: "Marked as settled" });
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Cash Collections</h1>
        <Button onClick={() => { form.reset(); setIsFormOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Add Collection</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections?.map((c) => {
                const emp = employees?.find(e => e.id === c.employeeId);
                return (
                  <TableRow key={c.id}>
                    <TableCell>{format(new Date(c.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell className="font-medium">{emp ? emp.name : `Employee ${c.employeeId}`}</TableCell>
                    <TableCell>{fmtPKR(c.amount)}</TableCell>
                    <TableCell><StatusBadge status={c.type} /></TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>{c.notes}</TableCell>
                    <TableCell className="text-right">
                      {c.status === "pending" && (
                        <Button variant="outline" size="sm" onClick={() => handleSettle(c.id)}>Mark Settled</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!collections?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">No cash collections found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cash Collection</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="employeeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select value={field.value ? field.value.toString() : ""} onValueChange={(v) => field.onChange(Number(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {employees?.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="collected">Collected</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createCollection.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
