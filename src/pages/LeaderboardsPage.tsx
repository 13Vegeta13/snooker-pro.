import React, { useState } from 'react';
import { usePlayers } from '@/hooks/usePlayers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Trophy, 
  Target, 
  Calendar,
  Medal,
  Users,
  BarChart3,
  Filter,
  Loader2
} from 'lucide-react';
import { Player } from '@/types';
import { num } from '@/lib/utils';


type SortOption = 'elo' | 'wins' | 'highestBreak' | 'winRate' | 'avgPoints' | 'centuries';

const LeaderboardsPage: React.FC = () => {
  const { data: players, isLoading, error } = usePlayers();
  const [sortBy, setSortBy] = useState<SortOption>('elo');
  const [showFilters, setShowFilters] = useState(false);

  // Transformer les données des joueurs pour le classement
  const leaderboardData = {
    name: "Classement général",
    players: players || []
  };

  const getSortedPlayers = () => {
    if (!players || players.length === 0) return [];
    
    return [...players].sort((a, b) => {
      switch (sortBy) {
        case 'elo':
          return num(b.stats?.elo) - num(a.stats?.elo);
        case 'wins':
          return num(b.stats?.wins) - num(a.stats?.wins);
        case 'highestBreak':
          return num(b.stats?.highestBreak) - num(a.stats?.highestBreak);
        case 'winRate':
          const aWins = num(a.stats?.wins);
          const aLosses = num(a.stats?.losses);
          const bWins = num(b.stats?.wins);
          const bLosses = num(b.stats?.losses);
          const aRate = (aWins + aLosses) > 0 ? aWins / (aWins + aLosses) : 0;
          const bRate = (bWins + bLosses) > 0 ? bWins / (bWins + bLosses) : 0;
          return bRate - aRate;
        case 'avgPoints':
          return num(b.stats?.avgPointsPerFrame) - num(a.stats?.avgPointsPerFrame);
        case 'centuries':
          return num(b.stats?.breaks100plus) - num(a.stats?.breaks100plus);
        default:
          return 0;
      }
    });
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Medal className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">{position}</div>;
    }
  };

  const getEloColor = (elo: number) => {
    if (num(elo) >= 1650) return 'text-yellow-600 font-bold';
    if (num(elo) >= 1500) return 'text-green-600 font-medium';
    if (num(elo) >= 1400) return 'text-blue-600';
    return 'text-gray-600';
  };

  const getBreakBadge = (breakValue: number) => {
    const safeBreak = num(breakValue);
    if (safeBreak >= 147) return { variant: 'default' as const, label: 'MAXIMUM!', color: 'bg-gradient-to-r from-yellow-400 to-red-500' };
    if (safeBreak >= 100) return { variant: 'default' as const, label: 'Century', color: 'bg-yellow-500' };
    if (safeBreak >= 50) return { variant: 'secondary' as const, label: '50+', color: 'bg-green-500' };
    return null;
  };

  const calculateWinRate = (player: Player) => {
    const wins = num(player.stats?.wins);
    const losses = num(player.stats?.losses);
    const total = wins + losses;
    return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  };

  const sortOptions = [
    { value: 'elo', label: 'ELO', icon: TrendingUp },
    { value: 'wins', label: 'Victoires', icon: Trophy },
    { value: 'highestBreak', label: 'Meilleur break', icon: Target },
    { value: 'winRate', label: 'Taux de victoire', icon: BarChart3 },
    { value: 'avgPoints', label: 'Moy. points/frame', icon: BarChart3 },
    { value: 'centuries', label: 'Centuries', icon: Medal },
  ];

  // Gestion des états de chargement et d'erreur
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des classements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Trophy className="w-8 h-8 mr-3 text-yellow-600" />
          Classements
        </h1>
        <p className="text-gray-600">
          Suivez les performances des joueurs
        </p>
      </div>

      {/* Contrôles */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-500" />
              <Button variant="outline" size="sm" className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Mensuel
              </Button>
            </div>

            <div className="flex-1 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-700">
                {leaderboardData.name}
              </h2>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <Filter className="w-4 h-4 mr-1" />
                Filtres
              </Button>
            </div>
          </div>

          {/* Filtres */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {sortOptions.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={sortBy === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy(value as SortOption)}
                    className="flex items-center justify-center text-xs"
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message si aucun joueur */}
      {!players || players.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun joueur inscrit
            </h3>
            <p className="text-gray-600 mb-4">
              Les classements apparaîtront une fois que des joueurs seront ajoutés à l'application.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
      {/* Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {getSortedPlayers().slice(0, 3).map((player, index) => {
          const position = index + 1;
          const breakBadge = getBreakBadge(player.stats.highestBreak);
          
          return (
            <Card key={player.id} className={`relative ${
              position === 1 ? 'ring-2 ring-yellow-400 bg-gradient-to-br from-yellow-50 to-white' :
              position === 2 ? 'ring-2 ring-gray-300 bg-gradient-to-br from-gray-50 to-white' :
              'ring-2 ring-amber-300 bg-gradient-to-br from-amber-50 to-white'
            }`}>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  {getPositionIcon(position)}
                </div>
                <CardTitle className="text-lg">{player.name}</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Statistique principale selon le tri */}
                <div className="text-center">
                  {sortBy === 'elo' && (
                    <div className={`text-3xl font-bold ${getEloColor(player.stats.elo)}`}>
                      {Math.round(player.stats.elo)}
                    </div>
                  )}
                  {sortBy === 'wins' && (
                    <div className="text-3xl font-bold text-green-600">
                      {player.stats.wins}
                    </div>
                  )}
                  {sortBy === 'highestBreak' && (
                    <div className="text-3xl font-bold text-red-600">
                      {player.stats.highestBreak}
                    </div>
                  )}
                  {sortBy === 'winRate' && (
                    <div className="text-3xl font-bold text-blue-600">
                      {calculateWinRate(player)}%
                    </div>
                  )}
                  {sortBy === 'centuries' && (
                    <div className="text-3xl font-bold text-yellow-600">
                      {player.stats.breaks100plus}
                    </div>
                  )}
                </div>

                {/* Statistiques secondaires */}
                <div className="grid grid-cols-2 gap-2 text-xs text-center">
                  <div>
                    <div className="font-medium text-green-600">{player.stats.wins}</div>
                    <div className="text-gray-500">V</div>
                  </div>
                  <div>
                    <div className="font-medium text-red-600">{player.stats.losses}</div>
                    <div className="text-gray-500">D</div>
                  </div>
                </div>

                {/* Meilleur break avec badge */}
                <div className="text-center">
                  <div className="font-bold text-lg">{player.stats.highestBreak}</div>
                  {breakBadge && (
                    <Badge variant={breakBadge.variant} className="text-xs mt-1">
                      {breakBadge.label}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tableau complet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Classement complet
            <Badge variant="outline" className="ml-2">
              {leaderboardData.players.length} joueurs
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs text-gray-500 uppercase">
                  <th className="text-left p-2">Pos</th>
                  <th className="text-left p-2">Joueur</th>
                  <th className="text-center p-2">ELO</th>
                  <th className="text-center p-2">V-D</th>
                  <th className="text-center p-2">%V</th>
                  <th className="text-center p-2">Frames</th>
                  <th className="text-center p-2">HB</th>
                  <th className="text-center p-2">100+</th>
                  <th className="text-center p-2">50+</th>
                  <th className="text-center p-2">Moy/F</th>
                </tr>
              </thead>
              
              <tbody>
                {getSortedPlayers().map((player, index) => {
                  const position = index + 1;
                  const breakBadge = getBreakBadge(num(player.stats?.highestBreak));
                  
                  return (
                    <tr key={player.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="flex items-center">
                          {position <= 3 ? getPositionIcon(position) : (
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                              {position}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-2">
                        <div className="font-medium">{player.name}</div>
                      </td>
                      
                      <td className="p-2 text-center">
                        <span className={`font-bold ${getEloColor(num(player.stats?.elo))}`}>
                          {num(player.stats?.elo).toFixed(0)}
                        </span>
                      </td>
                      
                      <td className="p-2 text-center">
                        <span className="text-green-600 font-medium">{num(player.stats?.wins).toFixed(0)}</span>
                        <span className="text-gray-400">-</span>
                        <span className="text-red-600 font-medium">{num(player.stats?.losses).toFixed(0)}</span>
                      </td>
                      
                      <td className="p-2 text-center">
                        {calculateWinRate(player)}%
                      </td>
                      
                      <td className="p-2 text-center">
                        <span className="text-green-600">{num(player.stats?.framesWon).toFixed(0)}</span>
                        <span className="text-gray-400">-</span>
                        <span className="text-red-600">{num(player.stats?.framesLost).toFixed(0)}</span>
                      </td>
                      
                      <td className="p-2 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold">{num(player.stats?.highestBreak).toFixed(0)}</span>
                          {breakBadge && (
                            <Badge variant={breakBadge.variant} className="text-xs">
                              {breakBadge.label}
                            </Badge>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-2 text-center">
                        <Badge variant={num(player.stats?.breaks100plus) > 0 ? 'default' : 'outline'}>
                          {num(player.stats?.breaks100plus).toFixed(0)}
                        </Badge>
                      </td>
                      
                      <td className="p-2 text-center">
                        <Badge variant={num(player.stats?.breaks50plus) > 0 ? 'secondary' : 'outline'}>
                          {num(player.stats?.breaks50plus).toFixed(0)}
                        </Badge>
                      </td>
                      
                      <td className="p-2 text-center">
                        {num(player.stats?.avgPointsPerFrame).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default LeaderboardsPage;