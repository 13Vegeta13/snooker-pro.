import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlayers } from '@/hooks/usePlayers';
import { useCreateMatch } from '@/hooks/useMatch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trophy, Users, Settings, MapPin, User } from 'lucide-react';

const matchSchema = z.object({
  player1Id: z.string().min(1, 'Sélectionnez le premier joueur'),
  player2Id: z.string().min(1, 'Sélectionnez le second joueur'),
  setsEnabled: z.boolean().default(true),
  bestOfSets: z.number().min(1).max(35),
  framesPerSet: z.number().min(1).max(25),
  venue: z.string().optional(),
  referee: z.string().optional(),
}).refine((data) => data.player1Id !== data.player2Id, {
  message: "Les deux joueurs doivent être différents",
  path: ["player2Id"],
});

type MatchFormData = z.infer<typeof matchSchema>;

const NewMatchPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { data: players, isLoading: playersLoading } = usePlayers();
  const createMatchMutation = useCreateMatch();
  const navigate = useNavigate();
  const [selectedPlayers, setSelectedPlayers] = useState<{ id: string; name: string }[]>([]);
  const [message, setMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<MatchFormData>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      setsEnabled: true,
      bestOfSets: 5,
      framesPerSet: 7,
    }
  });

  const setsEnabled = watch('setsEnabled');
  const bestOfSets = watch('bestOfSets');
  const framesPerSet = watch('framesPerSet');

  const onSubmit = async (data: MatchFormData) => {
    if (!user) return;

    const player1 = players?.find(p => p.id === data.player1Id);
    const player2 = players?.find(p => p.id === data.player2Id);

    if (!player1 || !player2) {
      setMessage('Erreur: joueurs non trouvés');
      return;
    }

    try {
      const opts = {
        p1: { id: player1.id, name: player1.name },
        p2: { id: player2.id, name: player2.name },
        format: {
          setsEnabled: data.setsEnabled,
          bestOfSets: data.bestOfSets,
          framesPerSet: data.framesPerSet,
        },
        venue: data.venue || null,
        referee: data.referee || null,
        createdBy: user.uid,
      };

      const matchId = await createMatchMutation.mutateAsync(opts);
      
      setMessage('Match créé avec succès !');

      // Rediriger vers la page de scoring si l'utilisateur peut scorer
      if (hasRole('scorer')) {
        navigate(`/scoring/${matchId}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      setMessage(`Erreur lors de la création du match: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const selectPlayer = (playerId: string, slot: 1 | 2) => {
    const player = players?.find(p => p.id === playerId);
    if (!player) return;

    setValue(`player${slot}Id`, playerId);
    
    // Mettre à jour la liste des joueurs sélectionnés pour l'affichage
    const newSelected = [...selectedPlayers];
    const slotIndex = slot - 1;
    newSelected[slotIndex] = { id: player.id, name: player.name };
    setSelectedPlayers(newSelected);
    setMessage(''); // Effacer les messages d'erreur
  };

  const getMatchDescription = () => {
    if (setsEnabled) {
      return `Best of ${bestOfSets} sets (${framesPerSet} frames par set)`;
    } else {
      return `Best of ${bestOfSets} frames`;
    }
  };

  const getEstimatedDuration = () => {
    const avgFrameTime = 20; // minutes par frame
    let totalFrames;
    
    if (setsEnabled) {
      // Estimation basée sur des sets complets
      const framesPerSetToWin = Math.ceil(framesPerSet / 2);
      const setsToWin = Math.ceil(bestOfSets / 2);
      totalFrames = setsToWin * framesPerSetToWin;
    } else {
      totalFrames = Math.ceil(bestOfSets / 2);
    }
    
    const totalMinutes = totalFrames * avgFrameTime;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return hours > 0 ? `~${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `~${minutes}min`;
  };

  if (!hasRole('scorer')) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Accès restreint
        </h2>
        <p className="text-gray-600">
          Vous devez avoir les droits de scorer pour créer un match.
        </p>
      </div>
    );
  }

  if (playersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des joueurs...</p>
        </div>
      </div>
    );
  }

  if (!players || players.length < 2) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Pas assez de joueurs
        </h2>
        <p className="text-gray-600 mb-4">
          Il faut au moins 2 joueurs pour créer un match.
        </p>
        <Button onClick={() => navigate('/players')}>
          Gérer les joueurs
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center">
          <Trophy className="w-8 h-8 mr-3" />
          Nouveau Match
        </h1>
        <p className="text-gray-600">
          Configurez un nouveau match de snooker
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Debug info */}
        
        {/* Sélection des joueurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Joueurs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Joueur 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Joueur 1 *
                </label>
                <select
                  {...register('player1Id')}
                 id="player1Id"
                 name="player1Id"
                 data-testid="player1-select"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  onChange={(e) => selectPlayer(e.target.value, 1)}
                >
                  <option value="">Sélectionnez le joueur 1</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.club && `(${player.club})`}
                    </option>
                  ))}
                </select>
                {errors.player1Id && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.player1Id.message}
                  </p>
                )}
              </div>

              {/* Joueur 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Joueur 2 *
                </label>
                <select
                  {...register('player2Id')}
                 id="player2Id"
                 name="player2Id"
                 data-testid="player2-select"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  onChange={(e) => selectPlayer(e.target.value, 2)}
                >
                  <option value="">Sélectionnez le joueur 2</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.club && `(${player.club})`}
                    </option>
                  ))}
                </select>
                {errors.player2Id && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.player2Id.message}
                  </p>
                )}
              </div>
            </div>

            {/* Aperçu des joueurs sélectionnés */}
            {selectedPlayers.length === 2 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mb-2">
                      1
                    </div>
                    <div className="font-medium">{selectedPlayers[0]?.name}</div>
                  </div>
                  <div className="text-2xl font-bold text-green-600">VS</div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold mb-2">
                      2
                    </div>
                    <div className="font-medium">{selectedPlayers[1]?.name}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message d'erreur ou de succès */}
        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.includes('succès') || message.includes('créé')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Format du match */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Format du match
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type de format */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  {...register('setsEnabled', { valueAsBoolean: true })}
                  value="true"
                  className="mr-2"
                />
                Format par sets (recommandé)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  {...register('setsEnabled', { valueAsBoolean: true })}
                  value="false"
                  className="mr-2"
                />
                Format frames uniquement
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {setsEnabled ? 'Best of (sets)' : 'Best of (frames)'} *
                </label>
                <Input
                  type="number"
                  {...register('bestOfSets', { valueAsNumber: true })}
                  id="bestOfSets"
                  name="bestOfSets"
                  data-testid="best-of-input"
                  min={1}
                  max={setsEnabled ? 35 : 147}
                  placeholder={setsEnabled ? "5" : "9"}
                />
                {errors.bestOfSets && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.bestOfSets.message}
                  </p>
                )}
              </div>

              {setsEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frames par set *
                  </label>
                  <Input
                    type="number"
                    {...register('framesPerSet', { valueAsNumber: true })}
                    id="framesPerSet"
                    name="framesPerSet"
                    min={1}
                    max={25}
                    placeholder="7"
                  />
                  {errors.framesPerSet && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.framesPerSet.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Résumé du format */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Résumé du match</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <strong>Format:</strong> {getMatchDescription()}
                </div>
                <div>
                  <strong>Durée estimée:</strong> {getEstimatedDuration()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations additionnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Informations additionnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lieu (optionnel)
                </label>
                <Input
                  {...register('venue')}
                  id="venue"
                  name="venue"
                  placeholder="Salle de snooker, club..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arbitre (optionnel)
                </label>
                <Input
                  {...register('referee')}
                  id="referee"
                  name="referee"
                  placeholder="Nom de l'arbitre"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            disabled={createMatchMutation.isPending}
          >
            Annuler
          </Button>
          
          <Button
            type="submit"
            data-testid="create-match-button"
            disabled={createMatchMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {createMatchMutation.isPending ? 'Création...' : 'Créer le match'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewMatchPage;