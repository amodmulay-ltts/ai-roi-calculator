import type { ReactElement } from 'react';
import type { ValidationIssue } from '@ai-roi-calc/bizcase';

export default function IssueList({ issues }: { issues: ValidationIssue[] }): ReactElement | null {
  if (issues.length === 0) return null;
  return (
    <ul className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-1">
      {issues.map(issue => (
        <li key={issue.field}>{issue.message}</li>
      ))}
    </ul>
  );
}
