import React from 'react';
import Card from '../ui/Card';
import { Clock, Users, Tag, Briefcase } from 'lucide-react';

export default function TeamSummaryCards({ summary, title = "Team summary this week" }) {
  const cards = [
    {
      title: "Total Hours",
      value: summary?.totalHoursThisWeek !== undefined ? `${summary.totalHoursThisWeek} hrs` : "0.0 hrs",
      icon: Clock,
      color: "text-[#1c69d4]"
    },
    {
      title: "Active Members",
      value: summary?.activeMembers !== undefined ? summary.activeMembers : 0,
      icon: Users,
      color: "text-[#0fa336]"
    },
    {
      title: "Top Category",
      value: summary?.topCategory || "N/A",
      icon: Tag,
      color: "text-[#f4b400]"
    },
    {
      title: "Top Client",
      value: summary?.topClient || "None",
      icon: Briefcase,
      color: "text-[#e22718]"
    }
  ];

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-xl font-bold  tracking-[1.5px] text-muted-text">
          {title}
        </h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="bg-surface-card border border-hairline p-6 rounded-md flex items-center justify-between"
            >
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[1px] text-muted-text">
                  {c.title}
                </p>
                <p className="text-2xl  text-primary-text tracking-[0.5px] font-serif">
                  {c.value}
                </p>
              </div>
              <div className={`p-3 bg-surface-soft border border-hairline rounded-md ${c.color}`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
