'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';
import { i18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';
import { toast } from 'sonner';
import {
  Dumbbell, Users, DollarSign, UserCog, CalendarCheck,
  LogIn, Database, FileWarning, Shield, LogOut,
  Sun, Moon, Languages, Search, Plus, Pencil, Trash2,
  Send, Download, ChevronLeft, ChevronRight, Menu, X,
  RotateCcw, CheckCircle2, AlertTriangle, TrendingUp,
  Activity, Wallet, UserMinus, UserPlus, Clock, Save,
  BarChart3, PieChart as PieChartIcon
} from 'lucide-react';

// ---- Types ----
interface Client {
  id: string; name: string; phone: string; planType: string;
  planPrice: number; regDate: string; expDate: string;
  daysLeft: number; status: string; totalCheckIns: number;
  lastPayment: { amount: number; date: string } | null;
}

interface Trainer {
  id: string; name: string; phone: string;
  specialty: string; salary: number; createdAt: string;
}

interface Payment {
  id: string; receiptId: string; memberName: string; memberPhone: string;
  planType: string; amount: number; paidDate: string; method: string;
}

interface CheckInRecord {
  id: string; clientName: string; clientPhone: string; checkInTime: string;
}

interface BackupRecord {
  id: string; snapshotId: string; timestamp: string;
  recordCount: number; restoredBy: string | null;
}

interface AuditRecord {
  id: string; action: string; itemType: string;
  details: string; performedBy: string | null; createdAt: string;
}

// ---- API Helper ----
function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('ig_token');
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
}

// ---- Telegram URL Helper (fixed) ----
function getTelegramLink(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  return `https://t.me/+${cleaned}`;
}

// ---- Status Badge Component ----
function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    ACTIVE: { variant: 'default', label: t('status') === 'Status' ? 'ACTIVE' : 'ንቁ' },
    EXPIRING: { variant: 'secondary', label: t('status') === 'Status' ? 'EXPIRING' : 'ማብቂያ' },
    EXPIRED: { variant: 'destructive', label: t('status') === 'Status' ? 'EXPIRED' : 'የተበታተነ' },
  };
  const v = variants[status] || variants.ACTIVE;
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

