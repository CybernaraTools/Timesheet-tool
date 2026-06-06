import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { parseISO, format } from 'date-fns';

export default function HoursByDayChart({ data = [], title = "Daily work allocation" }) {
  const chartData = data.map((d) => {
    let dayLabel = d.date;
    try {
      dayLabel = format(parseISO(d.date), 'EEE'); // Mon, Tue...
    } catch (e) {
      // fallback
    }
    return {
      day: dayLabel,
      hours: d.hours,
      rawDate: d.date
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-card border border-hairline p-3 rounded-sm">
          <p className="text-[10px] font-bold uppercase tracking-[1px] text-muted-text">
            {payload[0].payload.rawDate}
          </p>
          <p className="text-sm font-bold text-primary-text uppercase mt-1">
            Hours: {payload[0].value.toFixed(1)} hrs
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-surface-card border border-hairline p-6 rounded-md space-y-4">
      {title && (
        <h3 className=" font-semibold   text-muted-text">
          {title}
        </h3>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--hairline)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="var(--muted-text)"
              tickLine={false}
              tick={{ fontSize: 11, fontWeight: 700 }}
            />
            <YAxis
              stroke="var(--muted-text)"
              tickLine={false}
              tick={{ fontSize: 11, fontWeight: 300 }}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-soft)', opacity: 0.4 }} />
            <Bar dataKey="hours" fill="#cc785c" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
