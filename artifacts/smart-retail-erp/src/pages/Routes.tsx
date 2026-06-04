import { useState } from "react";
import { useListRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute, getListRoutesQueryKey, useListEmployees } from "@workspace/api-client-react";
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
import { format } from "date-fns";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  area: z.string().min(1, "Area is required"),
  vehicle: z.string().optional(),
  employeeId: z.coerce.number().optional(),
  deliveryDate: z.string().optional(),
});

export default function Routes() {
  const { data: routes } = useListRoutes({ query: { queryKey: getListRoutesQueryKey() } });
  const { data: employees } = useListEmployees();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createRoute = useCreateRoute();
  const updateRoute = useUpdateRoute();
  const deleteRoute = useDeleteRoute();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", area: "", vehicle: "", employeeId: undefined, deliveryDate: "" }
  });

  const openAdd = () => {
    setEditingId(null);
    form.reset({ name: "", area: "", vehicle: "", employeeId: undefined, deliveryDate: "" });
    setIsFormOpen(true);
  };

  const openEdit = (rt: any) => {
    setEditingId(rt.id);
    form.reset({ 
      name: rt.name, 
      area: rt.area || "", 
      vehicle: rt.vehicle || "", 
      employeeId: rt.employeeId || undefined,
      deliveryDate: rt.deliveryDate ? new Date(rt.deliveryDate).toISOString().slice(0, 10) : "",
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const payload = { ...data, employeeId: data.employeeId || undefined };
    if (editingId) {
      updateRoute.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoutesQueryKey() });
          setIsFormOpen(false);
          toast({ title: "Route updated" });
        }
      });
    } else {
      createRoute.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoutesQueryKey() });
          setIsFormOpen(false);
          toast({ title: "Route created" });
        }
      });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteRoute.mutate({ id: deletingId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRoutesQueryKey() });
        setDeletingId(null);
        toast({ title: "Route deleted" });
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Route</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes?.map((r) => {
                const emp = employees?.find(e => e.id === r.employeeId);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.area}</TableCell>
                    <TableCell>{r.vehicle ?? "-"}</TableCell>
                    <TableCell>{emp ? emp.name : "-"}</TableCell>
                    <TableCell>{r.deliveryDate ? format(new Date(r.deliveryDate), 'MMM dd, yyyy') : "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeletingId(r.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!routes?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No routes found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Route" : "Add Route"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="area" render={({ field }) => (
                <FormItem><FormLabel>Area</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="vehicle" render={({ field }) => (
                <FormItem><FormLabel>Vehicle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="employeeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Employee</FormLabel>
                  <Select value={field.value ? field.value.toString() : "none"} onValueChange={(v) => field.onChange(v === "none" ? undefined : Number(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employees?.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                <FormItem><FormLabel>Delivery Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createRoute.isPending || updateRoute.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the route.</AlertDialogDescription>
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
