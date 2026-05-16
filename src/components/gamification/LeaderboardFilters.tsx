import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardFiltersProps {
  period: "weekly" | "monthly";
  onPeriodChange: (period: "weekly" | "monthly") => void;
  filterType: "global" | "friends" | "nearby";
  onFilterChange: (type: "global" | "friends" | "nearby") => void;
  sortBy: "score" | "accuracy" | "consistency" | "improvement";
  onSortChange: (sort: "score" | "accuracy" | "consistency" | "improvement") => void;
  isLoading?: boolean;
}

export const LeaderboardFilters = ({
  period,
  onPeriodChange,
  filterType,
  onFilterChange,
  sortBy,
  onSortChange,
  isLoading = false,
}: LeaderboardFiltersProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Period Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">
                Time Period
              </span>
            </div>
            <Tabs
              value={period}
              onValueChange={(value) =>
                onPeriodChange(value as "weekly" | "monthly")
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Filter Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">
                Leaderboard Type
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={filterType === "global" ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange("global")}
                disabled={isLoading}
                className="text-xs"
              >
                Global
              </Button>
              <Button
                variant={filterType === "friends" ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange("friends")}
                disabled={isLoading}
                className="text-xs"
              >
                Friends
              </Button>
              <Button
                variant={filterType === "nearby" ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange("nearby")}
                disabled={isLoading}
                className="text-xs"
              >
                Nearby
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              {filterType === "global" &&
                "See how you rank among all users worldwide"}
              {filterType === "friends" &&
                "Compete with your friends and study groups"}
              {filterType === "nearby" &&
                "See rankings of users in your rank range"}
            </p>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">
                Sort By
              </span>
            </div>
            <Select value={sortBy} onValueChange={(value: any) => onSortChange(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">
                  <span className="flex items-center gap-2">
                    Total Score (Highest)
                  </span>
                </SelectItem>
                <SelectItem value="accuracy">
                  <span className="flex items-center gap-2">
                    Accuracy % (Highest)
                  </span>
                </SelectItem>
                <SelectItem value="consistency">
                  <span className="flex items-center gap-2">
                    Consistency (Most Stable)
                  </span>
                </SelectItem>
                <SelectItem value="improvement">
                  <span className="flex items-center gap-2">
                    Improvement (Most Growth)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info Badges */}
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-gray-600 font-medium">Metrics Explained:</p>
            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">
                  Score
                </Badge>
                <span className="text-xs text-gray-600">
                  Overall weighted performance (40% marks, 20% accuracy, 15% speed, 15% consistency, 10% improvement)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">
                  Accuracy
                </Badge>
                <span className="text-xs text-gray-600">
                  Percentage of questions answered correctly
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">
                  Consistency
                </Badge>
                <span className="text-xs text-gray-600">
                  Stability of performance across multiple tests
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">
                  Improvement
                </Badge>
                <span className="text-xs text-gray-600">
                  Trend of score change over the period
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
