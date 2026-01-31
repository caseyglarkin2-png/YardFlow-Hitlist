'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

// Core navigation items - always visible on desktop (6 items max to prevent overflow)
const coreNavItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Event Day', href: '/dashboard/event-day' }, // War Room - priority for Manifest!
  { name: 'Accounts', href: '/dashboard/accounts' },
  { name: 'People', href: '/dashboard/people' },
  { name: 'Calendar', href: '/dashboard/calendar' },
  { name: 'Outreach', href: '/dashboard/outreach' },
];

// Secondary items - in "More" dropdown on desktop
const moreNavItems = [
  { name: 'Events', href: '/dashboard/events' },
  { name: 'Manifest', href: '/dashboard/manifest' },
  { name: 'Campaigns', href: '/dashboard/campaigns' },
  { name: 'Overview', href: '/dashboard/custom' },
  { name: 'Research', href: '/dashboard/research/bulk' },
  { name: 'Dossiers', href: '/dossier' },
  { name: 'AI Content', href: '/content-generator' },
  { name: 'Agents', href: '/dashboard/agents' },
  { name: 'Workflows', href: '/dashboard/workflows' },
  { name: 'Activity', href: '/dashboard/activity' },
  { name: 'Team', href: '/dashboard/team' },
  { name: 'Analytics', href: '/dashboard/analytics' },
  { name: 'Settings', href: '/dashboard/settings/integrations' },
  { name: 'Help', href: '/dashboard/help' },
];

// All items for mobile menu
const allNavItems = [...coreNavItems, ...moreNavItems];

export function DashboardNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  const linkClasses = (href: string) =>
    `inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium whitespace-nowrap ${
      isActive(href)
        ? 'border-blue-500 text-gray-900'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`;

  return (
    <>
      {/* Mobile hamburger menu - visible below md breakpoint */}
      <div className="md:hidden flex items-center">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-2">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 pt-10">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <nav className="flex flex-col space-y-1">
              {allNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop navigation - visible at md and above */}
      <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
        {/* Core items - always visible */}
        {coreNavItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClasses(item.href)}>
            {item.name}
          </Link>
        ))}

        {/* More dropdown for secondary items */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                moreNavItems.some((item) => isActive(item.href))
                  ? 'border-blue-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              More <ChevronDown className="ml-1 h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {moreNavItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={isActive(item.href) ? 'bg-blue-50 text-blue-700' : ''}
                >
                  {item.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
