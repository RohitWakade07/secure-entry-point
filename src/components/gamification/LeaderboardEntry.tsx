import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Crown,
  Medal,
  Trophy,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardEntryProps {
  rank: number;
  userName: string;
  score: number;
  accuracy: number;
  testsCompleted: number;
  consistency: number;
  improvement: number;
  percentile: number;
  isCurrentUser?: boolean;
  animationDelay?: number;
}

export const LeaderboardEntry = ({
  rank,
  userName,
  score,
  accuracy,
  testsCompleted,
  consistency,
  improvement,
  percentile,
  isCurrentUser = false,
  animationDelay = 0,
}: LeaderboardEntryProps) => {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Trophy className="w-4 h-4 text-orange-600" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank <= 10) return "bg-yellow-50 border-yellow-200";
    if (rank <= 100) return "bg-blue-50 border-blue-200";
    if (rank <= 500) return "bg-purple-50 border-purple-200";
    return "";
  };

  const getScoreColor = (score: number) => {
    if (score >= 8000) return "text-green-700";
    if (score >= 6000) return "text-blue-700";
    if (score >= 4000) return "text-purple-700";
    return "text-gray-700";
  };

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay * 0.05 }}
      className={cn(
        "border-b border-gray-200 hover:bg-gray-50 transition-colors",
        getRankColor(rank),
        isCurrentUser && "bg-blue-100 border-blue-400 font-semibold"
      )}
    >
      {/* Rank */}
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          {getRankIcon(rank)}
          <span className={cn("text-lg font-bold", getScoreColor(score))}>
            #{rank}
          </span>
        </div>
      </TableCell>

      {/* User Name */}
      <TableCell className="font-medium">{userName}</TableCell>

      {/* Score */}
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-1">
          <span className={cn("font-bold text-lg", getScoreColor(score))}>
            {score.toFixed(0)}
          </span>
          <Badge variant="outline" className="text-xs">
            {accuracy.toFixed(1)}% acc
          </Badge>
        </div>
      </TableCell>

      {/* Tests Completed */}
      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="font-semibold">{testsCompleted}</span>
          <span className="text-xs text-gray-500">tests</span>
        </div>
      </TableCell>

      {/* Consistency */}
      <TableCell className="text-center">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: animationDelay * 0.05 + 0.3 }}
          className="inline-block origin-left"
        >
          <Badge
            variant={consistency >= 80 ? "default" : "secondary"}
            className="text-xs"
          >
            {consistency.toFixed(0)}
          </Badge>
        </motion.div>
      </TableCell>

      {/* Improvement */}
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          {improvement > 0 && (
            <TrendingUp className="w-4 h-4 text-green-600" />
          )}
          {improvement < 0 && <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />}
          <span className={cn(
            "font-semibold",
            improvement > 0 ? "text-green-700" : improvement < 0 ? "text-red-700" : "text-gray-700"
          )}>
            {improvement > 0 ? "+" : ""}{improvement.toFixed(0)}%
          </span>
        </div>
      </TableCell>

      {/* Percentile */}
      <TableCell className="text-right">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: animationDelay * 0.05 + 0.2 }}
          className="origin-right"
        >
          <div className="flex items-center justify-end gap-1">
            <Zap className="w-3 h-3 text-blue-600" />
            <span className="font-semibold text-blue-700">
              {percentile.toFixed(1)}%
            </span>
          </div>
        </motion.div>
      </TableCell>

      {/* Current User Badge */}
      {isCurrentUser && (
        <TableCell className="text-center">
          <Badge className="bg-blue-600">You</Badge>
        </TableCell>
      )}
    </motion.tr>
  );
};
