import { useState } from "react";
import { useListDeliveries, useCreateDelivery, useUpdateDelivery, getListDeliveriesQueryKey, useListOrders, useListEmployees, useListRoutes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
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
  orderId: z.coerce.number().min(1, "Order is required"),
  employeeId: z.coerce.number().min(1, "Employee is required"),
  routeId: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export default function Deliveries() {
  const { data: deliveries } = useListDeliveries({}, { query: { queryKey: getListDeliveriesQueryKey() } });
  const { data: orders } = useListOrders();
  const { data: employees } = useListEmployees();
  const { data: routes } = useListRoutes();
  
  const [filterStatus, setFilterStatus] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createDelivery = useCreateDelivery();
  const updateDelivery = useUpdateDelivery();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { orderId: 0, employeeId: 0, routeId: undefined, notes: "" }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const payload = { ...data, routeId: data.routeId || undefined };
    createDelivery.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
        setIsFormOpen(false);
        toast({ title: "Delivery assigned" });
      }
    });
  };

  const handleUpdateStatus = (id: number, status: "delivered" | "failed") => {
    updateDelivery.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
        toast({ title: `Delivery marked as ${status}` });
      }
    });
  };

  const filtered = deliveries?.filter(d => filterStatus === "all" || d.status === filterStatus);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Deliveries</h1>
        <Button onClick={() => { form.reset(); setIsFormOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Assign Delivery</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivered At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((d) => {
                const emp = employees?.find(e => e.id === d.employeeId);
                const route = routes?.find(r => r.id === d.routeId);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">#{d.orderId}</TableCell>
                    <TableCell>{emp ? emp.name : "-"}</TableCell>
                    <TableCell>{route ? route.name : "-"}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell>{d.deliveredAt ? format(new Date(d.deliveredAt), 'MMM dd, yyyy HH:mm') : "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {d.status !== "delivered" && d.status !== "failed" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(d.id, "delivered")}>Mark Delivered</Button>
                          <Button variant="outline" size="sm" className="text-red-500" onClick={() => handleUpdateStatus(d.id, "failed")}>Mark Failed</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!filtered?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No deliveries found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Delivery</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="orderId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Order</FormLabel>
                  <Select value={field.value ? field.value.toString() : ""} onValueChange={(v) => field.onChange(Number(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Order" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {orders?.filter(o => o.status !== "delivered" && o.status !== "cancelled").map(o => (
                        <SelectItem key={o.id} value={o.id.toString()}>Order #{o.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="employeeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select value={field.value ? field.value.toString() : "none"} onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employees?.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="routeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Route</FormLabel>
                  <Select value={field.value ? field.value.toString() : "none"} onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {routes?.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createDelivery.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
