import React, { useMemo, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { ActionItem, Project } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { TrendingUp, CheckCircle2, Target, Zap, Users, BarChart3, PieChart as PieIcon, Layers, FileText } from 'lucide-react';

interface PerformanceDashboardProps {
  projects: Project[];
}

const STATUS_COLORS: Record<string, string> = {
  'completed': 'bg-green-100 text-green-700 border-green-200',
  'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'pending': 'bg-slate-100 text-slate-700 border-slate-200',
  'blocked': 'bg-red-100 text-red-700 border-red-200',
};

export default function PerformanceDashboard({ projects }: PerformanceDashboardProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  useEffect(() => {
    const q = collection(db, 'actionItems');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActionItem)));
    }, (error) => {
      console.error("Dashboard Items Subscription Error:", error);
    });
    return () => unsubscribe();
  }, []);

  const filteredItems = useMemo(() => {
    if (selectedProjectId === 'all') return items;
    return items.filter(item => item.projectId === selectedProjectId);
  }, [items, selectedProjectId]);

  const stats = useMemo(() => {
    const total = filteredItems.length;
    const completed = filteredItems.filter(i => i.status === 'completed').length;
    const deliveryRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, deliveryRate };
  }, [filteredItems]);

  const statusSummary = useMemo(() => {
    const counts: Record<string, number> = { 'completed': 0, 'in-progress': 0, 'pending': 0, 'blocked': 0 };
    filteredItems.forEach(item => {
      if (counts[item.status] !== undefined) counts[item.status]++;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
      key: name,
      value,
      percentage: stats.total > 0 ? Math.round((value / stats.total) * 100) : 0
    }));
  }, [filteredItems, stats.total]);

  const ownerSummary = useMemo(() => {
    const counts: Record<string, { name: string, total: number, completed: number }> = {};
    filteredItems.forEach(item => {
      if (!counts[item.owner]) {
        counts[item.owner] = { name: item.owner, total: 0, completed: 0 };
      }
      counts[item.owner].total++;
      if (item.status === 'completed') counts[item.owner].completed++;
    });
    return Object.values(counts)
      .map(o => ({ ...o, rate: o.total > 0 ? Math.round((o.completed / o.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filteredItems]);

  const categorySummary = useMemo(() => {
    const counts: Record<string, { name: string, total: number, completed: number }> = {};
    filteredItems.forEach(item => {
      const cat = item.category || 'Uncategorized';
      if (!counts[cat]) {
        counts[cat] = { name: cat, total: 0, completed: 0 };
      }
      counts[cat].total++;
      if (item.status === 'completed') counts[cat].completed++;
    });
    return Object.values(counts)
      .map(c => ({ ...c, rate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filteredItems]);

  const epicSummary = useMemo(() => {
    const counts: Record<string, { name: string, total: number, completed: number }> = {};
    filteredItems.forEach(item => {
      const epic = item.epic || 'Infrastructure';
      if (!counts[epic]) {
        counts[epic] = { name: epic, total: 0, completed: 0 };
      }
      counts[epic].total++;
      if (item.status === 'completed') counts[epic].completed++;
    });
    return Object.values(counts)
      .map(e => ({ ...e, rate: e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filteredItems]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Performance Dashboard</h2>
          <p className="text-sm text-slate-500">Data-driven insights and action item tracking</p>
        </div>
        <div className="w-[200px]">
          <Select key={`dash-proj-${projects.length}`} value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="bg-white border-slate-200 shadow-sm">
              <span data-slot="select-value" className="flex flex-1 text-left line-clamp-1">
                {selectedProjectId === 'all' ? 'All Projects' : (projects.find(p => p.id === selectedProjectId)?.name || 'Filter by Project')}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Gross Inventory', value: stats.total, sub: 'Action items identified', icon: Target, color: 'text-slate-600' },
          { title: 'Velocity Rate', value: `${stats.deliveryRate}%`, sub: 'Current completion pace', icon: TrendingUp, color: 'text-blue-600' },
          { title: 'Contributors', value: ownerSummary.length, sub: 'Active team members', icon: Users, color: 'text-orange-600' },
          { title: 'Workstreams', value: epicSummary.length, sub: 'Distinct functional epics', icon: Layers, color: 'text-indigo-600' }
        ].map((m, i) => (
          <Card key={i} className="border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">{m.title}</CardTitle>
              <m.icon className={`h-4 w-4 ${m.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{m.value}</div>
              <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tighter">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Dimension */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <PieIcon size={18} className="text-slate-400" />
              <div>
                <CardTitle className="text-lg">Status Distribution</CardTitle>
                <CardDescription className="text-xs">Measure of current throughput states</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Dimension (Status)</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Measure (Count)</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">% Mix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statusSummary.map((s) => (
                  <tr key={s.key} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={`font-medium ${STATUS_COLORS[s.key] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {s.name}
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-4 font-bold text-slate-800">{s.value}</td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-2 text-slate-500 font-mono text-xs">
                        {s.percentage}%
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-slate-300 h-full" style={{ width: `${s.percentage}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Categories Dimension */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-slate-400" />
              <div>
                <CardTitle className="text-lg">Category Pivot</CardTitle>
                <CardDescription className="text-xs">Nature of work by operational category</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[350px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Category</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600">Total</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600">Done</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categorySummary.slice(0, 10).map((c) => (
                    <tr key={c.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-700">{c.name}</td>
                      <td className="text-right py-3 px-4 text-slate-600">{c.total}</td>
                      <td className="text-right py-3 px-4 text-green-600 font-medium">{c.completed}</td>
                      <td className="text-right py-3 px-4">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${c.rate > 70 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'}`}>
                          {c.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {categorySummary.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 text-xs italic">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Epics/Workstreams Dimension */}
        <Card className="border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-slate-400" />
              <div>
                <CardTitle className="text-lg">Workstream Analysis</CardTitle>
                <CardDescription className="text-xs">Functional scope delivery performance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-6 font-semibold text-slate-600">Workstream / Epic</th>
                    <th className="text-right py-3 px-6 font-semibold text-slate-600">Inventory</th>
                    <th className="text-right py-3 px-6 font-semibold text-slate-600">Outflow</th>
                    <th className="text-left py-3 px-6 font-semibold text-slate-600">Completion Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {epicSummary.map((e) => (
                    <tr key={e.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6 font-bold truncate max-w-[200px]">{e.name}</td>
                      <td className="text-right py-3 px-6 font-mono text-xs">{e.total} units</td>
                      <td className="text-right py-3 px-6 text-green-600 font-bold">{e.completed} units</td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[200px] bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-primary h-full transition-all duration-500" style={{ width: `${e.rate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-900 w-8">{e.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {epicSummary.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 italic">No epics tracked for this selection</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Ownership Dimension */}
        <Card className="border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-slate-400" />
              <div>
                <CardTitle className="text-lg">Resource Performance Grid</CardTitle>
                <CardDescription className="text-xs">Individual contributor committed vs delivered measures</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-6 font-semibold text-slate-600">Contributor Name</th>
                    <th className="text-right py-3 px-6 font-semibold text-slate-600">Committed Actions</th>
                    <th className="text-right py-3 px-6 font-semibold text-slate-600">Resolved Actions</th>
                    <th className="text-right py-3 px-6 font-semibold text-slate-600 text-blue-600">Delivery Velocity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ownerSummary.map((o) => (
                    <tr key={o.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {o.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{o.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-6 text-slate-500 font-mono text-xs">{o.total} total items</td>
                      <td className="text-right py-3 px-6 text-slate-900 font-bold">{o.completed} resolved</td>
                      <td className="text-right py-3 px-6">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-extrabold text-blue-600">{o.rate}%</span>
                          <div className="w-24 bg-slate-100 h-1 rounded-full mt-1">
                            <div className="bg-blue-600 h-full" style={{ width: `${o.rate}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {ownerSummary.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 italic">No active contributors found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
