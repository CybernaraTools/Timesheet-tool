import React from 'react';
import Badge from '../ui/Badge';

export default function LockBadge({ isLocked, createdAt }) {
  const isWithinCoolingPeriod = () => {
    if (!createdAt) return false;
    const timeElapsedMs = new Date() - new Date(createdAt);
    return timeElapsedMs <= 5 * 60 * 1000;
  };

  if (isLocked) {
    if (isWithinCoolingPeriod()) {
      return <Badge variant="warning">Cooling Period</Badge>;
    }
    return <Badge variant="danger">Locked</Badge>;
  }

  return <Badge variant="success">Unlocked</Badge>;
}
