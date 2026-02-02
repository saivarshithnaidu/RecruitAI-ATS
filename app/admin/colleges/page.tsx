"use client";

import { useState, useEffect } from "react";
import { getCollegesStats, toggleCollegeStatus, addNewCollege } from "@/app/actions/colleges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminCollegesPage() {
    const [colleges, setColleges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // New College Form
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCollege, setNewCollege] = useState({ name: "", city: "", district: "Visakhapatnam", university: "" });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const data = await getCollegesStats();
        setColleges(data || []);
        setLoading(false);
    }

    async function handleToggle(id: string, currentStatus: string) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        // Optimistic update
        setColleges(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));

        const res = await toggleCollegeStatus(id, newStatus);
        if (!res.success) {
            // Revert
            loadData();
            alert("Failed to update status");
        }
    }

    async function handleAddCollege() {
        if (!newCollege.name || !newCollege.city) return;
        setAdding(true);
        const res = await addNewCollege(newCollege);
        setAdding(false);
        if (res.success) {
            setIsAddOpen(false);
            setNewCollege({ name: "", city: "", district: "Visakhapatnam", university: "" });
            loadData();
        } else {
            alert("Failed to add college: " + res.message);
        }
    }

    const filteredColleges = colleges.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.city.toLowerCase().includes(search.toLowerCase()) ||
            c.district.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Colleges Database</h1>
                    <p className="text-muted-foreground">Manage institutes and view candidate distribution.</p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" /> Add College</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New College</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>College Name</Label>
                                <Input value={newCollege.name} onChange={e => setNewCollege({ ...newCollege, name: e.target.value })} placeholder="e.g. Andhra University" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input value={newCollege.city} onChange={e => setNewCollege({ ...newCollege, city: e.target.value })} placeholder="Visakhapatnam" />
                                </div>
                                <div className="space-y-2">
                                    <Label>District</Label>
                                    <Input value={newCollege.district} onChange={e => setNewCollege({ ...newCollege, district: e.target.value })} placeholder="Visakhapatnam" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Affiliated University</Label>
                                <Input value={newCollege.university} onChange={e => setNewCollege({ ...newCollege, university: e.target.value })} placeholder="e.g. JNTUK" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddCollege} disabled={adding}>{adding ? "Adding..." : "Save College"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>All Institutes ({filteredColleges.length})</CardTitle>
                        <div className="flex gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search details..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>College Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Type/University</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredColleges.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No colleges found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredColleges.map((college) => (
                                        <TableRow key={college.id}>
                                            <TableCell className="font-medium">{college.name}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">{college.city}</div>
                                                <div className="text-xs text-muted-foreground">{college.district}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{college.type || 'N/A'}</Badge>
                                                <div className="text-xs text-muted-foreground mt-1">{college.university}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={college.status === 'active' ? 'default' : 'secondary'} className={college.status === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                                    {college.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggle(college.id, college.status)}
                                                    className={college.status === 'active' ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                                                >
                                                    {college.status === 'active' ? 'Deactivate' : 'Activate'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
