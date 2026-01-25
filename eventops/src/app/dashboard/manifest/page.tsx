import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ManifestPage() {
  const session = await auth();
  if (!session?.user) return <div>Unauthorized</div>;

  // Fetch Manifest 2026 Event accounts/people
  // We use the event name/ID or just query by source note/industry for now
  const accounts = await prisma.target_accounts.findMany({
    where: {
      notes: { contains: 'Manifest2026' },
    },
    include: {
      people: true,
    },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Manifest 2026 Hitlist</h1>
        <div className="flex gap-2">
            <Button variant="outline">Import More Data</Button>
            <Button>Sync Requests</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">Logistics companies</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Priority Targets</CardTitle>
          <CardDescription>Generated from Hitlist v3</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>ICP Score</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{account.notes?.match(/Tier: (Tier \d)/)?.[1] || 'Tier 3'}</Badge>
                  </TableCell>
                  <TableCell>{account.icpScore}</TableCell>
                  <TableCell>{account.people.length}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">View Dossier</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
