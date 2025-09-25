import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch, useApplyMatchEvent, useUndoMatchEvent } from '@/hooks/useMatch';
import { useAuth } from '@/hooks/useAuth';
import { Ball, MatchEventData } from '@/types';
import ScoreBanner from '@/components/scoring/ScoreBanner';
import BallPad from '@/components/scoring/BallPad';
import FoulPad from '@/components/scoring/FoulPad';
import BreakPanel from '@/components/scoring/BreakPanel';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Undo, 
  Redo, 
  History, 
  Settings,
  AlertTriangle,
  CheckCircle,
  Trophy
} from 'lucide-react';

const ScoringPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  
  const { data: match, isLoading, error } = useMatch(matchId!);
  const applyEventMutation = useApplyMatchEvent();
  const undoMatchEventMutation = useUndoMatchEvent();
  
  const [showHistory, setShowHistory] = useState(false);

  const applyEvent = async (eventData: MatchEventData) => {
    if (!match || !matchId) return;
    
    try {
      const result = await applyEventMutation.mutateAsync({
        matchId,
        eventData
      });
      
      if (!result.success) {
        alert(`Erreur: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'application de l\'événement:', error);
      alert('Erreur lors de l\'application de l\'événement');
    }
  };

  const handleUndo = async () => {
    if (!match || !matchId || !user || match.history.length === 0) return;
    
    if (!confirm('Êtes-vous sûr de vouloir annuler la dernière action ?')) return;
    
    try {
      await undoMatchEventMutation.mutateAsync({
        matchId,
        userId: user.uid
      });
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      alert('Erreur lors de l\'annulation de l\'action');
    }
  };

  const handleBallPot = (ball: Ball) => {
    console.log('Potting ball:', ball);
    applyEvent({ action: 'pot', ball });
  };

  const handleFoul = (points: number, note?: string) => {
    console.log('Applying foul:', points, note);
    // Déterminer la bille impliquée basée sur les points
    let ball: Ball | undefined;
    switch (points) {
      case 4: ball = 'Br'; break; // Marron ou faute générale
      case 5: ball = 'Bl'; break; // Bleu
      case 6: ball = 'P'; break;  // Rose  
      case 7: ball = 'Bk'; break; // Noire
    }
    
    applyEvent({ action: 'foul', ball, note });
  };

  const handleFreeBall = () => {
    console.log('Activating free ball');
    applyEvent({ action: 'freeBallPot' });
  };

  const handleMiss = () => {
    console.log('Miss');
    applyEvent({ action: 'miss' });
  };

  const handleEndTurn = () => {
    console.log('End turn');
    applyEvent({ action: 'endTurn' });
  };

  const handleConcede = () => {
    if (confirm('Êtes-vous sûr de vouloir abandonner cette frame ?')) {
      applyEvent({ action: 'concede' });
    }
  };

  const handleEndFrame = () => {
    if (confirm('Êtes-vous sûr de vouloir terminer cette frame ?')) {
      applyEvent({ action: 'endFrame' });
    }
  };

  const handleReRack = () => {
    if (confirm('Êtes-vous sûr de vouloir recommencer cette frame ?')) {
      applyEvent({ action: 'reRack' });
    }
  };

  const handleEndMatch = () => {
    if (confirm('Êtes-vous sûr de vouloir terminer ce match ?')) {
      // D'abord s'assurer que le vainqueur est défini
      if (match && !match.score.match.winnerPlayerId) {
        // Calculer le vainqueur avant de terminer le match
        const updatedMatch = { ...match };
        
        if (updatedMatch.format.setsEnabled) {
          // Format par sets
          const p1Sets = updatedMatch.score.sets.filter(s => s.winnerPlayerId === updatedMatch.players[0].playerId).length;
          const p2Sets = updatedMatch.score.sets.filter(s => s.winnerPlayerId === updatedMatch.players[1].playerId).length;
          
          if (p1Sets > p2Sets) {
            updatedMatch.score.match.winnerPlayerId = updatedMatch.players[0].playerId;
            updatedMatch.score.match.p1Sets = p1Sets;
            updatedMatch.score.match.p2Sets = p2Sets;
          } else if (p2Sets > p1Sets) {
            updatedMatch.score.match.winnerPlayerId = updatedMatch.players[1].playerId;
            updatedMatch.score.match.p1Sets = p1Sets;
            updatedMatch.score.match.p2Sets = p2Sets;
          }
        } else {
          // Format frames uniquement
          const p1Frames = updatedMatch.score.frames.filter(f => f.winnerPlayerId === updatedMatch.players[0].playerId).length;
          const p2Frames = updatedMatch.score.frames.filter(f => f.winnerPlayerId === updatedMatch.players[1].playerId).length;
          
          if (p1Frames > p2Frames) {
            updatedMatch.score.match.winnerPlayerId = updatedMatch.players[0].playerId;
          } else if (p2Frames > p1Frames) {
            updatedMatch.score.match.winnerPlayerId = updatedMatch.players[1].playerId;
          }
        }
        
        // Sauvegarder d'abord le vainqueur
        if (updatedMatch.score.match.winnerPlayerId) {
          updateMatch(matchId!, {
            score: updatedMatch.score
          });
        }
      }
      
      // Ensuite appliquer l'événement de fin de match
      applyEvent({ action: 'endMatch' });
    }
  };

  // Vérifications des permissions
  if (!hasRole('scorer')) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Accès restreint
        </h2>
        <p className="text-gray-600">
          Vous devez avoir les droits de scorer pour accéder à cette page.
        </p>
        <Button onClick={() => navigate('/')} className="mt-4">
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du match...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Match introuvable
        </h2>
        <p className="text-gray-600 mb-4">
          Le match demandé n'existe pas ou n'est plus accessible.
        </p>
        <Button onClick={() => navigate('/')}>
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  if (match.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-slate-900 to-red-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-white shadow-2xl">
          <CardHeader className="text-center bg-gradient-to-r from-green-600 to-red-600 text-white rounded-t-lg">
            <div className="flex justify-center mb-4">
              <Trophy className="w-16 h-16 text-yellow-300" />
            </div>
            <CardTitle className="text-3xl font-bold mb-2">
              🏆 MATCH TERMINÉ 🏆
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-8">
            {/* Vainqueur */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-4xl font-bold text-green-600 mb-2">
                {match.players.find(p => p.playerId === match.score.match.winnerPlayerId)?.name || 'Match nul'}
              </h2>
              <p className="text-xl text-gray-600">
                {match.score.match.winnerPlayerId ? 'Remporte le match !' : 'Match terminé'}
              </p>
            </div>

            {/* Score final */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-center mb-4">Score Final</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                {match.players.map((player, index) => (
                  <div 
                    key={player.playerId}
                    className={`text-center p-4 rounded-lg ${
                      match.score.match.winnerPlayerId === player.playerId 
                        ? 'bg-green-100 border-2 border-green-500' 
                        : 'bg-gray-100'
                    }`}
                  >
                    <div className="font-bold text-lg mb-2">{player.name}</div>
                    {match.format.setsEnabled ? (
                      <>
                        <div className="text-3xl font-bold text-blue-600">
                          {index === 0 ? match.score.match.p1Sets : match.score.match.p2Sets}
                        </div>
                        <div className="text-sm text-gray-600">Sets</div>
                      </>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-blue-600">
                          {match.score.frames.filter(f => f.winnerPlayerId === player.playerId).length}
                        </div>
                        <div className="text-sm text-gray-600">Frames</div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Détails du format */}
              <div className="text-center text-sm text-gray-600">
                Format: {match.format.setsEnabled 
                  ? `Best of ${match.format.bestOfSets} sets (${match.format.framesPerSet} frames/set)`
                  : `Best of ${match.format.bestOfSets} frames`}
              </div>
            </div>

            {/* Statistiques du match */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-bold text-center mb-3">Statistiques du match</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">{match.score.frames.length}</div>
                  <div className="text-gray-600">Frames jouées</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{match.history.length}</div>
                  <div className="text-gray-600">Coups joués</div>
                </div>
              </div>
            </div>

            {/* Meilleurs breaks */}
            {(() => {
              const p1Breaks = match.history
                .filter(h => h.playerId === match.players[0].playerId && h.action === 'pot')
                .map(h => h.stateSnapshot?.breakPoints || 0);
              const p2Breaks = match.history
                .filter(h => h.playerId === match.players[1].playerId && h.action === 'pot')
                .map(h => h.stateSnapshot?.breakPoints || 0);
              
              const highestBreakPlayer1 = Math.max(...p1Breaks, 0);
              const highestBreakPlayer2 = Math.max(...p2Breaks, 0);
              
              if (highestBreakPlayer1 > 0 || highestBreakPlayer2 > 0) {
                return (
                  <div className="bg-yellow-50 rounded-lg p-4 mb-6">
                    <h4 className="font-bold text-center mb-3">Meilleurs breaks</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="font-bold text-lg">{match.players[0].name}</div>
                        <div className={`text-2xl font-bold ${
                          highestBreakPlayer1 >= 100 ? 'text-yellow-600' : 
                          highestBreakPlayer1 >= 50 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {highestBreakPlayer1}
                        </div>
                        {highestBreakPlayer1 >= 100 && (
                          <Badge className="bg-yellow-500 text-white">Century!</Badge>
                        )}
                        {highestBreakPlayer1 >= 50 && highestBreakPlayer1 < 100 && (
                          <Badge variant="secondary">50+</Badge>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg">{match.players[1].name}</div>
                        <div className={`text-2xl font-bold ${
                          highestBreakPlayer2 >= 100 ? 'text-yellow-600' : 
                          highestBreakPlayer2 >= 50 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {highestBreakPlayer2}
                        </div>
                        {highestBreakPlayer2 >= 100 && (
                          <Badge className="bg-yellow-500 text-white">Century!</Badge>
                        )}
                        {highestBreakPlayer2 >= 50 && highestBreakPlayer2 < 100 && (
                          <Badge variant="secondary">50+</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au tableau de bord
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  // Ici vous pourriez ajouter une fonction d'export PDF
                  alert('Fonctionnalité d\'export à venir !');
                }}
                className="px-8 py-3"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Exporter le résultat
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentFrame = match.score.frames.find(
    f => f.setNo === match.current.setNumber && f.frameNo === match.current.frameNumber
  );

  // Calculer les meilleurs breaks
  const highestBreakThisFrame = Math.max(
    ...(match.history
      .filter(h => h.action === 'pot' && h.stateSnapshot?.frameNumber === match.current.frameNumber)
      .map(h => h.stateSnapshot?.breakPoints || 0) || [0])
  );

  const p1Breaks = match.history
    .filter(h => h.playerId === match.players[0].playerId && h.action === 'pot')
    .map(h => h.stateSnapshot?.breakPoints || 0);
  const p2Breaks = match.history
    .filter(h => h.playerId === match.players[1].playerId && h.action === 'pot')
    .map(h => h.stateSnapshot?.breakPoints || 0);

  const highestBreakPlayer1 = Math.max(...p1Breaks, 0);
  const highestBreakPlayer2 = Math.max(...p2Breaks, 0);

  // Récupérer la dernière bille empochée
  const lastBallPottedInBreak = match.current.lastBallPottedInBreak;

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-gray-50">
      {/* En-tête avec navigation */}
      <div className="flex items-center justify-between p-2 bg-white shadow-sm border-b flex-shrink-0">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center"
          >
            <History className="w-4 h-4 mr-1" />
            Historique
          </Button>
        </div>
      </div>

      {/* Bannière de score */}
      <div className="flex-shrink-0 px-2">
        <ScoreBanner match={match} />
      </div>

      {/* Contenu principal - Layout responsive pleine hauteur */}
      <div className="flex-1 flex flex-col lg:flex-row gap-1 p-1 overflow-hidden">
        {/* Colonne principale - Pads de scoring */}
        <div className="flex-1 flex flex-col gap-1 min-h-0">
          {/* Grille des pads de scoring */}
          <div className="flex-1 grid grid-rows-2 gap-1 min-h-0">
            {/* Pad des billes */}
            <div className="min-h-0 flex flex-col">
              <BallPad
                onBallPot={handleBallPot}
                disabled={applyEventMutation.isPending}
                redsRemaining={match.current.redsRemaining}
                colorsPhase={match.current.colorsPhase}
                colorsOrderIndex={match.current.colorsOrderIndex || 0}
                freeballActive={match.current.freeballActive || false}
                lastBallPottedInBreak={lastBallPottedInBreak}
              />
            </div>

            {/* Pad des fautes et actions d'arbitrage combinés */}
            <div className="min-h-0 flex flex-col lg:flex-row gap-1">
              <div className="flex-1">
                <FoulPad
                  onFoul={handleFoul}
                  onFreeBall={handleFreeBall}
                  onMiss={handleMiss}
                  onEndTurn={handleEndTurn}
                  onConcede={handleConcede}
                  disabled={applyEventMutation.isPending}
                />
              </div>
              
              {/* Actions d'arbitrage avancées - compactes */}
              <div className="flex-1">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Arbitrage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1 p-3">
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEndFrame}
                        disabled={applyEventMutation.isPending}
                        className="text-xs"
                      >
                        Fin Frame
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReRack}
                        disabled={applyEventMutation.isPending}
                        className="text-xs"
                      >
                        Re-rack
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleEndMatch}
                        disabled={applyEventMutation.isPending}
                        className="text-xs"
                      >
                        Fin Match
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleUndo}
                        disabled={!match || match.history.length === 0 || applyEventMutation.isPending || undoMatchEventMutation.isPending}
                        className="text-xs"
                        title="Annuler la dernière action"
                      >
                        <Undo className="w-3 h-3 mr-1" />
                        {undoMatchEventMutation.isPending ? 'Annulation...' : 'Retour'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne latérale - Informations et breaks */}
        <div className="w-full lg:w-64 flex flex-col gap-1 min-h-0">
          {/* Break Panel */}
          <div className="flex-1 min-h-0">
            <BreakPanel
              currentBreak={match.current.breakPoints}
              highestBreakThisFrame={highestBreakThisFrame}
              highestBreakPlayer1={highestBreakPlayer1}
              highestBreakPlayer2={highestBreakPlayer2}
              player1Name={match.players[0].name}
              player2Name={match.players[1].name}
              lastBallPottedInBreak={lastBallPottedInBreak}
            />
          </div>

          {/* État du jeu */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">État du jeu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs p-3">
              <div className="flex justify-between">
                <span>Joueur actif:</span>
                <span className="font-medium">
                  {match.players.find(p => p.playerId === match.current.activePlayerId)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Points sur la table:</span>
                <span className="font-bold text-green-600">
                  {match.current.pointsOnTable}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rouges restantes:</span>
                <span className="font-medium">
                  {match.current.redsRemaining}
                </span>
              </div>
              {match.current.colorsPhase && (
                <div className="flex justify-between">
                  <span>Prochaine couleur:</span>
                  <span className="font-medium">
                    {['Jaune', 'Vert', 'Marron', 'Bleu', 'Rose', 'Noire'][match.current.colorsOrderIndex || 0] || 'Terminé'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historique des coups (si activé) */}
          {showHistory && (
            <Card className="flex-1 min-h-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Historique</CardTitle>
              </CardHeader>
              <CardContent className="h-full overflow-hidden p-2">
                <div className="h-full overflow-y-auto space-y-1">
                  {match.history.slice().reverse().slice(0, 15).map((event, index) => (
                    <div key={event.id} className="flex justify-between items-center text-xs py-0.5 border-b border-gray-100">
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-400 text-xs">#{match.history.length - index}</span>
                        <span className="font-medium text-xs">
                          {match.players.find(p => p.playerId === event.playerId)?.name?.substring(0, 8)}
                        </span>
                        <span className="text-xs">
                          {event.action === 'pot' && `${event.ball}`}
                          {event.action === 'foul' && `faute`}
                          {event.action === 'miss' && 'raté'}
                          {event.action === 'endTurn' && 'fin'}
                        </span>
                      </div>
                      <span className="font-mono text-green-600 text-xs">
                        +{event.pointsDelta}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Indicateur de status - position fixe */}
      {(applyEventMutation.isPending || undoMatchEventMutation.isPending) && (
        <div className="fixed bottom-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-lg shadow-lg text-xs z-50">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            <span>{undoMatchEventMutation.isPending ? 'Annulation...' : 'Traitement...'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringPage;