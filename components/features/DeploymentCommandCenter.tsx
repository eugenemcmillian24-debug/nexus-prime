'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  Search, 
  Terminal,
  RefreshCw,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface DeploymentIssue {
  type: 'error' | 'warning' | 'performance';
  message: string;
  file?: string;
  suggestion?: string;
}

interface DeploymentHealth {
  status: 'healthy' | 'warning' | 'error';
  summary: string;
  issues: DeploymentIssue[];
  metrics: {
    buildTime: string;
    bundleSize: string;
    errorRate: string;
  };
}

export default function DeploymentCommandCenter({ projectId }: { projectId: string }) {
  const [health, setHealth] = useState<DeploymentHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string>('');

  const analyzeHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/deployments/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, logs })
      });
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Failed to analyze deployment health:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeHealth();
  }, [projectId]);

  if (!health && loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-muted-foreground animate-pulse">Analyzing production health...</p>
      </div>
    );
  }

  const StatusIcon = {
    healthy: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
    error: <XCircle className="w-6 h-6 text-red-500" />,
  }[health?.status || 'healthy'];

  const statusColor = {
    healthy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
  }[health?.status || 'healthy'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Summary */}
      <div className={cn("p-6 rounded-xl border flex items-center justify-between", statusColor)}>
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/5 rounded-full">{StatusIcon}</div>
          <div>
            <h2 className="text-xl font-bold capitalize">System {health?.status || 'Status Unknown'}</h2>
            <p className="text-sm opacity-80">{health?.summary || 'Initializing monitoring agent...'}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-white/5 hover:bg-white/10"
          onClick={analyzeHealth}
          disabled={loading}
        >
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh Metrics
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Metrics */}
        <Card className="bg-[#050505] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Clock className="w-4 h-4 mr-2" /> Build Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{health?.metrics.buildTime || '0s'}</div>
            <Progress value={75} className="h-1 mt-3 bg-white/5" indicatorClassName="bg-emerald-500" />
            <p className="text-xs text-muted-foreground mt-2">Optimal: &lt; 30s</p>
          </CardContent>
        </Card>

        <Card className="bg-[#050505] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Zap className="w-4 h-4 mr-2" /> Bundle Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{health?.metrics.bundleSize || '0 KB'}</div>
            <Progress value={45} className="h-1 mt-3 bg-white/5" indicatorClassName="bg-blue-500" />
            <p className="text-xs text-muted-foreground mt-2">Budget: 1.5 MB</p>
          </CardContent>
        </Card>

        <Card className="bg-[#050505] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2" /> Error Rate (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{health?.metrics.errorRate || '0%'}</div>
            <Progress value={10} className="h-1 mt-3 bg-white/5" indicatorClassName="bg-red-500" />
            <p className="text-xs text-muted-foreground mt-2">Critical: &gt; 1%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detected Issues */}
        <Card className="bg-[#050505] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Activity className="w-5 h-5 mr-2 text-emerald-500" /> Actionable Insights
            </CardTitle>
            <CardDescription>AI-detected bottlenecks and runtime anomalies</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {health?.issues.map((issue, i) => (
                  <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={issue.type === 'error' ? 'destructive' : 'outline'} className="uppercase text-[10px]">
                        {issue.type}
                      </Badge>
                      {issue.file && <span className="text-[10px] text-muted-foreground font-mono">{issue.file}</span>}
                    </div>
                    <p className="text-sm font-medium text-white">{issue.message}</p>
                    {issue.suggestion && (
                      <div className="flex items-start p-2 rounded bg-emerald-500/10 border border-emerald-500/20 mt-2">
                        <Zap className="w-3 h-3 text-emerald-500 mr-2 mt-0.5" />
                        <p className="text-xs text-emerald-400">{issue.suggestion}</p>
                      </div>
                    )}
                  </div>
                ))}
                {(!health?.issues || health.issues.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
                    <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                    <p>No issues detected in recent builds.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Live Logs Terminal */}
        <Card className="bg-[#050505] border-white/5 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center">
                <Terminal className="w-5 h-5 mr-2 text-emerald-500" /> Deployment Stream
              </CardTitle>
              <CardDescription>Real-time build and serverless output</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="bg-black/40 rounded-lg p-4 font-mono text-xs text-emerald-500/80 h-[300px] overflow-auto border border-white/5 shadow-inner">
              <pre>{logs || `[BUILD] Next.js build started...
[BUILD] Compiling...
[WARN] Large bundle size detected in app/page.tsx (500KB)
[ERROR] Runtime error in components/features/RealtimeCollab.tsx: "Cannot read property 'id' of null"
[BUILD] Build finished in 45s.`}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
