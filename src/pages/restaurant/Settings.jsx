import React from 'react';
import { ExternalLink, Code2, Zap, Globe } from 'lucide-react';

export default function Settings() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Impostazioni</h1>

      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Backend & Integrazioni</h2>

        <a
          href="https://base44.app/apps/69cfa945a182b6ae303e88a8/code/functions"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/50 hover:bg-card/80 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Backend Functions</p>
              <p className="text-xs text-muted-foreground">Gestisci le funzioni server: Stripe, webhook, email</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </a>

        <a
          href="https://base44.app/apps/69cfa945a182b6ae303e88a8/code/automations"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/50 hover:bg-card/80 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-sm">Automazioni</p>
              <p className="text-xs text-muted-foreground">Scheduled tasks, trigger su entità, webhook</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </a>

        <a
          href="https://base44.app/apps/69cfa945a182b6ae303e88a8/settings"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/50 hover:bg-card/80 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">Impostazioni App</p>
              <p className="text-xs text-muted-foreground">Secrets, dominio, variabili d'ambiente</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </a>
      </div>
    </div>
  );
}