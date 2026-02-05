'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Calendar, Mail, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/people', label: 'People', icon: Users },
  { href: '/dashboard/meetings', label: 'Meetings', icon: Calendar },
  { href: '/dashboard/outreach', label: 'Outreach', icon: Mail },
];

const allNavItems = [
  ...mainNavItems,
  { href: '/dashboard/accounts', label: 'Accounts' },
  { href: '/dashboard/campaigns', label: 'Campaigns' },
  { href: '/dashboard/sequences', label: 'Sequences' },
  { href: '/dashboard/templates', label: 'Templates' },
  { href: '/dossier', label: 'Dossiers' },
  { href: '/content-generator', label: 'AI Content' },
  { href: '/dashboard/analytics', label: 'Analytics' },
  { href: '/dashboard/activity', label: 'Activity' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Bottom Navigation - Fixed */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
        <div className="flex h-16 items-center justify-around">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-full flex-1 flex-col items-center justify-center gap-1',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}

          {/* More Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex h-full flex-1 flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <div className="py-4">
                <h3 className="mb-4 text-lg font-semibold">All Pages</h3>
                <nav className="grid gap-2">
                  {allNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                        pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      )}
                    >
                      {'icon' in item && item.icon && <item.icon className="h-4 w-4" />}
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 md:hidden" />
    </>
  );
}
