import { useState } from "react";
import { useListEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useListBranches, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Search, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { StatusBadge } from "@/components/ui/status-badge";
import { fmtPKR } from "@/lib/format";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "inventory_manager", label: "Inventory Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "delivery", label: "Delivery Employee" },
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  cnic: z.string().optional(),
  address: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  branchId: z.coerce.number().optional(),
  salary: z.coerce.number().min(0),
  joiningDate: z.string().min(1, "Date required"),
  username: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function Employees() {
  const { data: employees } = useListEmployees({ query: { queryKey: getListEmployeesQueryKey() } });
  const { data: branches } = useListBranches();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const defaultValues: FormValues = {
    name: "", phone: "", email: "", cnic: "", address: "",
    role: "cashier", branchId: undefined, salary: 0,
    joiningDate: new Date().toISOString().slice(0, 10),
    username: "", status: "active",
  };

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues });

  const openAdd = () => {
    setEditingId(null);
    form.reset(defaultValues);
    setIsFormOpen(true);
  };

  const openEdit = (emp: any) => {
    setEditingId(emp.id);
    form.reset({
      name: emp.name,
      phone: emp.phone || "",
      email: emp.email || "",
      cnic: emp.cnic || "",
      address: emp.address || "",
      role: emp.role || "cashier",
      branchId: emp.branchId ?? undefined,
      salary: Number(emp.salary) || 0,
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      username: emp.username || "",
      status: (emp.status as "active" | "inactive") || "active",
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const payload = {
      ...data,
      email: data.email || undefined,
      cnic: data.cnic || undefined,
      address: data.address || undefined,
      username: data.username || undefined,
      branchId: data.branchId || undefined,
    };
    if (editingId) {
      updateEmployee.mutate({ id: editingId, data: payload as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          setIsFormOpen(false);
          toast({ title: "Employee updated" });
        }
      });
    } else {
      createEmployee.mutate({ data: payload as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          setIsFormOpen(false);
          toast({ title: "Employee created" });
        }
      });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteEmployee.mutate({ id: deletingId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        setDeletingId(null);
        toast({ title: "Employee deleted" });
      }
    });
  };

  const filtered = employees?.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.phone?.includes(search) ||
    e.employeeId?.toLowerCase().includes(search.toLowerCase())
  );

  const getBranchName = (branchId?: number | null) =>
    branches?.find(b => b.id === branchId)?.name ?? "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Employee</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, phone or EMP ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emp ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((e) => (
                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setViewingEmployee(e)}>
                  <TableCell><Badge variant="outline" className="font-mono text-xs">{e.employeeId}</Badge></TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>{e.phone}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {ROLES.find(r => r.value === e.role)?.label ?? e.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{getBranchName(e.branchId)}</TableCell>
                  <TableCell className="font-mono text-xs">{(e as any).username || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{fmtPKR(e.salary)}</TableCell>
                  <TableCell>{e.joiningDate ? format(new Date(e.joiningDate), "MMM dd, yyyy") : "—"}</TableCell>
                  <TableCell><StatusBadge status={e.status} /></TableCell>
                  <TableCell className="text-right space-x-1" onClick={(ev) => ev.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeletingId(e.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered?.length && (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">No employees found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* Personal Info */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone *</FormLabel><FormControl><Input {...field} placeholder="+92-300-0000000" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="cnic" render={({ field }) => (
                    <FormItem><FormLabel>CNIC</FormLabel><FormControl><Input {...field} placeholder="00000-0000000-0" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              {/* Work Info */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="branchId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select value={field.value ? field.value.toString() : "0"} onValueChange={(v) => field.onChange(v === "0" ? undefined : Number(v))}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select branch..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">All Branches</SelectItem>
                          {branches?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}{b.isMain ? " (Main)" : ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="salary" render={({ field }) => (
                    <FormItem><FormLabel>Salary</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="joiningDate" render={({ field }) => (
                    <FormItem><FormLabel>Joining Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
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

              {/* Login Credentials */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />Login Account (optional)
                </p>
                <p className="text-xs text-muted-foreground">Set a username so this employee can log into the ERP system.</p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Username</FormLabel><FormControl><Input {...field} placeholder="e.g. john.doe" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createEmployee.isPending || updateEmployee.isPending}>
                  {(createEmployee.isPending || updateEmployee.isPending) ? "Saving..." : "Save Employee"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Employee Detail Dialog */}
      <Dialog open={!!viewingEmployee} onOpenChange={(open) => !open && setViewingEmployee(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {viewingEmployee && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-2 border-b">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-base">{viewingEmployee.name}</p>
                  <Badge variant="outline" className="font-mono text-xs">{viewingEmployee.employeeId}</Badge>
                </div>
              </div>
              {[
                ["Role", ROLES.find(r => r.value === viewingEmployee.role)?.label ?? viewingEmployee.role],
                ["Branch", getBranchName(viewingEmployee.branchId)],
                ["Phone", viewingEmployee.phone],
                ["Email", viewingEmployee.email || "—"],
                ["CNIC", viewingEmployee.cnic || "—"],
                ["Address", viewingEmployee.address || "—"],
                ["Username", viewingEmployee.username || "—"],
                ["Salary", fmtPKR(viewingEmployee.salary)],
                ["Joined", viewingEmployee.joiningDate ? format(new Date(viewingEmployee.joiningDate), "MMMM dd, yyyy") : "—"],
                ["Status", viewingEmployee.status],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground w-24">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { if (viewingEmployee) { openEdit(viewingEmployee); setViewingEmployee(null); } }}>
              <Edit className="w-4 h-4 mr-1.5" />Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the employee record.</AlertDialogDescription>
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
