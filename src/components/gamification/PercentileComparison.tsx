import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PercentileComparisonProps {
  userPercentile: number;
  userRank: number;
  totalUsers: number;
  className?: string;
}

export const PercentileComparison = ({
  userPercentile,
  userRank,
  totalUsers,
  className,
}: PercentileComparisonProps) => {
  // Calculate percentile bucket
  const percentileBucket = Math.ceil(userPercentile / 10) * 10;
  const usersAboveYou = Math.max(0, userRank - 1);
  const usersBelowYou = Math.max(0, totalUsers - userRank);

  const getPercentileColor = (percentile: number) => {
    if (percentile <= 10) return "text-green-600";
    if (percentile <= 25) return "text-blue-600";
    if (percentile <= 50) return "text-purple-600";
    if (percentile <= 75) return "text-orange-600";
    return "text-red-600";
  };

  const getPercentileLabel = (percentile: number) => {
    if (percentile <= 10) return "Top 10% 🏆";
    if (percentile <= 25) return "Top 25% ⭐";
    if (percentile <= 50) return "Top 50% 📈";
    if (percentile <= 75) return "Above Average 💪";
    return "Keep Improving 🚀";
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Percentile Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">
                  Your Percentile
                </span>
              </div>
              <div
                className={cn(
                  "text-2xl font-bold",
                  getPercentileColor(userPercentile)
                )}
              >
                {userPercentile.toFixed(1)}%
              </div>
            </div>
            <div className="flex h-8 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full overflow-hidden">
              <div
                className="bg-white transition-all"
                style={{ width: `${100 - userPercentile}%` }}
              />
            </div>
            <p className="text-xs text-gray-600">
              You are better than {(100 - userPercentile).toFixed(1)}% of users
            </p>
          </div>

          {/* Percentile Badge */}
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className={cn(
                "text-base font-semibold",
                getPercentileColor(userPercentile)
              )}
            >
              {getPercentileLabel(userPercentile)}
            </Badge>
          </div>

          {/* Comparison Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <ArrowUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-600">Users Above</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {usersAboveYou}
              </div>
              <p className="text-xs text-gray-500">
                {((usersAboveYou / totalUsers) * 100).toFixed(1)}% of all users
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <ArrowDown className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-600">Users Below</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {usersBelowYou}
              </div>
              <p className="text-xs text-gray-500">
                {((usersBelowYou / totalUsers) * 100).toFixed(1)}% of all users
              </p>
            </div>
          </div>

          {/* Motivation Message */}
          <div className="pt-2 border-t bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg">
            {userPercentile <= 10 && (
              <p className="text-xs font-medium text-blue-700">
                🎯 You are in the elite group! Maintain this position and inspire others.
              </p>
            )}
            {userPercentile > 10 && userPercentile <= 25 && (
              <p className="text-xs font-medium text-blue-700">
                💫 You're doing great! A few more improvements can get you to the top tier.
              </p>
            )}
            {userPercentile > 25 && userPercentile <= 50 && (
              <p className="text-xs font-medium text-purple-700">
                📈 Good progress! Focus on consistency and you'll reach the top ranks.
              </p>
            )}
            {userPercentile > 50 && userPercentile <= 75 && (
              <p className="text-xs font-medium text-orange-700">
                🚀 You're on the journey! Dedicate more time and watch yourself climb.
              </p>
            )}
            {userPercentile > 75 && (
              <p className="text-xs font-medium text-red-700">
                💪 Every expert started here. Keep practicing and you'll reach great heights!
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
