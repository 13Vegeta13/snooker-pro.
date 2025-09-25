import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Ball } from '@/types';
import { getBallValue, isValidBallSequence } from '@/modules/snooker/rules';
import { cn } from '@/lib/utils';

interface BallPadProps {
  onBallPot: (ball: Ball) => void;
  disabled?: boolean;
  redsRemaining: number;
  colorsPhase: boolean;
  colorsOrderIndex: number;
  freeballActive: boolean;
  lastBallPottedInBreak?: Ball;
}

const BallPad: React.FC<BallPadProps> = ({
  onBallPot,
  disabled,
  redsRemaining,
  colorsPhase,
  colorsOrderIndex,
  freeballActive,
  lastBallPottedInBreak
}) => {
  const balls: { ball: Ball; color: string; bgColor: string; textColor: string }[] = [
    { ball: 'R', color: 'Rouge', bgColor: 'bg-red-600 hover:bg-red-700', textColor: 'text-white' },
    { ball: 'Y', color: 'Jaune', bgColor: 'bg-yellow-400 hover:bg-yellow-500', textColor: 'text-black' },
    { ball: 'G', color: 'Vert', bgColor: 'bg-green-600 hover:bg-green-700', textColor: 'text-white' },
    { ball: 'Br', color: 'Marron', bgColor: 'bg-amber-800 hover:bg-amber-900', textColor: 'text-white' },
    { ball: 'Bl', color: 'Bleu', bgColor: 'bg-blue-600 hover:bg-blue-700', textColor: 'text-white' },
    { ball: 'P', color: 'Rose', bgColor: 'bg-pink-500 hover:bg-pink-600', textColor: 'text-white' },
    { ball: 'Bk', color: 'Noire', bgColor: 'bg-gray-900 hover:bg-black', textColor: 'text-white' },
  ];

  const COLORS_ORDER: Ball[] = ['Y', 'G', 'Br', 'Bl', 'P', 'Bk'];

  const isBallEnabled = (ball: Ball): boolean => {
    if (disabled || freeballActive) return !disabled;
    
    return isValidBallSequence(
      ball,
      redsRemaining,
      colorsPhase,
      colorsOrderIndex,
      freeballActive,
      lastBallPottedInBreak
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1 py-2 flex-shrink-0">
        <CardTitle className="text-sm text-center">
        {freeballActive ? 'Free Ball' : 'Billes'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-2">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 content-center">
          {balls.map(({ ball, color, bgColor, textColor }) => (
            <Button
              key={ball}
              onClick={() => onBallPot(ball)}
              disabled={!isBallEnabled(ball)}
              data-testid={`ball-${ball}`}
              className={cn(
                'aspect-square flex flex-col items-center justify-center font-bold shadow-md transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:opacity-40',
                bgColor,
                textColor,
                !isBallEnabled(ball) && 'cursor-not-allowed'
              )}
            >
              <span className="text-xs">{ball}</span>
              <span className="text-xs">{getBallValue(ball)}</span>
            </Button>
          ))}
        </div>

        {/* Indicateur de phase - compact */}
        <div className="mt-1 p-0.5 bg-gray-50 rounded-md text-center text-xs flex-shrink-0">
          {freeballActive ? (
            <span className="text-blue-600 font-medium">
              🎯 Free Ball active
            </span>
          ) : colorsPhase ? (
            <span className="text-green-600 font-medium">
              🎯 Phase couleurs - {COLORS_ORDER[colorsOrderIndex] || 'Terminé'}
            </span>
          ) : lastBallPottedInBreak === 'R' ? (
            <span className="text-yellow-600 font-medium">
              🎯 Empoche une couleur
            </span>
          ) : lastBallPottedInBreak && ['Y', 'G', 'Br', 'Bl', 'P', 'Bk'].includes(lastBallPottedInBreak) ? (
            <span className="text-red-600 font-medium">
              🔴 Empoche une rouge
            </span>
          ) : (
            <span className="text-red-600 font-medium">
              🔴 Phase rouges - {redsRemaining} restantes
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BallPad;