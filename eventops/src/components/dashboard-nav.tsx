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
    { name: 'Enrich', href: '/dashboard/people/enrich' },
    { name: 'Templates', href: '/dashboard/templates' },
    { name: 'Outreach', href: '/dashboard/outreach' },
    { name: 'Campaigns', href: '/dashboard/campaigns' },
    { name: 'Manifest', href: '/dashboard/manifest/requests' },
    { name: 'Import', href: '/dashboard/import' },
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
