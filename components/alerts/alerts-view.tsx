"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Clock, CheckCircle2, Wrench } from "lucide-react";

type EolAlert = {
  id: string;
  name: string;
  assetType: string;
  conditionRating: string;
  replacementPriority: string;
  installationYear: number;
  expectedUsefulLife: number;
  alertThresholdYears: number;
  eolYear: number;
  yearsRemaining: number;
  site: { id: string; name: string } | null;
};

type OverdueIntervention = {
  id: string;
  name: string;
  category: string;
  implementationStartYear: number;
  status: string;
  owner: string | null;
  site: { id: string; name: string } | null;
};

type StalledIntervention = {
  id: string;
  name: string;
  category: string;
  fullBenefitYear: number;
  status: string;
  owner: string | null;
  site: { id: string; name: string } | null;
};

type Props = {
  eolAlerts: EolAlert[];
  overdueInterventions: OverdueIntervention[];
  stalledInterventions: StalledIntervention[];
};

const currentYear = new Date().getFullYear();

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-700 border-red-200",
    HIGH: "bg-orange-100 text-orange-700 border-orange-200",
    MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
    LOW: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
        map[priority] ?? map.LOW
      }`}
    >
      {priority}
    </span>
  );
}

function conditionBadge(rating: string) {
  const map: Record<string, string> = {
    RED: "bg-red-100 text-red-700 border-red-200",
    AMBER: "bg-amber-100 text-amber-700 border-amber-200",
    GREEN: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
        map[rating] ?? ""
      }`}
    >
      {rating}
    </span>
  );
}

export function AlertsView({ eolAlerts, overdueInterventions, stalledInterventions }: Props) {
  const totalAlerts = eolAlerts.length + overdueInterventions.length + stalledInterventions.length;

  if (totalAlerts === 0) {
    return (
      <Card className="border-gray-200 shadow-none">
        <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="font-medium text-gray-900">No active alerts</p>
          <p className="text-sm text-gray-500">
            All assets are within their expected service lives and interventions are on track.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* EOL Alerts */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            End-of-Life Alerts
            {eolAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-auto text-xs">
                {eolAlerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {eolAlerts.length === 0 ? (
            <p className="text-sm text-gray-500 px-6 pb-6">No assets approaching end of life.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Asset</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>EOL Year</TableHead>
                  <TableHead>Years Remaining</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eolAlerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-sm">{a.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {a.site?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{a.assetType}</TableCell>
                    <TableCell>{conditionBadge(a.conditionRating)}</TableCell>
                    <TableCell className="text-sm">{a.eolYear}</TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-medium ${
                          a.yearsRemaining <= 0
                            ? "text-red-600"
                            : a.yearsRemaining <= 2
                            ? "text-orange-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {a.yearsRemaining <= 0
                          ? `${Math.abs(a.yearsRemaining)}yr overdue`
                          : `${a.yearsRemaining}yr`}
                      </span>
                    </TableCell>
                    <TableCell>{priorityBadge(a.replacementPriority)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Overdue Interventions */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Overdue Interventions
            {overdueInterventions.length > 0 && (
              <Badge className="ml-auto text-xs bg-orange-100 text-orange-700 border-orange-200 border">
                {overdueInterventions.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {overdueInterventions.length === 0 ? (
            <p className="text-sm text-gray-500 px-6 pb-6">No overdue interventions.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Intervention</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Planned Start</TableHead>
                  <TableHead>Years Overdue</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInterventions.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium text-sm">{i.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {i.site?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{i.category}</TableCell>
                    <TableCell className="text-sm">{i.implementationStartYear}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-orange-600">
                        {currentYear - i.implementationStartYear}yr
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{i.owner ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stalled Interventions */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4 text-yellow-500" />
            Stalled In-Progress Interventions
            {stalledInterventions.length > 0 && (
              <Badge className="ml-auto text-xs bg-yellow-100 text-yellow-700 border-yellow-200 border">
                {stalledInterventions.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stalledInterventions.length === 0 ? (
            <p className="text-sm text-gray-500 px-6 pb-6">No stalled interventions.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Intervention</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Full Benefit Year</TableHead>
                  <TableHead>Years Past Target</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stalledInterventions.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium text-sm">{i.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {i.site?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{i.category}</TableCell>
                    <TableCell className="text-sm">{i.fullBenefitYear}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-yellow-600">
                        {currentYear - i.fullBenefitYear}yr
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{i.owner ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
