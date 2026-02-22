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
import { AlertTriangle, Clock, CheckCircle2, Wrench, RefreshCw } from "lucide-react";
import { ConditionBadge, PriorityBadge } from "@/components/ui/status-badge";

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

type ReplacementAlert = {
  interventionId: string;
  interventionName: string;
  scenarioName: string;
  startYear: number;
  technicalAssetLife: number;
  replacementYear: number;
};

type Props = {
  eolAlerts: EolAlert[];
  overdueInterventions: OverdueIntervention[];
  stalledInterventions: StalledIntervention[];
  replacementAlerts: ReplacementAlert[];
};

const currentYear = new Date().getFullYear();

export function AlertsView({ eolAlerts, overdueInterventions, stalledInterventions, replacementAlerts }: Props) {
  const totalAlerts = eolAlerts.length + overdueInterventions.length + stalledInterventions.length + replacementAlerts.length;

  if (totalAlerts === 0) {
    return (
      <Card className="border-gray-200 dark:border-slate-700 shadow-none bg-white dark:bg-slate-800">
        <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="font-medium text-gray-900 dark:text-white">No active alerts</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            All assets are within their expected service lives and interventions are on track.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* EOL Alerts */}
      <Card className="border-gray-200 dark:border-slate-700 shadow-none bg-white dark:bg-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-white">
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
            <p className="text-sm text-gray-500 dark:text-slate-400 px-6 pb-6">No assets approaching end of life.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50 dark:bg-slate-800/80">
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
                  <TableRow key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <TableCell className="font-medium text-sm dark:text-white">{a.name}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-400">
                      {a.site?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-400">{a.assetType}</TableCell>
                    <TableCell>
                      <ConditionBadge rating={a.conditionRating as "RED" | "AMBER" | "GREEN"} />
                    </TableCell>
                    <TableCell className="text-sm dark:text-slate-300">{a.eolYear}</TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-medium ${
                          a.yearsRemaining <= 0
                            ? "text-red-600 dark:text-red-400"
                            : a.yearsRemaining <= 2
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-yellow-600 dark:text-yellow-400"
                        }`}
                      >
                        {a.yearsRemaining <= 0
                          ? `${Math.abs(a.yearsRemaining)}yr overdue`
                          : `${a.yearsRemaining}yr`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={a.replacementPriority as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Overdue Interventions */}
      <Card className="border-gray-200 dark:border-slate-700 shadow-none bg-white dark:bg-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-white">
            <Clock className="h-4 w-4 text-orange-500" />
            Overdue Interventions
            {overdueInterventions.length > 0 && (
              <Badge className="ml-auto text-xs bg-orange-100 text-orange-700 border-orange-200 border dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50">
                {overdueInterventions.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {overdueInterventions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400 px-6 pb-6">No overdue interventions.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50 dark:bg-slate-800/80">
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
                  <TableRow key={i.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <TableCell className="font-medium text-sm dark:text-white">{i.name}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-400">
                      {i.site?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-400">{i.category}</TableCell>
                    <TableCell className="text-sm dark:text-slate-300">{i.implementationStartYear}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        {currentYear - i.implementationStartYear}yr
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-400">{i.owner ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stalled Interventions */}
      <Card className="border-gray-200 dark:border-slate-700 shadow-none bg-white dark:bg-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-white">
            <Wrench className="h-4 w-4 text-yellow-500" />
            Stalled In-Progress Interventions
            {stalledInterventions.length > 0 && (
              <Badge className="ml-auto text-xs bg-yellow-100 text-yellow-700 border-yellow-200 border dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50">
                {stalledInterventions.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stalledInterventions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400 px-6 pb-6">No stalled interventions.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50 dark:bg-slate-800/80">
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
                  <TableRow key={i.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <TableCell className="font-medium text-sm dark:text-white">{i.name}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-400">
                      {i.site?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-400">{i.category}</TableCell>
                    <TableCell className="text-sm dark:text-slate-300">{i.fullBenefitYear}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        {currentYear - i.fullBenefitYear}yr
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-400">{i.owner ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Replacement Alerts */}
      <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-white">
            <RefreshCw className="h-4 w-4 text-amber-500" />
            Assets Requiring Replacement Before 2050
            {replacementAlerts.length > 0 && (
              <Badge className="ml-auto text-xs bg-amber-100 text-amber-700 border-amber-200 border dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50">
                {replacementAlerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {replacementAlerts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400 px-6 pb-6">
              No interventions require replacement before 2050.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-amber-50/50 dark:bg-amber-900/20">
                  <TableHead>Intervention</TableHead>
                  <TableHead>Scenario</TableHead>
                  <TableHead>Start Year</TableHead>
                  <TableHead>Asset Life</TableHead>
                  <TableHead>Replacement Year</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {replacementAlerts.map((a) => (
                  <TableRow key={a.interventionId} className="hover:bg-amber-50/60 dark:hover:bg-amber-900/20 transition-colors">
                    <TableCell className="font-medium text-sm dark:text-white">{a.interventionName}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-400">{a.scenarioName}</TableCell>
                    <TableCell className="text-sm dark:text-slate-300">{a.startYear}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-400">{a.technicalAssetLife} yrs</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        {a.replacementYear}
                      </span>
                    </TableCell>
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
