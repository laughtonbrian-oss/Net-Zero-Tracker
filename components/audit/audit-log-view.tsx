"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClipboardList, Search } from "lucide-react";

type AuditEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: string;
  timestamp: Date;
  user: { id: string; name: string | null; email: string | null };
};

type Props = { logs: AuditEntry[] };

const ACTION_COLOURS: Record<string, string> = {
  created: "bg-emerald-100 text-emerald-700 border-emerald-200",
  updated: "bg-blue-100 text-blue-700 border-blue-200",
  deleted: "bg-red-100 text-red-700 border-red-200",
};

function formatTimestamp(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function DiffView({ changes }: { changes: string }) {
  let parsed: { before?: Record<string, unknown>; after?: Record<string, unknown> } = {};
  try { parsed = JSON.parse(changes); } catch { /* skip */ }
  const { before, after } = parsed;

  if (!before && !after) return <pre className="text-xs text-gray-500">{changes}</pre>;

  // collect all keys
  const allKeys = Array.from(
    new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  ).filter((k) => k !== "updatedAt" && k !== "createdAt");

  return (
    <div className="space-y-1 text-xs font-mono">
      {allKeys.map((key) => {
        const bv = before?.[key];
        const av = after?.[key];
        const changed = JSON.stringify(bv) !== JSON.stringify(av);
        return (
          <div key={key} className={changed ? "text-gray-900" : "text-gray-400"}>
            <span className="font-semibold text-gray-600">{key}: </span>
            {bv !== undefined && (
              <span className="line-through text-red-500">{JSON.stringify(bv)}</span>
            )}
            {bv !== undefined && av !== undefined && (
              <span className="mx-1 text-gray-400">→</span>
            )}
            {av !== undefined && (
              <span className="text-emerald-700">{JSON.stringify(av)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const ENTITY_TYPES = ["all", "intervention", "scenario", "asset", "baseline", "target", "site", "user"];
const ACTIONS = ["all", "created", "updated", "deleted"];

export function AuditLogView({ logs }: Props) {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (entityFilter !== "all" && l.entityType !== entityFilter) return false;
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const userName = (l.user.name ?? l.user.email ?? "").toLowerCase();
        if (!l.entityType.includes(q) && !l.action.includes(q) && !userName.includes(q) && !l.entityId.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, entityFilter, actionFilter]);

  if (logs.length === 0) {
    return (
      <Card className="border-gray-200 shadow-none">
        <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-900">No audit entries yet</p>
          <p className="text-sm text-gray-500">Changes to your data will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by user or entity…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t === "all" ? "All entities" : t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{a === "all" ? "All actions" : a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} entries</span>
      </div>

      <Card className="border-gray-200 shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-44">Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelected(log)}
                >
                  <TableCell className="text-xs text-gray-500 font-mono">
                    {formatTimestamp(log.timestamp)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.user.name ?? log.user.email ?? "System"}
                  </TableCell>
                  <TableCell className="text-sm capitalize">{log.entityType}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                        ACTION_COLOURS[log.action] ?? "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-gray-400 font-mono">
                    {log.entityId.slice(0, 12)}…
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-gray-400 py-8">
                    No entries match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diff detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="capitalize">{selected?.entityType}</span>
              <Badge variant="outline" className="capitalize">{selected?.action}</Badge>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">User</p>
                  <p className="font-medium">{selected.user.name ?? selected.user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Timestamp</p>
                  <p className="font-medium font-mono text-xs">{formatTimestamp(selected.timestamp)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Entity ID</p>
                  <p className="font-mono text-xs text-gray-600">{selected.entityId}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Changes</p>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <DiffView changes={selected.changes} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
