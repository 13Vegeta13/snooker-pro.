import React from 'react';
import { Ball } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award, Target, Clock } from 'lucide-react';

interface BreakPanelProps {
  currentBreak: number;
  highestBreakThisFrame: number;
  highestBreakPlayer1: number;
  highestBreakPlayer2: number;
  player1Name: string;
  player2Name: string;
  lastBallPottedInBreak?: Ball;
}

const BreakPanel: React.FC<BreakPanelProps> = ({
  currentBreak,
  highestBreakThisFrame,
  highestBreakPlayer1,
  highestBreakPlayer2,
  player1Name,
  player2Name
}) => {
  const getBreakBadgeVariant = (breakValue: number) => {
    if (breakValue >= 100) return 'default'; // Century
    if (breakValue >= 50) return 'secondary'; // Half-century
    return 'outline';
  };

  const getBreakLabel = (breakValue: number) => {
    if (breakValue >= 147) return 'MAXIMUM!';
    if (breakValue >= 100) return 'CENTURY!';
    if (breakValue >= 50) return 'HALF-CENTURY!';
    return '';
  };

  return (
    <div className="h-full flex flex-col space-y-1">
      {/* Break actuel */}
      <Card className="bg-gradient-to-r from-green-50 to-red-50 flex-shrink-0">
        <CardHeader className="pb-0 py-1">
          <CardTitle className="flex items-center text-xs">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Break en cours
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 p-2">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-green-600">
              {currentBreak}
            </div>
            {currentBreak >= 50 && (
              <Badge variant={getBreakBadgeVariant(currentBreak)} className="animate-pulse text-xs">
                {getBreakLabel(currentBreak)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Meilleur break de la frame */}
      <Card className="flex-shrink-0">
        <CardHeader className="pb-0 py-1">
          <CardTitle className="flex items-center text-xs">
            <Award className="w-4 h-4 mr-2 text-yellow-600" />
            Meilleur (frame)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 p-2">
          <div className="text-base font-bold text-yellow-600">
            {highestBreakThisFrame}
          </div>
          {highestBreakThisFrame >= 50 && (
            <Badge variant={getBreakBadgeVariant(highestBreakThisFrame)} className="mt-1">
              {getBreakLabel(highestBreakThisFrame)}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Meilleurs breaks des joueurs */}
      <Card className="flex-1 min-h-0">
        <CardHeader className="pb-0 py-1">
          <CardTitle className="flex items-center text-xs">
            <Target className="w-4 h-4 mr-2 text-blue-600" />
            Meilleurs (match)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-1 p-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-xs font-medium">{player1Name}</span>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm">{highestBreakPlayer1}</span>
              {highestBreakPlayer1 >= 50 && (
                <Badge variant={getBreakBadgeVariant(highestBreakPlayer1)} className="text-xs">
                  {highestBreakPlayer1 >= 100 ? 'C' : '50+'}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-xs font-medium">{player2Name}</span>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm">{highestBreakPlayer2}</span>
              {highestBreakPlayer2 >= 50 && (
                <Badge variant={getBreakBadgeVariant(highestBreakPlayer2)} className="text-xs">
                  {highestBreakPlayer2 >= 100 ? 'C' : '50+'}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques rapides - compact */}
      <Card className="bg-gray-50 flex-shrink-0">
        <CardContent className="pt-0 pb-1 p-1">
          <div className="grid grid-cols-2 gap-1 text-center">
            <div>
              <div className="text-xs text-gray-500">Centuries</div>
              <div className="text-xs font-bold">
                {[highestBreakPlayer1, highestBreakPlayer2].filter(b => b >= 100).length}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">50+ breaks</div>
              <div className="text-xs font-bold">
                {[highestBreakPlayer1, highestBreakPlayer2].filter(b => b >= 50).length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BreakPanel;