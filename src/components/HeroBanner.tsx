import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonthSelector } from '@/routes/_authenticated/relatorios'; // assuming exists
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { formatBRL } from '@/lib/finance-constants';

export function HeroBanner({ balance, growth, forecastData, year, month, setYear, setMonth }: {
  balance: number;
  growth: number; // percentage
  forecastData: any[];
  year: number;
  month: number;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
}) {
  const monthLabel = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-6">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-3xl font-bold text-positive">{formatBRL(balance)}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Saldo atual • {monthLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          <Button className="bg-positive hover:bg-positive/80 text-white">Atualizar</Button>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-success">
          <span className="text-lg font-medium">+{growth}%</span>
          <span className="text-sm">crescimento</span>
        </div>
        <div className="w-48 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-positive)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-positive)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="var(--color-positive)" fill="url(#gradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
