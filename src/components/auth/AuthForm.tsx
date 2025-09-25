import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { signIn, signUp, resetPassword } from '@/services/auth';
import { Eye, EyeOff, Mail, Lock, User, Trophy } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

const registerSchema = loginSchema.extend({
  displayName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

const resetSchema = z.object({
  email: z.string().email('Email invalide'),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;
type ResetData = z.infer<typeof resetSchema>;

const AuthForm: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<RegisterData>({
    resolver: zodResolver(
      mode === 'login' ? loginSchema : 
      mode === 'register' ? registerSchema : 
      resetSchema
    ),
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setMessage('');

    try {
      switch (mode) {
        case 'login':
          await signIn(data.email, data.password);
          break;
        
        case 'register':
          await signUp(data.email, data.password, data.displayName);
          setMessage('Compte créé avec succès !');
          break;
        
        case 'reset':
          await resetPassword(data.email);
          setMessage('Email de réinitialisation envoyé !');
          break;
      }
    } catch (error: any) {
      // Gestion spécifique des erreurs Firebase
      if (error.code === 'auth/email-already-in-use') {
        setMessage('Cet email est déjà utilisé. Voulez-vous vous connecter ou réinitialiser votre mot de passe ?');
      } else if (error.code === 'auth/weak-password') {
        setMessage('Le mot de passe doit contenir au moins 6 caractères');
      } else if (error.code === 'auth/invalid-email') {
        setMessage('Adresse email invalide');
      } else if (error.code === 'auth/user-not-found') {
        setMessage('Aucun compte trouvé avec cet email');
      } else if (error.code === 'auth/wrong-password') {
        setMessage('Mot de passe incorrect');
      } else if (error.code === 'auth/network-request-failed') {
        setMessage('Erreur de connexion. Vérifiez votre connexion internet.');
      } else {
        setMessage(error.message || 'Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'register' | 'reset') => {
    setMode(newMode);
    setMessage('');
    reset();
  };

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Connexion';
      case 'register':
        return 'Créer un compte';
      case 'reset':
        return 'Réinitialiser le mot de passe';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-red-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-green-500 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Snooker Pro
          </CardTitle>
          <p className="text-gray-600">{getTitle()}</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mode === 'register' && (
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    {...register('displayName')}
                    type="text"
                    placeholder="Nom complet"
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                {errors.displayName && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.displayName.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="Email"
                  className="pl-10"
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {mode !== 'reset' && (
              <>
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mot de passe"
                      className="pl-10 pr-10"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {mode === 'register' && (
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        {...register('confirmPassword')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirmer le mot de passe"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {message && (
              <div className={`p-3 rounded-md text-sm ${
                message.includes('succès') || message.includes('envoyé')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700"
              disabled={loading}
            >
              {loading ? 'Chargement...' : getTitle()}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <>
                <Button
                  variant="link"
                  onClick={() => switchMode('register')}
                  className="text-sm"
                  disabled={loading}
                >
                  Pas de compte ? Créer un compte
                </Button>
                <br />
                <Button
                  variant="link"
                  onClick={() => switchMode('reset')}
                  className="text-sm"
                  disabled={loading}
                >
                  Mot de passe oublié ?
                </Button>
              </>
            )}

            {mode === 'register' && (
              <Button
                variant="link"
                onClick={() => switchMode('login')}
                className="text-sm"
                disabled={loading}
              >
                Déjà un compte ? Se connecter
              </Button>
            )}

            {mode === 'reset' && (
              <Button
                variant="link"
                onClick={() => switchMode('login')}
                className="text-sm"
                disabled={loading}
              >
                Retour à la connexion
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;