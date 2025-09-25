import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlayers, useCreatePlayer, useDeletePlayer } from '@/hooks/usePlayers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Trophy,
  TrendingUp,
  Target,
  Award
} from 'lucide-react';
import { Player } from '@/types';

const playerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  club: z.string().optional(),
  hand: z.enum(['L', 'R']).optional(),
});

type PlayerFormData = z.infer<typeof playerSchema>;

const PlayersPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { data: players, isLoading } = usePlayers();
  const createPlayerMutation = useCreatePlayer();
  const deletePlayerMutation = useDeletePlayer();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'elo' | 'highestBreak' | 'wins'>('name');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
  });

  const onSubmit = async (data: PlayerFormData) => {
    if (!user) return;
    
    try {
      await createPlayerMutation.mutateAsync({
        playerData: {
          name: data.name,
          club: data.club || null,
          hand: data.hand || null,
        },
        createdBy: user.uid,
      });
      
      reset();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Erreur lors de la création du joueur:', error);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce joueur ?')) return;
    
    try {
      await deletePlayerMutation.mutateAsync(playerId);
    } catch (error) {
      console.error('Erreur lors de la suppression du joueur:', error);
    }
  };

  const filteredAndSortedPlayers = React.useMemo(() => {
    if (!players) return [];
    
    let filtered = players.filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (player.club && player.club.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'elo':
          return b.stats.elo - a.stats.elo;
        case 'highestBreak':
          return b.stats.highestBreak - a.stats.highestBreak;
        case 'wins':
          return b.stats.wins - a.stats.wins;
        default:
          return 0;
      }
    });

    return filtered;
  }, [players, searchTerm, sortBy]);

  const getEloColor = (elo: number) => {
    if (elo >= 1600) return 'bg-yellow-500';
    if (elo >= 1400) return 'bg-green-500';
    if (elo >= 1200) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const getBreakColor = (breakValue: number) => {
    if (breakValue >= 100) return 'text-yellow-600 font-bold';
    if (breakValue >= 50) return 'text-green-600 font-medium';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des joueurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="w-8 h-8 mr-3" />
            Joueurs
          </h1>
          <p className="text-gray-600">
            {players?.length || 0} joueurs enregistrés
          </p>
        </div>

        {hasRole('admin') && (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un joueur
          </Button>
        )}
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nouveau joueur</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet *
                  </label>
                  <Input
                    {...register('name')}
                    placeholder="Nom du joueur"
                    disabled={createPlayerMutation.isPending}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Club
                  </label>
                  <Input
                    {...register('club')}
                    placeholder="Nom du club"
                    disabled={createPlayerMutation.isPending}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Main dominante
                </label>
                <select
                  {...register('hand')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  disabled={createPlayerMutation.isPending}
                >
                  <option value="">Non spécifiée</option>
                  <option value="L">Gaucher</option>
                  <option value="R">Droitier</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <Button 
                  type="submit" 
                  disabled={createPlayerMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createPlayerMutation.isPending ? 'Création...' : 'Créer le joueur'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    reset();
                  }}
                  disabled={createPlayerMutation.isPending}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom ou club..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="name">Trier par nom</option>
                <option value="elo">Trier par ELO</option>
                <option value="highestBreak">Trier par meilleur break</option>
                <option value="wins">Trier par victoires</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des joueurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedPlayers.map((player) => (
          <Card key={player.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{player.name}</CardTitle>
                  {player.club && (
                    <p className="text-sm text-gray-600">{player.club}</p>
                  )}
                </div>
                
                {hasRole('admin') && (
                  <div className="flex space-x-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-gray-400 hover:text-blue-600"
                      asChild
                    >
                      <Link to={`/players/${player.id}/edit`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-gray-400 hover:text-red-600"
                      onClick={() => handleDeletePlayer(player.id)}
                      disabled={deletePlayerMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {/* Statistiques principales */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <TrendingUp className="w-4 h-4 mr-1 text-blue-600" />
                    <span className="text-xs text-gray-500">ELO</span>
                  </div>
                  <Badge className={`${getEloColor(player.stats.elo)} text-white`}>
                    {Math.round(player.stats.elo)}
                  </Badge>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Target className="w-4 h-4 mr-1 text-green-600" />
                    <span className="text-xs text-gray-500">Meilleur break</span>
                  </div>
                  <div className={`font-bold ${getBreakColor(player.stats.highestBreak)}`}>
                    {player.stats.highestBreak}
                  </div>
                </div>
              </div>

              {/* Statistiques détaillées */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="font-medium text-green-600">{player.stats.wins}</div>
                  <div className="text-gray-500">Victoires</div>
                </div>
                <div>
                  <div className="font-medium text-red-600">{player.stats.losses}</div>
                  <div className="text-gray-500">Défaites</div>
                </div>
                <div>
                  <div className="font-medium text-blue-600">{player.stats.matchesPlayed}</div>
                  <div className="text-gray-500">Matchs</div>
                </div>
              </div>

              {/* Breaks remarquables */}
              <div className="flex justify-center space-x-4 mt-3 pt-3 border-t">
                {player.stats.breaks100plus > 0 && (
                  <div className="flex items-center text-xs">
                    <Award className="w-3 h-3 mr-1 text-yellow-500" />
                    <span className="font-medium">{player.stats.breaks100plus}</span>
                    <span className="text-gray-500 ml-1">centuries</span>
                  </div>
                )}
                {player.stats.breaks50plus > 0 && (
                  <div className="flex items-center text-xs">
                    <Trophy className="w-3 h-3 mr-1 text-green-500" />
                    <span className="font-medium">{player.stats.breaks50plus}</span>
                    <span className="text-gray-500 ml-1">50+</span>
                  </div>
                )}
              </div>

              {/* Informations additionnelles */}
              <div className="flex justify-between items-center mt-3 pt-3 border-t text-xs text-gray-500">
                {player.hand && (
                  <span>Main: {player.hand === 'L' ? 'Gauche' : 'Droite'}</span>
                )}
                <span>
                  {player.stats.avgPointsPerFrame > 0 
                    ? `${player.stats.avgPointsPerFrame.toFixed(1)} pts/frame`
                    : 'Aucune statistique'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message si aucun joueur */}
      {filteredAndSortedPlayers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Aucun joueur trouvé' : 'Aucun joueur enregistré'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Essayez de modifier votre recherche'
                : 'Commencez par ajouter des joueurs à votre application'}
            </p>
            {hasRole('admin') && !searchTerm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter le premier joueur
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlayersPage;