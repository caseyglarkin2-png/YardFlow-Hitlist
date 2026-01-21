'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function DashboardNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Events', href: '/dashboard/events' },
    { name: 'Accounts', href: '/dashboard/accounts' },
    { name: 'People', href: '/dashboard/people' },
    { name: 'Outreach', href: '/dashboard/outreach' },
    { name: 'Campaigns', href: '/dashboard/campaigns' },
    { name: 'Workflows', href: '/dashboard/workflows' },
    { name: 'Activity', href: '/dashboard/activity' },
    { name: 'Meetings', href: '/dashboard/meetings' },
    { name: 'Analytics', href: '/dashboard/analytics' },
    { name: 'Engagement', href: '/dashboard/engagement' },
    { name: 'Search', href: '/dashboard/search' },
    { name: 'Export', href: '/dashboard/export' },
  ];

  return (
    <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
            isActive(item.href)
              ? 'border-blue-500 text-gray-900'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );
}
