import React from 'react';
import { Match } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Clock } from 'lucide-react';

interface ScoreBannerProps {
  match: Match;
}

const ScoreBanner: React.FC<ScoreBannerProps> = ({ match }) => {
  const currentFrame = match.score.frames.find(
    f => f.setNo === match.current.setNumber && f.frameNo === match.current.frameNumber
  );

  const p1Sets = match.score.match.p1Sets;
  const p2Sets = match.score.match.p2Sets;
  
  const activePlayerIndex = match.players.findIndex(p => p.playerId === match.current.activePlayerId);

  return (
    <div className="bg-gradient-to-r from-green-800 to-red-800 text-white rounded-lg shadow-lg p-2 mb-1">
      {/* En-tête du match */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5" />
          <span className="text-xs font-medium">
            {match.format.setsEnabled 
              ? `Best of ${match.format.bestOfSets} sets` 
              : `Best of ${match.format.bestOfSets} frames`}
          </span>
        </div>
        
        <Badge 
          variant={match.status === 'live' ? 'default' : 'secondary'}
          className={match.status === 'live' ? 'bg-red-600 animate-pulse' : ''}
        >
          {match.status === 'live' ? 'EN DIRECT' : match.status.toUpperCase()}
        </Badge>
      </div>

      {/* Scores des joueurs */}
      <div className="grid grid-cols-2 gap-1 mb-1">
        {match.players.map((player, index) => (
          <div 
            key={player.playerId}
            className={`text-center p-2 rounded-lg transition-all ${
              activePlayerIndex === index 
                ? 'bg-white bg-opacity-20 border-2 border-white' 
                : 'bg-black bg-opacity-20'
            }`}
          >
            <div className="flex items-center justify-center mb-1">
              {activePlayerIndex === index && <Users className="w-4 h-4 mr-1" />}
              <h3 className="font-bold text-base">{player.name}</h3>
            </div>
            
            {/* Score de la frame courante */}
            <div className="text-xl font-bold mb-1">
              {index === 0 ? currentFrame?.p1Points || 0 : currentFrame?.p2Points || 0}
            </div>
            <div data-testid={`p${index + 1}-score`} className="sr-only">
              {index === 0 ? currentFrame?.p1Points || 0 : currentFrame?.p2Points || 0}
            </div>
            
            {/* Sets et frames */}
            {match.format.setsEnabled ? (
              <div className="text-sm">
                <div>Sets: {index === 0 ? p1Sets : p2Sets}</div>
                <div className="text-xs text-gray-200">
                  Frames: {match.score.sets
                    .filter(s => s.setNo === match.current.setNumber)[0]
                    ?.[index === 0 ? 'p1Frames' : 'p2Frames'] || 0}
                </div>
              </div>
            ) : (
              <div className="text-sm">
                Frames: {match.score.frames.filter(f => f.winnerPlayerId === player.playerId).length}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Informations de la frame */}
      <div className="grid grid-cols-3 gap-1 text-center text-xs">
        <div>
          <div className="text-xs text-gray-200">Set/Frame</div>
          <div className="font-medium">
            {match.format.setsEnabled 
              ? `${match.current.setNumber} / ${match.current.frameNumber}`
              : `Frame ${match.current.frameNumber}`}
          </div>
        </div>
        
        <div>
          <div className="text-xs text-gray-200">Break actuel</div>
          <div className="font-medium text-sm text-yellow-300">
            <span data-testid="current-break">
            {match.current.breakPoints}
            </span>
          </div>
        </div>
        
        <div>
          <div className="text-xs text-gray-200">Points restants</div>
          <div className="font-medium text-sm">
            <span data-testid="points-on-table">
            {match.current.pointsOnTable}
            </span>
          </div>
        </div>
      </div>

      {/* État du jeu */}
      <div className="mt-1 text-center text-xs">
        <div data-testid="active-player" className="sr-only">
          {match.players.find(p => p.playerId === match.current.activePlayerId)?.name}
        </div>
        {match.current.freeballActive && (
          <span className="inline-block bg-blue-500 px-1 py-0.5 rounded mr-1 text-xs">
            FREE BALL
          </span>
        )}
        {match.current.snookersRequired && (
          <span className="inline-block bg-orange-500 px-1 py-0.5 rounded mr-1 text-xs">
            SNOOKERS REQUIRED
          </span>
        )}
        <span className="text-gray-200">
          <span data-testid="reds-remaining" className="sr-only">{match.current.redsRemaining}</span>
          {match.current.colorsPhase ? 'Phase couleurs' : `${match.current.redsRemaining} rouges restantes`}
        </span>
      </div>
    </div>
  );
};

export default ScoreBanner;