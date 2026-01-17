'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AdminSkeleton, TableSkeleton } from '@/components/common/skeletons';
import { Separator } from '@/components/ui/separator';
import {
  Activity, AlertCircle, CheckCircle, Clock, Database, FileText,
  Play, RefreshCw, Server, Settings, Shield, Square, Terminal,
  Users, Briefcase, TrendingUp, Newspaper, Bot, Zap, XCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';

interface SchedulerJob {
  id: string;
  name: string;
  next_run: string | null;
  trigger: string;
}

interface SchedulerStatus {
  is_running: boolean;
  jobs: SchedulerJob[];
}

interface AdminStats {
  users: { total: number };
  portfolios: { total: number };
  transactions: { total: number };
  stocks: { total: number };
  news: { total: number };
  errors: { unresolved: number };
  scheduler: { is_running: boolean; job_count: number };
}

interface LogEntry {
  id: string;
  created_at: string;
  [key: string]: any;
}

interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  page_size: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [aiStats, setAiStats] = useState<any>(null);

  // Logs
  const [apiLogs, setApiLogs] = useState<LogsResponse | null>(null);
  const [errorLogs, setErrorLogs] = useState<LogsResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<LogsResponse | null>(null);
  const [scraperLogs, setScraperLogs] = useState<LogsResponse | null>(null);
  const [aiLogs, setAiLogs] = useState<LogsResponse | null>(null);
  const [jobLogs, setJobLogs] = useState<LogsResponse | null>(null);

  // Filters
  const [logType, setLogType] = useState('api');
  const [logsPage, setLogsPage] = useState(1);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(logType);
    }
  }, [activeTab, logType, logsPage]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, schedulerRes, aiStatsRes] = await Promise.all([
        api.get('/admin/stats/overview'),
        api.get('/admin/scheduler/status'),
        api.get('/admin/logs/ai/stats'),
      ]);
      setStats(statsRes.data);
      setSchedulerStatus(schedulerRes.data);
      setAiStats(aiStatsRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async (type: string) => {
    try {
      const response = await api.get(`/admin/logs/${type}`, {
        params: { page: logsPage, page_size: 20 },
      });
      switch (type) {
        case 'api':
          setApiLogs(response.data);
          break;
        case 'errors':
          setErrorLogs(response.data);
          break;
        case 'audit':
          setAuditLogs(response.data);
          break;
        case 'scrapers':
          setScraperLogs(response.data);
          break;
        case 'ai':
          setAiLogs(response.data);
          break;
        case 'jobs':
          setJobLogs(response.data);
          break;
      }
    } catch (error) {
      console.error(`Error fetching ${type} logs:`, error);
    }
  };

  const triggerScrape = async (type: string) => {
    try {
      await api.post(`/admin/scrape/${type}`);
      alert(`${type} scrape started in background`);
    } catch (error) {
      console.error('Error triggering scrape:', error);
      alert('Failed to start scrape');
    }
  };

  const toggleScheduler = async () => {
    try {
      if (schedulerStatus?.is_running) {
        await api.post('/admin/scheduler/stop');
      } else {
        await api.post('/admin/scheduler/start');
      }
      const response = await api.get('/admin/scheduler/status');
      setSchedulerStatus(response.data);
    } catch (error) {
      console.error('Error toggling scheduler:', error);
    }
  };

  const resolveError = async (errorId: string) => {
    try {
      await api.post(`/admin/logs/errors/${errorId}/resolve`);
      fetchLogs('errors');
    } catch (error) {
      console.error('Error resolving error:', error);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchInitialData();
    if (activeTab === 'logs') {
      await fetchLogs(logType);
    }
    setIsRefreshing(false);
  };

  const getCurrentLogs = (): LogsResponse | null => {
    switch (logType) {
      case 'api': return apiLogs;
      case 'errors': return errorLogs;
      case 'audit': return auditLogs;
      case 'scrapers': return scraperLogs;
      case 'ai': return aiLogs;
      case 'jobs': return jobLogs;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return <Badge className="bg-green-500/20 text-green-600">Completed</Badge>;
      case 'failed':
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
      case 'started':
        return <Badge className="bg-blue-500/20 text-blue-600">Running</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-500/20 text-green-600',
      POST: 'bg-blue-500/20 text-blue-600',
      PUT: 'bg-yellow-500/20 text-yellow-600',
      DELETE: 'bg-red-500/20 text-red-600',
      PATCH: 'bg-purple-500/20 text-purple-600',
    };
    return <Badge className={colors[method] || 'bg-gray-500/20 text-gray-600'}>{method}</Badge>;
  };

  if (isLoading) {
    return <AdminSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System monitoring, logs, and management
          </p>
        </div>
        <Button variant="outline" onClick={refreshData} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="gap-2">
            <Clock className="h-4 w-4" />
            Scheduler
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="scrapers" className="gap-2">
            <Database className="h-4 w-4" />
            Scrapers
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.users.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Briefcase className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.portfolios.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Portfolios</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.stocks.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Stocks Tracked</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-yellow-500/10">
                    <Newspaper className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.news.total || 0}</p>
                    <p className="text-sm text-muted-foreground">News Articles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mt-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Scheduler</span>
                  <Badge className={schedulerStatus?.is_running ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}>
                    {schedulerStatus?.is_running ? 'Running' : 'Stopped'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Scheduled Jobs</span>
                  <span className="font-medium">{stats?.scheduler.job_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Unresolved Errors</span>
                  <Badge variant={stats?.errors.unresolved ? 'destructive' : 'secondary'}>
                    {stats?.errors.unresolved || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Transactions</span>
                  <span className="font-medium">{stats?.transactions.total || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* AI Usage Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Requests</span>
                  <span className="font-medium">{aiStats?.total_requests || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Tokens</span>
                  <span className="font-medium">{(aiStats?.total_tokens || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="font-medium">${aiStats?.total_cost?.toFixed(4) || '0.00'}</span>
                </div>
                {aiStats?.by_service && Object.entries(aiStats.by_service).map(([service, data]: [string, any]) => (
                  <div key={service} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{service}</span>
                    <span>{data.requests} requests</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scheduler Tab */}
        <TabsContent value="scheduler">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Scheduler Control
                  </CardTitle>
                  <Button
                    variant={schedulerStatus?.is_running ? 'destructive' : 'default'}
                    size="sm"
                    onClick={toggleScheduler}
                  >
                    {schedulerStatus?.is_running ? (
                      <>
                        <Square className="mr-2 h-4 w-4" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  Manage the background job scheduler
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg ${schedulerStatus?.is_running ? 'bg-green-500/10' : 'bg-muted'} text-center`}>
                  <p className="text-lg font-medium">
                    {schedulerStatus?.is_running ? 'Scheduler is running' : 'Scheduler is stopped'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {schedulerStatus?.jobs.length || 0} jobs scheduled
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scheduled Jobs</CardTitle>
                <CardDescription>List of all scheduled background jobs</CardDescription>
              </CardHeader>
              <CardContent>
                {schedulerStatus?.jobs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No jobs scheduled</p>
                ) : (
                  <div className="space-y-3">
                    {schedulerStatus?.jobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{job.name}</p>
                          <p className="text-sm text-muted-foreground">{job.trigger}</p>
                        </div>
                        <div className="text-right text-sm">
                          {job.next_run ? (
                            <>
                              <p className="font-medium">{format(new Date(job.next_run), 'HH:mm')}</p>
                              <p className="text-muted-foreground">
                                {formatDistanceToNow(new Date(job.next_run), { addSuffix: true })}
                              </p>
                            </>
                          ) : (
                            <p className="text-muted-foreground">Not scheduled</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  System Logs
                </CardTitle>
                <Select value={logType} onValueChange={(v) => { setLogType(v); setLogsPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">API Logs</SelectItem>
                    <SelectItem value="errors">Error Logs</SelectItem>
                    <SelectItem value="audit">Audit Trail</SelectItem>
                    <SelectItem value="scrapers">Scraper Logs</SelectItem>
                    <SelectItem value="ai">AI Usage Logs</SelectItem>
                    <SelectItem value="jobs">Job Logs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {getCurrentLogs() === null ? (
                <TableSkeleton rows={8} columns={5} />
              ) : getCurrentLogs()?.logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No logs found</p>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-left">Time</th>
                          {logType === 'api' && (
                            <>
                              <th className="p-3 text-left">Method</th>
                              <th className="p-3 text-left">Path</th>
                              <th className="p-3 text-left">Status</th>
                              <th className="p-3 text-left">Duration</th>
                            </>
                          )}
                          {logType === 'errors' && (
                            <>
                              <th className="p-3 text-left">Type</th>
                              <th className="p-3 text-left">Message</th>
                              <th className="p-3 text-left">Severity</th>
                              <th className="p-3 text-left">Resolved</th>
                              <th className="p-3 text-left">Actions</th>
                            </>
                          )}
                          {logType === 'audit' && (
                            <>
                              <th className="p-3 text-left">Action</th>
                              <th className="p-3 text-left">Entity Type</th>
                              <th className="p-3 text-left">Entity ID</th>
                              <th className="p-3 text-left">IP Address</th>
                            </>
                          )}
                          {logType === 'scrapers' && (
                            <>
                              <th className="p-3 text-left">Scraper</th>
                              <th className="p-3 text-left">Status</th>
                              <th className="p-3 text-left">Processed</th>
                              <th className="p-3 text-left">Duration</th>
                            </>
                          )}
                          {logType === 'ai' && (
                            <>
                              <th className="p-3 text-left">Service</th>
                              <th className="p-3 text-left">Model</th>
                              <th className="p-3 text-left">Tokens</th>
                              <th className="p-3 text-left">Cost</th>
                              <th className="p-3 text-left">Feature</th>
                            </>
                          )}
                          {logType === 'jobs' && (
                            <>
                              <th className="p-3 text-left">Job Name</th>
                              <th className="p-3 text-left">Type</th>
                              <th className="p-3 text-left">Status</th>
                              <th className="p-3 text-left">Duration</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {getCurrentLogs()?.logs.map((log) => (
                          <tr key={log.id} className="border-b">
                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                            </td>
                            {logType === 'api' && (
                              <>
                                <td className="p-3">{getMethodBadge(log.method)}</td>
                                <td className="p-3 max-w-[200px] truncate">{log.path}</td>
                                <td className="p-3">
                                  <Badge className={log.status_code >= 400 ? 'bg-red-500/20 text-red-600' : 'bg-green-500/20 text-green-600'}>
                                    {log.status_code}
                                  </Badge>
                                </td>
                                <td className="p-3">{log.duration_ms}ms</td>
                              </>
                            )}
                            {logType === 'errors' && (
                              <>
                                <td className="p-3">{log.error_type}</td>
                                <td className="p-3 max-w-[200px] truncate">{log.error_message}</td>
                                <td className="p-3">
                                  <Badge className={
                                    log.severity === 'critical' ? 'bg-red-500/20 text-red-600' :
                                    log.severity === 'error' ? 'bg-orange-500/20 text-orange-600' :
                                    'bg-yellow-500/20 text-yellow-600'
                                  }>
                                    {log.severity}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  {log.resolved ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  )}
                                </td>
                                <td className="p-3">
                                  {!log.resolved && (
                                    <Button variant="ghost" size="sm" onClick={() => resolveError(log.id)}>
                                      Resolve
                                    </Button>
                                  )}
                                </td>
                              </>
                            )}
                            {logType === 'audit' && (
                              <>
                                <td className="p-3 capitalize">{log.action}</td>
                                <td className="p-3 capitalize">{log.entity_type}</td>
                                <td className="p-3 max-w-[100px] truncate">{log.entity_id || '-'}</td>
                                <td className="p-3">{log.ip_address || '-'}</td>
                              </>
                            )}
                            {logType === 'scrapers' && (
                              <>
                                <td className="p-3">{log.scraper_name}</td>
                                <td className="p-3">{getStatusBadge(log.status)}</td>
                                <td className="p-3">
                                  {log.records_processed} ({log.records_created} new, {log.records_updated} updated)
                                </td>
                                <td className="p-3">{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}</td>
                              </>
                            )}
                            {logType === 'ai' && (
                              <>
                                <td className="p-3 capitalize">{log.service}</td>
                                <td className="p-3">{log.model}</td>
                                <td className="p-3">{log.total_tokens?.toLocaleString()}</td>
                                <td className="p-3">${log.cost_estimate?.toFixed(4) || '0.00'}</td>
                                <td className="p-3 capitalize">{log.feature || '-'}</td>
                              </>
                            )}
                            {logType === 'jobs' && (
                              <>
                                <td className="p-3">{log.job_name}</td>
                                <td className="p-3 capitalize">{log.job_type}</td>
                                <td className="p-3">{getStatusBadge(log.status)}</td>
                                <td className="p-3">{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {((logsPage - 1) * 20) + 1} - {Math.min(logsPage * 20, getCurrentLogs()?.total || 0)} of {getCurrentLogs()?.total || 0}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                        disabled={logsPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogsPage(p => p + 1)}
                        disabled={logsPage * 20 >= (getCurrentLogs()?.total || 0)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scrapers Tab */}
        <TabsContent value="scrapers">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { type: 'stocks', name: 'Stock Prices', desc: 'Update PSX stock prices and fundamentals', icon: TrendingUp },
              { type: 'fundamentals', name: 'Fundamentals', desc: 'Update PE, Market Cap, EPS, etc.', icon: Database },
              { type: 'commodities', name: 'Commodities', desc: 'Update gold/silver prices', icon: Zap },
              { type: 'news', name: 'News', desc: 'Scrape news from all sources', icon: Newspaper },
              { type: 'process', name: 'Process News', desc: 'Process unprocessed news with AI', icon: Bot },
              { type: 'all', name: 'Run All', desc: 'Run all scrapers sequentially', icon: RefreshCw },
            ].map(({ type, name, desc, icon: Icon }) => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {name}
                  </CardTitle>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant={type === 'all' ? 'default' : 'outline'}
                    onClick={() => triggerScrape(type)}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Run Scraper
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
