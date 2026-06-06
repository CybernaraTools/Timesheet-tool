import React from 'react';
import Badge from '../ui/Badge';

export default function LockBadge({ isLocked }) {
  return isLocked ? (
    <Badge variant="danger">Locked</Badge>
  ) : (
    <Badge variant="success">Unlocked</Badge>
  );
}
