import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, Target, RotateCcw, Flag, X } from 'lucide-react';

interface FoulPadProps {
  onFoul: (points: number, note?: string) => void;
  onFreeBall: () => void;
  onMiss: () => void;
  onEndTurn: () => void;
  onConcede: () => void;
  disabled?: boolean;
}

const FoulPad: React.FC<FoulPadProps> = ({
  onFoul,
  onFreeBall,
  onMiss,
  onEndTurn,
  onConcede,
  disabled
}) => {
  const foulButtons = [
    { points: 4, label: 'Faute 4', icon: AlertTriangle, color: 'bg-orange-500 hover:bg-orange-600' },
    { points: 5, label: 'Faute 5', icon: AlertTriangle, color: 'bg-orange-600 hover:bg-orange-700' },
    { points: 6, label: 'Faute 6', icon: AlertTriangle, color: 'bg-red-500 hover:bg-red-600' },
    { points: 7, label: 'Faute 7', icon: AlertTriangle, color: 'bg-red-600 hover:bg-red-700' },
  ];

  const actionButtons = [
    { 
      action: onFreeBall, 
      label: 'Free Ball', 
      icon: Target, 
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Bille libre après snooker'
    },
    { 
      action: onMiss, 
      label: 'Miss', 
      icon: X, 
      color: 'bg-gray-500 hover:bg-gray-600',
      description: 'Raté sans faute'
    },
    { 
      action: onEndTurn, 
      label: 'Fin Tour', 
      icon: RotateCcw, 
      color: 'bg-slate-500 hover:bg-slate-600',
      description: 'Terminer le tour'
    },
    { 
      action: onConcede, 
      label: 'Abandon', 
      icon: Flag, 
      color: 'bg-red-700 hover:bg-red-800',
      description: 'Abandonner la frame'
    },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1 py-2 flex-shrink-0">
        <CardTitle className="text-sm text-center">Actions</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-1 p-2">
        {/* Fautes */}
        <div className="flex-1">
          <h4 className="text-xs font-medium text-gray-700 mb-1">Fautes</h4>
          <div className="grid grid-cols-2 gap-1 h-12">
            {foulButtons.map(({ points, label, icon: Icon, color }) => (
              <Button
                key={points}
                onClick={() => onFoul(points)}
                disabled={disabled}
                data-testid={`foul-${points}-button`}
                className={`${color} text-white font-medium transition-all duration-200 transform hover:scale-105 h-full text-xs`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <Icon className="w-2 h-2" />
                  <span className="text-xs">{label}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-1">
          <h4 className="text-xs font-medium text-gray-700 mb-1">Actions</h4>
          <div className="grid grid-cols-2 gap-1 h-12">
            {actionButtons.map(({ action, label, icon: Icon, color, description }) => (
              <Button
                key={label}
                onClick={action}
                disabled={disabled}
                data-testid={`${label.toLowerCase().replace(' ', '-')}-button`}
                className={`${color} text-white font-medium transition-all duration-200 transform hover:scale-105 h-full text-xs`}
                title={description}
              >
                <div className="flex flex-col items-center space-y-1">
                  <Icon className="w-2 h-2" />
                  <span className="text-xs">{label}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Note explicative - compact */}
        <div className="p-0.5 bg-gray-50 rounded-md text-xs text-gray-600 text-center flex-shrink-0">
          Fautes & actions
        </div>
      </CardContent>
    </Card>
  );
};

export default FoulPad;