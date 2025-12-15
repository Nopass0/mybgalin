'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ExternalLink, Play, Square, Activity, AlertCircle, RefreshCw } from 'lucide-react';

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  createdAt: string;
  updatedAt: string;
}

export default function N8nAdminPage() {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Note: effectively we'd need a backend proxy to call n8n API safely
  // For now, this assumes a proxy endpoint exists or CORS is allowed (unlikely for production n8n key)
  // We will assume a future /api/admin/n8n endpoint is created
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      // Mock data for now until API proxy is ready
      // const res = await fetch('/api/admin/n8n/workflows');
      // const data = await res.json();
      
      // Simulate fetch
      await new Promise(r => setTimeout(r, 800));
      const mockData: N8nWorkflow[] = [
        { id: '1', name: 'Telegram Bot Handler', active: true, nodes: [], createdAt: '2024-01-01', updatedAt: '2024-01-02' },
        { id: '2', name: 'Email Parser', active: false, nodes: [], createdAt: '2024-01-03', updatedAt: '2024-01-04' },
      ];
      setWorkflows(mockData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-pink-600 bg-clip-text text-transparent">
            n8n Automation
          </h1>
          <p className="text-muted-foreground mt-2">Manage your workflows and automations</p>
        </div>
        <div className="flex gap-4">
            <Button variant="outline" onClick={fetchWorkflows} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
            </Button>
            <Button asChild className="bg-[#FF6D5A] hover:bg-[#E55C4B]">
            <a href="https://bgalin.ru/n8n/" target="_blank" rel="noopener noreferrer">
                Open n8n Editor <ExternalLink className="w-4 h-4 ml-2" />
            </a>
            </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-red-500 bg-red-500/10 text-red-500 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="p-6 space-y-4 hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-[#FF6D5A]">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{workflow.name}</h3>
                <p className="text-xs text-muted-foreground">ID: {workflow.id}</p>
              </div>
              <Activity className={`w-5 h-5 ${workflow.active ? 'text-green-500' : 'text-gray-400'}`} />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Switch checked={workflow.active} />
                <span className="text-sm text-muted-foreground">{workflow.active ? 'Active' : 'Inactive'}</span>
              </div>
              <Badge variant={workflow.active ? 'default' : 'secondary'}>
                {workflow.active ? 'Running' : 'Stopped'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="ghost" size="sm" className="w-full justify-start text-green-500 hover:text-green-600 hover:bg-green-500/10">
                    <Play className="w-3 h-3 mr-2" /> Exec
                </Button>
                 <Button variant="ghost" size="sm" className="w-full justify-start text-blue-500 hover:text-blue-600 hover:bg-blue-500/10">
                    <ExternalLink className="w-3 h-3 mr-2" /> Edit
                </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