// ============== MAIN APP ==============
export default function Home() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, login, logout: storeLogout } = useAuthStore();
  const { activeTab, setActiveTab, language, toggleLanguage, sidebarOpen, setSidebarOpen } = useAppStore();

  const t = useCallback((key: string) => i18n[language]?.[key] || i18n.en[key] || key, [language]);

  // Auth state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Data states
  const [clients, setClients] = useState<Client[]>([]);
  const [clientTotal, setClientTotal] = useState(0);
  const [clientPage, setClientPage] = useState(1);
  const [clientSearch, setClientSearch] = useState('');

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerTotal, setTrainerTotal] = useState(0);
  const [trainerPage, setTrainerPage] = useState(1);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [financeStats, setFinanceStats] = useState({
    totalRevenue: 0, totalTransactions: 0, activeMembers: 0,
    totalMembers: 0, expiringMembers: 0, expiredMembers: 0,
    totalSalaryCost: 0, netProfit: 0,
  });
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; revenue: number }[]>([]);
  const [memberStatusData, setMemberStatusData] = useState<{ status: string; count: number; fill: string }[]>([]);
  const [planDistribution, setPlanDistribution] = useState<{ plan: string; members: number; revenue: number }[]>([]);
  const [revenueVsSalary, setRevenueVsSalary] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [financePeriod, setFinancePeriod] = useState('30');
  const [financePage, setFinancePage] = useState(1);

  const [attendance, setAttendance] = useState<{ trainerId: string; name: string; phone: string; specialty: string; present: boolean }[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [checkInTotal, setCheckInTotal] = useState(0);
  const [checkInPage, setCheckInPage] = useState(1);
  const [checkInClientSearch, setCheckInClientSearch] = useState('');

  const [backups, setBackups] = useState<BackupRecord[]>([]);

  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);

  const [loading, setLoading] = useState(false);

  // Dialog states
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editClientData, setEditClientData] = useState<Client | null>(null);
  const [editClientForm, setEditClientForm] = useState({ name: '', phone: '', extendDays: '' });

  const [editTrainerOpen, setEditTrainerOpen] = useState(false);
  const [editTrainerData, setEditTrainerData] = useState<Trainer | null>(null);
  const [editTrainerForm, setEditTrainerForm] = useState({ name: '', phone: '', specialty: '', salary: '' });

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreId, setRestoreId] = useState('');

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ---- Init ----
  useEffect(() => {
    fetch('/api/init').catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [activeTab, isAuthenticated, clientPage, trainerPage, financePage, financePeriod, checkInPage, auditPage, attendanceDate]);

  const refreshData = useCallback(() => {
    if (!isAuthenticated) return;
    switch (activeTab) {
      case 'clients': fetchClients(); break;
      case 'finance': fetchFinance(); break;
      case 'trainers': fetchTrainers(); break;
      case 'attendance': fetchAttendance(); break;
      case 'checkins': fetchCheckIns(); break;
      case 'backups': fetchBackups(); break;
      case 'audit': fetchAuditLogs(); break;
    }
  }, [activeTab, isAuthenticated, clientPage, trainerPage, financePage, financePeriod, checkInPage, auditPage, attendanceDate]);

  // ---- Auth Handlers ----
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        toast.success(t('success'));
      } else {
        setLoginError(data.error || t('loginError'));
      }
    } catch {
      setLoginError(t('error'));
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    storeLogout();
    toast.success('Logged out');
  }

  // ---- Debounced Search ----
  function handleClientSearchChange(value: string) {
    setClientSearch(value);
    setClientPage(1);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchClients(value), 300);
  }

  // ---- Data Fetchers ----
  async function fetchClients(search?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(clientPage), limit: '10', search: search || clientSearch, status: 'all' });
      const res = await apiFetch(`/api/clients?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients);
        setClientTotal(data.total);
      } else if (res.status === 401) handleLogout();
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function fetchTrainers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(trainerPage), limit: '10' });
      const res = await apiFetch(`/api/trainers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTrainers(data.trainers);
        setTrainerTotal(data.total);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function fetchFinance() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period: financePeriod, page: String(financePage), limit: '10' });
      const res = await apiFetch(`/api/finance?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFinanceStats(data.stats);
        setPayments(data.payments);
        if (data.charts) {
          setDailyRevenue(data.charts.dailyRevenue || []);
          setMemberStatusData(data.charts.memberStatusData || []);
          setPlanDistribution(data.charts.planDistribution || []);
          setRevenueVsSalary(data.charts.revenueVsSalary || []);
        }
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function fetchAttendance() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/attendance?date=${attendanceDate}`);
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.attendance);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function fetchCheckIns() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(checkInPage), limit: '10' });
      const res = await apiFetch(`/api/checkins?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCheckIns(data.checkIns);
        setCheckInTotal(data.total);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function fetchBackups() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function fetchAuditLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(auditPage), limit: '20' });
      const res = await apiFetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs);
        setAuditTotal(data.total);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  // ---- Client Actions ----
  async function handleRegisterClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
    const planType = (form.elements.namedItem('planType') as HTMLSelectElement).value;
    try {
      const res = await apiFetch('/api/clients', { method: 'POST', body: JSON.stringify({ name, phone, planType }) });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); form.reset(); fetchClients(); }
      else toast.error(data.error);
    } catch { toast.error(t('error')); }
  }

  function openEditClient(client: Client) {
    setEditClientData(client);
    setEditClientForm({ name: client.name, phone: client.phone, extendDays: '' });
    setEditClientOpen(true);
  }

  async function handleEditClient() {
    if (!editClientData) return;
    try {
      const body: Record<string, unknown> = { id: editClientData.id, name: editClientForm.name, phone: editClientForm.phone };
      if (editClientForm.extendDays) body.extendDays = parseInt(editClientForm.extendDays);
      const res = await apiFetch('/api/clients', { method: 'PUT', body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); setEditClientOpen(false); fetchClients(); }
      else toast.error(data.error);
    } catch { toast.error(t('error')); }
  }

  async function handleDeleteClient(id: string) {
    try {
      const res = await apiFetch(`/api/clients?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Client deleted'); fetchClients(); }
      else toast.error('Failed to delete');
    } catch { toast.error(t('error')); }
  }

  // ---- Trainer Actions ----
  async function handleAddTrainer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('trnName') as HTMLInputElement).value;
    const phone = (form.elements.namedItem('trnPhone') as HTMLInputElement).value;
    const specialty = (form.elements.namedItem('trnSpecialty') as HTMLInputElement).value;
    const salary = (form.elements.namedItem('trnSalary') as HTMLInputElement).value;
    try {
      const res = await apiFetch('/api/trainers', { method: 'POST', body: JSON.stringify({ name, phone, specialty, salary }) });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); form.reset(); fetchTrainers(); }
      else toast.error(data.error);
    } catch { toast.error(t('error')); }
  }

  function openEditTrainer(trainer: Trainer) {
    setEditTrainerData(trainer);
    setEditTrainerForm({ name: trainer.name, phone: trainer.phone, specialty: trainer.specialty, salary: String(trainer.salary) });
    setEditTrainerOpen(true);
  }

  async function handleEditTrainer() {
    if (!editTrainerData) return;
    try {
      const res = await apiFetch('/api/trainers', { method: 'PUT', body: JSON.stringify({ id: editTrainerData.id, ...editTrainerForm, salary: parseFloat(editTrainerForm.salary) }) });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); setEditTrainerOpen(false); fetchTrainers(); }
      else toast.error(data.error);
    } catch { toast.error(t('error')); }
  }

  async function handleDeleteTrainer(id: string) {
    try {
      const res = await apiFetch(`/api/trainers?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Trainer deleted'); fetchTrainers(); }
      else toast.error('Failed to delete');
    } catch { toast.error(t('error')); }
  }

  // ---- Attendance Toggle ----
  async function handleToggleAttendance(trainerId: string, present: boolean) {
    try {
      const res = await apiFetch('/api/attendance', { method: 'PUT', body: JSON.stringify({ trainerId, date: attendanceDate, present }) });
      if (res.ok) fetchAttendance();
    } catch { toast.error(t('error')); }
  }

  // ---- Check-In ----
  async function handleCheckIn(clientId: string) {
    try {
      const res = await apiFetch('/api/checkins', { method: 'POST', body: JSON.stringify({ clientId }) });
      const data = await res.json();
      if (res.ok) toast.success(data.message);
      else toast.error(data.error);
    } catch { toast.error(t('error')); }
  }

  // ---- Backup Actions ----
  async function handleCreateBackup() {
    try {
      const res = await apiFetch('/api/backups', { method: 'POST' });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); fetchBackups(); }
      else toast.error(data.error);
    } catch { toast.error(t('error')); }
  }

  async function handleRestoreBackup() {
    if (!restoreId) return;
    try {
      const res = await apiFetch('/api/backups', { method: 'PUT', body: JSON.stringify({ backupId: restoreId }) });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); setRestoreOpen(false); refreshData(); }
      else toast.error(data.error);
    } catch { toast.error(t('error')); }
  }

  // ---- Clear Audit ----
  async function handleClearAudit() {
    try {
      const res = await apiFetch('/api/audit', { method: 'DELETE' });
      if (res.ok) { toast.success('Audit logs cleared'); fetchAuditLogs(); }
    } catch { toast.error(t('error')); }
  }

  // ---- Export ----
  async function handleExportExcel() {
    const data = payments.map(p => ({ Receipt: p.receiptId, Member: p.memberName, Phone: p.memberPhone, Plan: p.planType, 'Amount (ETB)': p.amount, Date: p.paidDate, Method: p.method }));
    const csv = [Object.keys(data[0] || {}).join(','), ...data.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `IronGym_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ---- Pagination Component ----
  function Pagination({ page, pages, onPageChange }: { page: number; pages: number; onPageChange: (p: number) => void }) {
    if (pages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">{page} / {pages}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ---- Chart Configs ----
  const revenueChartConfig = { revenue: { label: 'Revenue (ETB)', color: 'var(--chart-1)' } };
  const memberChartConfig = { active: { label: 'Active', color: 'var(--chart-1)' }, expiring: { label: 'Expiring', color: 'var(--chart-5)' }, expired: { label: 'Expired', color: 'var(--destructive)' } };
  const planChartConfig = { members: { label: 'Members', color: 'var(--chart-1)' }, revenue: { label: 'Revenue', color: 'var(--chart-2)' } };
  const comparisonChartConfig = { value: { label: 'Amount (ETB)', color: 'var(--chart-1)' } };

  const PIE_COLORS = ['#0D4D3A', '#F59E0B', '#EF4444'];

  // ============ LOGIN SCREEN ============
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <Dumbbell className="h-12 w-12 mx-auto text-primary" />
            <CardTitle className="text-2xl font-bold">{t('appName')} <span className="text-primary">{t('appSub')}</span></CardTitle>
            <p className="text-sm text-muted-foreground">{t('loginTitle')}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> {loginError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">{t('username')}</Label>
                <Input id="username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="admin" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input id="password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? <><Save className="h-4 w-4 mr-2 animate-spin" /> {t('loading')}</> : <><Shield className="h-4 w-4 mr-2" /> {t('login')}</>}
              </Button>
              <p className="text-xs text-center text-muted-foreground">Default: admin / Admin@1234</p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ MAIN DASHBOARD ============
  const navItems = [
    { id: 'clients', icon: Users, label: t('navClients') },
    { id: 'finance', icon: DollarSign, label: t('navFinance') },
    { id: 'trainers', icon: UserCog, label: t('navTrainers') },
    { id: 'attendance', icon: CalendarCheck, label: t('navAttendance') },
    { id: 'checkins', icon: LogIn, label: t('navCheckIns') },
    { id: 'backups', icon: Database, label: t('navBackups') },
    { id: 'audit', icon: FileWarning, label: t('navAudit') },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 border-r bg-card transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dumbbell className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-bold text-lg">{t('appName')}</h1>
              <p className="text-[10px] text-muted-foreground tracking-widest">{t('appSub')}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'default' : 'ghost'}
              className="w-full justify-start gap-3"
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="p-3 space-y-1 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? t('lightMode') : t('darkMode')}
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={toggleLanguage}>
            <Languages className="h-4 w-4" />
            {language === 'en' ? 'አማርኛ' : 'English'}
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> {t('logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            <span className="font-bold">{t('appName')}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                {(() => { const item = navItems.find(n => n.id === activeTab); return item ? <item.icon className="h-6 w-6 text-primary" /> : null; })()}
                {navItems.find(n => n.id === activeTab)?.label}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> {t('systemOnline')}
              </Badge>
            </div>
          </div>

          {/* ======== CLIENTS MODULE ======== */}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              {/* Register Form */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> {t('registerClient')}</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleRegisterClient} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>{t('fullName')}</Label>
                      <Input name="name" required />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('phone')}</Label>
                      <Input name="phone" type="tel" placeholder="+251900000000" required />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('plan')}</Label>
                      <Select name="planType" defaultValue="30">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">{t('opt30')}</SelectItem>
                          <SelectItem value="60">{t('opt60')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="sm:col-span-3 max-w-xs"><UserPlus className="h-4 w-4 mr-2" />{t('register')}</Button>
                  </form>
                </CardContent>
              </Card>

              {/* Client Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{t('clientRoster')}</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t('search')} className="pl-9" value={clientSearch} onChange={e => handleClientSearchChange(e.target.value)} />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                  ) : clients.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">{t('noData')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('fullName')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('phone')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">{t('regDate')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">{t('expDate')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('daysLeft')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('status')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clients.map(c => (
                            <tr key={c.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium">{c.name}</td>
                              <td className="p-3 font-mono text-xs">{c.phone}</td>
                              <td className="p-3 font-mono text-xs hidden sm:table-cell">{c.regDate}</td>
                              <td className="p-3 font-mono text-xs hidden sm:table-cell">{c.expDate}</td>
                              <td className="p-3 font-mono text-xs">{c.daysLeft > 0 ? c.daysLeft : 0}</td>
                              <td className="p-3"><StatusBadge status={c.status} t={t} /></td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={getTelegramLink(c.phone)} target="_blank" rel="noopener noreferrer">
                                      <Send className="h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => openEditClient(c)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>{t('deleteConfirm')}</AlertDialogTitle>
                                        <AlertDialogDescription>{c.name} — {c.phone}</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteClient(c.id)} className="bg-destructive text-white hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Pagination page={clientPage} pages={Math.ceil(clientTotal / 10)} onPageChange={setClientPage} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ======== FINANCE MODULE ======== */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-primary"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">{t('totalRevenue')}</p><p className="text-2xl font-bold text-primary">{financeStats.totalRevenue.toLocaleString()} ETB</p><p className="text-xs text-primary/70 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Real-time</p></CardContent></Card>
                <Card className="border-l-4 border-l-chart-2"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">{t('activeMembers')}</p><p className="text-2xl font-bold">{financeStats.activeMembers}</p><p className="text-xs text-muted-foreground">{t('totalMembers')}: {financeStats.totalMembers}</p></CardContent></Card>
                <Card className="border-l-4 border-l-chart-5"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">{t('salaryCosts')}</p><p className="text-2xl font-bold text-chart-5">{financeStats.totalSalaryCost.toLocaleString()} ETB</p><p className="text-xs text-muted-foreground">Monthly</p></CardContent></Card>
                <Card className="border-l-4 border-l-primary"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">{t('netProfit')}</p><p className={`text-2xl font-bold ${financeStats.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{financeStats.netProfit.toLocaleString()} ETB</p><p className="text-xs text-muted-foreground">Revenue - Salaries</p></CardContent></Card>
              </div>

              {/* Charts Row 1: Daily Revenue + Member Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Revenue Bar Chart */}
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Daily Revenue</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={financePeriod} onValueChange={v => { setFinancePeriod(v); setFinancePage(1); }}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">{t('last30Days')}</SelectItem>
                          <SelectItem value="60">{t('last60Days')}</SelectItem>
                          <SelectItem value="90">{t('last90Days')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {dailyRevenue.length === 0 ? (
                      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">{t('noData')}</div>
                    ) : (
                      <ChartContainer config={revenueChartConfig} className="h-56 w-full">
                        <BarChart data={dailyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tickLine={false} axisLine={false} fontSize={11} />
                          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Member Status Pie Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-primary" /> Member Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {memberStatusData.every(d => d.count === 0) ? (
                      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">{t('noData')}</div>
                    ) : (
                      <ChartContainer config={memberChartConfig} className="h-56 w-full">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie data={memberStatusData.filter(d => d.count > 0)} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                            {memberStatusData.filter(d => d.count > 0).map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                    )}
                    <div className="flex items-center justify-center gap-4 mt-2">
                      {memberStatusData.map((d, i) => (
                        <div key={d.status} className="flex items-center gap-1.5 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                          <span className="text-muted-foreground">{d.status} ({d.count})</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 2: Plan Distribution + Revenue vs Salary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plan Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Plan Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {planDistribution.every(d => d.members === 0) ? (
                      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">{t('noData')}</div>
                    ) : (
                      <ChartContainer config={planChartConfig} className="h-56 w-full">
                        <BarChart data={planDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                          <YAxis type="category" dataKey="plan" tickLine={false} axisLine={false} fontSize={12} width={75} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="members" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={30} />
                        </BarChart>
                      </ChartContainer>
                    )}
                    <div className="flex items-center justify-center gap-6 mt-2">
                      {planDistribution.map(d => (
                        <div key={d.plan} className="text-center">
                          <p className="text-xs text-muted-foreground">{d.plan}</p>
                          <p className="font-semibold text-primary">{d.members} <span className="text-xs font-normal text-muted-foreground">members</span></p>
                          <p className="text-xs text-muted-foreground">{d.revenue.toLocaleString()} ETB</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue vs Salary Comparison */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Revenue vs Costs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {revenueVsSalary.every(d => d.value === 0) ? (
                      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">{t('noData')}</div>
                    ) : (
                      <ChartContainer config={comparisonChartConfig} className="h-56 w-full">
                        <BarChart data={revenueVsSalary.filter(d => d.value !== 0)} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                            {revenueVsSalary.filter(d => d.value !== 0).map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    )}
                    <div className="flex items-center justify-center gap-5 mt-2">
                      {revenueVsSalary.filter(d => d.value !== 0).map((d) => (
                        <div key={d.name} className="text-center">
                          <div className="w-3 h-3 rounded mx-auto mb-1" style={{ backgroundColor: d.fill }} />
                          <p className="text-xs text-muted-foreground">{d.name}</p>
                          <p className="font-semibold text-sm">{d.value.toLocaleString()} ETB</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction Table */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <CardTitle className="text-base">{t('transactions')}</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">{t('noData')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('receiptId')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('memberName')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('planType')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('amount')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('paidDate')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map(p => (
                            <tr key={p.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-mono text-xs">{p.receiptId?.slice(0, 12)}...</td>
                              <td className="p-3 font-medium">{p.memberName}</td>
                              <td className="p-3">{p.planType}</td>
                              <td className="p-3 font-mono text-primary font-semibold">{p.amount.toLocaleString()} ETB</td>
                              <td className="p-3 font-mono text-xs">{p.paidDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Pagination page={financePage} pages={Math.ceil(payments.length / 10)} onPageChange={setFinancePage} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ======== TRAINERS MODULE ======== */}
          {activeTab === 'trainers' && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> {t('addTrainer')}</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleAddTrainer} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1"><Label>{t('fullName')}</Label><Input name="trnName" required /></div>
                    <div className="space-y-1"><Label>{t('phone')}</Label><Input name="trnPhone" type="tel" required /></div>
                    <div className="space-y-1"><Label>{t('specialty')}</Label><Input name="trnSpecialty" required /></div>
                    <div className="space-y-1"><Label>{t('salary')}</Label><Input name="trnSalary" type="number" min="0" step="any" required /></div>
                    <Button type="submit" className="sm:col-span-4 max-w-xs"><Plus className="h-4 w-4 mr-2" />{t('addTrainer')}</Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{t('trainerRoster')}</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                  ) : trainers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">{t('noData')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('fullName')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('phone')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('specialty')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('salary')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trainers.map(tr => (
                            <tr key={tr.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium">{tr.name}</td>
                              <td className="p-3 font-mono text-xs">{tr.phone}</td>
                              <td className="p-3">{tr.specialty}</td>
                              <td className="p-3 font-mono">{tr.salary.toLocaleString()} ETB</td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openEditTrainer(tr)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>{t('deleteConfirm')}</AlertDialogTitle>
                                        <AlertDialogDescription>{tr.name} — {tr.specialty}</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteTrainer(tr.id)} className="bg-destructive text-white hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Pagination page={trainerPage} pages={Math.ceil(trainerTotal / 10)} onPageChange={setTrainerPage} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ======== ATTENDANCE MODULE ======== */}
          {activeTab === 'attendance' && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-base">{t('navAttendance')}</CardTitle>
                <Input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-44" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                ) : attendance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('noData')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('fullName')}</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('phone')}</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('specialty')}</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('attendanceCheck')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map(a => (
                          <tr key={a.trainerId} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-medium">{a.name}</td>
                            <td className="p-3 font-mono text-xs">{a.phone}</td>
                            <td className="p-3">{a.specialty}</td>
                            <td className="p-3">
                              <Checkbox checked={a.present} onCheckedChange={(checked) => handleToggleAttendance(a.trainerId, !!checked)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ======== CHECK-INS MODULE ======== */}
          {activeTab === 'checkins' && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">{t('checkInClient')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder={t('search')} className="pl-9" value={checkInClientSearch} onChange={e => setCheckInClientSearch(e.target.value)} />
                    </div>
                  </div>
                  {checkInClientSearch.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {clients
                        .filter(c => c.name.toLowerCase().includes(checkInClientSearch.toLowerCase()) || c.phone.includes(checkInClientSearch))
                        .slice(0, 5)
                        .map(c => (
                          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                            <div>
                              <p className="font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.phone} · {c.daysLeft} {t('days')} {t('status').toLowerCase()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={c.status} t={t} />
                              <Button size="sm" onClick={() => { handleCheckIn(c.id); setCheckInClientSearch(''); }} disabled={c.status === 'EXPIRED'}>
                                <LogIn className="h-3.5 w-3.5 mr-1" /> {t('checkIn')}
                              </Button>
                            </div>
                          </div>
                        ))
                      }
                      {clients.filter(c => c.name.toLowerCase().includes(checkInClientSearch.toLowerCase()) || c.phone.includes(checkInClientSearch)).length === 0 && (
                        <p className="text-center text-muted-foreground py-4">{t('noData')}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{t('checkInHistory')}</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                  ) : checkIns.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">{t('noData')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('memberName')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('phone')}</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">{t('paidDate')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checkIns.map(ci => (
                            <tr key={ci.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium">{ci.clientName}</td>
                              <td className="p-3 font-mono text-xs">{ci.clientPhone}</td>
                              <td className="p-3 font-mono text-xs">{new Date(ci.checkInTime).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Pagination page={checkInPage} pages={Math.ceil(checkInTotal / 10)} onPageChange={setCheckInPage} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ======== BACKUPS MODULE ======== */}
          {activeTab === 'backups' && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-base">{t('backupHistory')}</CardTitle>
                <Button onClick={handleCreateBackup}><Database className="h-4 w-4 mr-2" />{t('createBackup')}</Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                ) : backups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('noData')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('backupId')}</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('timestamp')}</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('records')}</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map(b => (
                          <tr key={b.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-mono text-xs font-semibold">{b.snapshotId}</td>
                            <td className="p-3 font-mono text-xs">{new Date(b.timestamp).toLocaleString()}</td>
                            <td className="p-3">{b.recordCount} {t('records')}</td>
                            <td className="p-3">
                              <Button variant="outline" size="sm" onClick={() => { setRestoreId(b.id); setRestoreOpen(true); }}>
                                <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t('restore')}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ======== AUDIT LOG MODULE ======== */}
          {activeTab === 'audit' && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-base">{t('auditHistory')}</CardTitle>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Trash2 className="h-3.5 w-3.5 mr-1" />{t('clearLog')}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('clearLog')}?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently delete all audit logs.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAudit} className="bg-destructive text-white hover:bg-destructive/90">{t('confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                ) : auditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('noData')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('itemType')}</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('details')}</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('performedBy')}</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">{t('timestamp')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map(log => (
                          <tr key={log.id} className="border-b hover:bg-muted/50">
                            <td className="p-3"><Badge variant="outline">{log.action.replace(/_/g, ' ')}</Badge></td>
                            <td className="p-3 text-xs">{log.details}</td>
                            <td className="p-3 text-xs text-muted-foreground">{log.performedBy || '-'}</td>
                            <td className="p-3 font-mono text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pagination page={auditPage} pages={Math.ceil(auditTotal / 20)} onPageChange={setAuditPage} />
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* ======== DIALOGS ======== */}
      {/* Edit Client Dialog */}
      <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('editClient')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>{t('fullName')}</Label><Input value={editClientForm.name} onChange={e => setEditClientForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('phone')}</Label><Input value={editClientForm.phone} onChange={e => setEditClientForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('extendDays')} (leave empty to keep current)</Label><Input type="number" min="1" value={editClientForm.extendDays} onChange={e => setEditClientForm(f => ({ ...f, extendDays: e.target.value }))} placeholder="30" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClientOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleEditClient}><Save className="h-4 w-4 mr-1" />{t('saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Trainer Dialog */}
      <Dialog open={editTrainerOpen} onOpenChange={setEditTrainerOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('editTrainer')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>{t('fullName')}</Label><Input value={editTrainerForm.name} onChange={e => setEditTrainerForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('phone')}</Label><Input value={editTrainerForm.phone} onChange={e => setEditTrainerForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('specialty')}</Label><Input value={editTrainerForm.specialty} onChange={e => setEditTrainerForm(f => ({ ...f, specialty: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('salary')}</Label><Input type="number" value={editTrainerForm.salary} onChange={e => setEditTrainerForm(f => ({ ...f, salary: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTrainerOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleEditTrainer}><Save className="h-4 w-4 mr-1" />{t('saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Backup Confirmation */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-orange-500"><AlertTriangle className="h-5 w-5" /> {t('restore')}</DialogTitle></DialogHeader>
          <p className="text-sm">{t('restoreConfirm')}</p>
          <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 inline mr-1" /> Current active data will be replaced and logged in the audit trail.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreOpen(false)}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={handleRestoreBackup}><RotateCcw className="h-4 w-4 mr-1" />{t('confirm')} & {t('restore')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
