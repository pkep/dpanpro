import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { User, Mail, Phone } from 'lucide-react';

interface StepContactInfoProps {
  email: string;
  onEmailChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
}

export function StepContactInfo({
  email,
  onEmailChange,
  phone,
  onPhoneChange,
}: StepContactInfoProps) {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.email && !email) {
        onEmailChange(user.email);
      }
      if (user.phone && !phone) {
        onPhoneChange(user.phone);
      }
    }
  }, [isAuthenticated, user, email, phone, onEmailChange, onPhoneChange]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Vos coordonnées</h2>
        <p className="text-muted-foreground mt-2">
          Pour vous contacter et vous tenir informé de l'intervention
        </p>
      </div>

      {isAuthenticated && user && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
          <User className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-muted-foreground">Connecté</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Adresse email *
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="votre@email.com"
            className="mt-2"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Nous vous enverrons les mises à jour de votre intervention par email
          </p>
        </div>

        <div>
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Numéro de téléphone *
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="06 12 34 56 78"
            className="mt-2"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Le technicien vous contactera à ce numéro
          </p>
        </div>
      </div>
    </div>
  );
}
