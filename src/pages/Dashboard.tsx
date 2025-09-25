import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLiveMatches, useRecentMatches } from '@/hooks/useMatch';
import { useTopPlayers } from '@/hooks/usePlayers';
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Users, 
  Play, 
  Plus, 
  TrendingUp, 
  Award,
  Calendar,
  BarChart3,
  User as UserIcon,
  Clock,
  Target,
  Zap,
  Activity,
  Star,
  Timer,
  RefreshCw,
  Eye,
  ArrowUp,
  ArrowDown,
  Flame
} from 'lucide-react';
import { formatDate, toJsDate } from '@/lib/utils';

const Dashboard: React.FC = () => {
  const { hasRole, user } = useAuth();
  const { data: liveMatches, isLoading: liveLoading, refetch: refetchLive } = useLiveMatches();
  const { data: recentMatches, isLoading: recentLoading, refetch: refetchRecent } = useRecentMatches(8);
  const { topByElo, topByBreak } = useTopPlayers();
  const { player, loading: playerLoading, refetch: refetchPlayer } = useCurrentPlayer();

  // États pour l'interactivité
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'recent' | 'completed' | 'scheduled'>('recent');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      setRefreshing(true);
      await Promise.all([
        refetchLive(),
        refetchRecent(),
        refetchPlayer()
      ]);
      setLastUpdate(new Date());
      setRefreshing(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetchLive, refetchRecent, refetchPlayer]);

  // Refresh manuel
  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchLive(),
      refetchRecent(),
      refetchPlayer()
    ]);
    setLastUpdate(new Date());
    setRefreshing(false);
  };

  // Statistiques globales
  const globalStats = {
    totalMatches: recentMatches?.length || 0,
    liveMatches: liveMatches?.length || 0,
    completedToday: recentMatches?.filter(m => 
      m.status === 'completed' && 
      toJsDate(m.updatedAt)?.toDateString() === new Date().toDateString()
    ).length || 0,
    averageFrameTime: '18 min' // Mock data
  };

  // Filtrer les matchs selon l'onglet sélectionné
  const filteredMatches = recentMatches?.filter(match => {
    switch (selectedTab) {
      case 'completed':
        return match.status === 'completed';
      case 'scheduled':
        return match.status === 'scheduled';
      default:
        return true;
    }
  }) || [];

  const StatsOverview = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Matchs totaux</p>
              <p className="text-2xl font-bold">{globalStats.totalMatches}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">En direct</p>
              <p className="text-2xl font-bold flex items-center">
                {globalStats.liveMatches}
                {globalStats.liveMatches > 0 && <Flame className="w-4 h-4 ml-1 animate-pulse" />}
              </p>
            </div>
            <Play className="w-8 h-8 text-red-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Terminés aujourd'hui</p>
              <p className="text-2xl font-bold">{globalStats.completedToday}</p>
            </div>
            <Trophy className="w-8 h-8 text-green-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Temps moy/frame</p>
              <p className="text-2xl font-bold">{globalStats.averageFrameTime}</p>
            </div>
            <Timer className="w-8 h-8 text-purple-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const QuickActions = () => (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Actions rapides
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasRole('scorer') && (
          <Button asChild className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all">
            <Link to="/new-match">
              <Trophy className="w-4 h-4 mr-2" />
              Nouveau Match
            </Link>
          </Button>
        )}
        
        <Button asChild variant="outline" className="w-full hover:bg-blue-50 border-blue-200 hover:border-blue-300 transition-all">
          <Link to="/players">
            <Users className="w-4 h-4 mr-2" />
            Gérer les Joueurs
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="w-full hover:bg-purple-50 border-purple-200 hover:border-purple-300 transition-all">
          <Link to="/leaderboards">
            <BarChart3 className="w-4 h-4 mr-2" />
            Classements
          </Link>
        </Button>

        {/* Contrôles de refresh */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Auto-refresh</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-10 h-6 rounded-full transition-colors ${
                autoRefresh ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                autoRefresh ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <Button
            onClick={handleManualRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Dernière MAJ: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const MyPlayerCard = () => (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserIcon className="w-5 h-5 mr-2 text-blue-500" />
          Mon Profil
        </CardTitle>
      </CardHeader>
      <CardContent>
        {playerLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : !player ? (
          <div className="text-center py-4 text-gray-500">
            <UserIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Aucun joueur lié</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">
                {player.name.charAt(0)}
              </div>
              <h3 className="font-bold text-lg">{player.name}</h3>
              {player.club && (
                <p className="text-sm text-gray-600">{player.club}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{Math.round(player.stats.elo)}</div>
                <div className="text-xs text-blue-500">ELO</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{player.stats.highestBreak}</div>
                <div className="text-xs text-green-500">Meilleur Break</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="font-bold text-green-600">{player.stats.wins}</div>
                <div className="text-gray-500">Victoires</div>
              </div>
              <div>
                <div className="font-bold text-red-600">{player.stats.losses}</div>
                <div className="text-gray-500">Défaites</div>
              </div>
              <div>
                <div className="font-bold text-blue-600">{player.stats.matchesPlayed}</div>
                <div className="text-gray-500">Matchs</div>
              </div>
            </div>

            <Button asChild size="sm" className="w-full">
              <Link to={`/players?id=${player.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                Voir ma fiche
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const LiveMatches = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Play className="w-5 h-5 mr-2 text-red-600" />
            Matchs en cours
            {liveMatches && liveMatches.length > 0 && (
              <Badge className="ml-2 bg-red-600 animate-pulse">
                {liveMatches.length}
              </Badge>
            )}
          </div>
          <Activity className="w-5 h-5 text-red-500 animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {liveLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des matchs en cours...</p>
          </div>
        ) : !liveMatches || liveMatches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Play className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Aucun match en cours</p>
            <p className="text-sm">Les matchs en direct apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-4">
            {liveMatches.map(match => {
              const currentFrame = match.score.frames.find(
                f => f.setNo === match.current.setNumber && f.frameNo === match.current.frameNumber
              );
              
              return (
                <div key={match.id} className="border-2 border-red-200 rounded-lg p-4 bg-gradient-to-r from-red-50 to-pink-50 hover:shadow-lg transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-bold text-lg">
                      {match.players[0].name} vs {match.players[1].name}
                    </div>
                    <Badge className="bg-red-600 animate-pulse">
                      <Flame className="w-3 h-3 mr-1" />
                      EN DIRECT
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-2xl font-bold text-blue-600">{currentFrame?.p1Points || 0}</div>
                      <div className="text-sm text-gray-600">{match.players[0].name}</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-2xl font-bold text-red-600">{currentFrame?.p2Points || 0}</div>
                      <div className="text-sm text-gray-600">{match.players[1].name}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                    <span className="flex items-center">
                      <Target className="w-4 h-4 mr-1" />
                      {match.format.setsEnabled 
                        ? `Set ${match.current.setNumber}, Frame ${match.current.frameNumber}`
                        : `Frame ${match.current.frameNumber}`}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Break: {match.current.breakPoints}
                    </span>
                  </div>
                  
                  {hasRole('scorer') && (
                    <Button asChild size="sm" className="w-full bg-red-600 hover:bg-red-700">
                      <Link to={`/scoring/${match.id}`}>
                        <Play className="w-4 h-4 mr-2" />
                        Scorer ce match
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const RecentMatches = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Historique des matchs
          </div>
          <div className="flex space-x-1">
            {(['recent', 'completed', 'scheduled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-3 py-1 text-xs rounded-full transition-all ${
                  selectedTab === tab
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab === 'recent' ? 'Récents' : 
                 tab === 'completed' ? 'Terminés' : 'Programmés'}
              </button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de l'historique...</p>
          </div>
        ) : !filteredMatches || filteredMatches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Aucun match trouvé</p>
            <p className="text-sm">Les matchs {selectedTab === 'completed' ? 'terminés' : selectedTab === 'scheduled' ? 'programmés' : 'récents'} apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredMatches.map(match => (
              <div key={match.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-all">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium text-sm">
                    {match.players[0].name} vs {match.players[1].name}
                  </div>
                  <Badge variant={
                    match.status === 'completed' ? 'default' : 
                    match.status === 'live' ? 'destructive' : 'outline'
                  }>
                    {match.status === 'completed' ? 'Terminé' : 
                     match.status === 'live' ? 'En cours' : 'Programmé'}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDate(toJsDate(match.updatedAt))}
                  </span>
                  {match.venue && (
                    <span className="flex items-center">
                      <Trophy className="w-3 h-3 mr-1" />
                      {match.venue}
                    </span>
                  )}
                </div>
                
                {match.status === 'completed' && match.score.match.winnerPlayerId && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-green-600 flex items-center">
                      <Trophy className="w-4 h-4 mr-1" />
                      {match.players.find(p => p.playerId === match.score.match.winnerPlayerId)?.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {match.format.setsEnabled 
                        ? `${match.score.match.p1Sets}-${match.score.match.p2Sets}`
                        : `${match.score.frames.filter(f => f.winnerPlayerId === match.players[0].playerId).length}-${match.score.frames.filter(f => f.winnerPlayerId === match.players[1].playerId).length}`}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const TopPlayers = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
            Top ELO
            <Star className="w-4 h-4 ml-2 text-yellow-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topByElo.isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : !topByElo.data || topByElo.data.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Aucun joueur
            </div>
          ) : (
            <div className="space-y-3">
              {topByElo.data.slice(0, 5).map((player, index) => (
                <div key={player.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-blue-50 transition-all">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{player.name}</div>
                      <div className="text-xs text-gray-500">
                        {player.stats.wins}V - {player.stats.losses}D
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="font-bold">
                      {Math.round(player.stats.elo)}
                    </Badge>
                    {index < 3 && (
                      <div className="flex items-center justify-end mt-1">
                        <ArrowUp className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-500">+{Math.floor(Math.random() * 20) + 5}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Award className="w-4 h-4 mr-2 text-yellow-500" />
            Top Breaks
            <Target className="w-4 h-4 ml-2 text-red-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topByBreak.isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
            </div>
          ) : !topByBreak.data || topByBreak.data.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Aucun joueur
            </div>
          ) : (
            <div className="space-y-3">
              {topByBreak.data.slice(0, 5).map((player, index) => (
                <div key={player.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-yellow-50 transition-all">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{player.name}</div>
                      <div className="text-xs text-gray-500">
                        {player.stats.breaks100plus} centuries
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={player.stats.highestBreak >= 100 ? 'default' : 
                             player.stats.highestBreak >= 50 ? 'secondary' : 'outline'}
                    className={player.stats.highestBreak >= 147 ? 'bg-gradient-to-r from-yellow-400 to-red-500 text-white animate-pulse' : ''}
                  >
                    {player.stats.highestBreak}
                    {player.stats.highestBreak >= 147 && <Flame className="w-3 h-3 ml-1" />}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* En-tête avec indicateur de statut */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            Tableau de bord
            {refreshing && <RefreshCw className="w-6 h-6 ml-3 animate-spin text-blue-500" />}
          </h1>
          <p className="text-gray-600 flex items-center">
            Gérez vos matchs de snooker en temps réel
            <span className="ml-2 flex items-center text-sm">
              <div className={`w-2 h-2 rounded-full mr-1 ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {autoRefresh ? 'Auto-refresh actif' : 'Auto-refresh désactivé'}
            </span>
          </p>
        </div>
        
        <div className="text-right text-sm text-gray-500">
          <p>Bonjour, {user?.displayName}</p>
          <p className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {new Date().toLocaleTimeString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Statistiques globales */}
      <StatsOverview />

      {/* Grille responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-8 space-y-6">
          <LiveMatches />
          <RecentMatches />
        </div>

        {/* Barre latérale */}
        <div className="lg:col-span-4 space-y-6">
          <MyPlayerCard />
          <QuickActions />
          <TopPlayers />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;