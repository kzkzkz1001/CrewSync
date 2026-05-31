const colours: Record<string, string> = {
  DRAFT:      'bg-gray-100 text-gray-600',
  OPTIMIZED:  'bg-blue-100 text-blue-700',
  ACTIVE:     'bg-green-100 text-green-700',
  COMPLETED:  'bg-purple-100 text-purple-700',
  CANCELLED:  'bg-red-100 text-red-600',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colours[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
